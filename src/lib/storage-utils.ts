
import { Product, Order, Category, OrderStatus, StockMovement } from './types';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  Firestore,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Remove undefined properties from an object for Firestore */
export const sanitizeData = (data: any): any => {
  if (data === null || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => sanitizeData(item));
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });
  return sanitized;
};

/** 
 * Registra uma movimentação de estoque no Firestore (histórico).
 */
export const recordStockMovement = (db: Firestore, movement: Partial<StockMovement>) => {
  const movementId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const movementRef = doc(db, 'stockMovements', movementId);
  
  const data = sanitizeData({
    ...movement,
    id: movementId,
    createdAt: new Date().toISOString()
  });

  setDoc(movementRef, data, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: movementRef.path,
      operation: 'create',
      requestResourceData: data
    }));
  });
};

/** 
 * Gera o próximo número de pedido sequencial (000001) 
 */
export const getNextOrderNumber = async (db: Firestore): Promise<string> => {
  const counterRef = doc(db, 'metadata', 'counters');
  let nextNum = 1;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      if (snap.exists()) {
        nextNum = (snap.data().orderCount || 0) + 1;
      }
      transaction.set(counterRef, { orderCount: nextNum }, { merge: true });
    });
  } catch (e: any) {
    console.error("Erro ao gerar número do pedido:", e);
    nextNum = Math.floor(100000 + Math.random() * 899999);
  }

  return nextNum.toString().padStart(6, '0');
};

/**
 * Ajusta o inventário baseado nos itens do pedido.
 */
export const adjustInventoryForOrder = async (db: Firestore, order: Order, type: 'decrement' | 'increment') => {
  for (const item of order.items) {
    const productRef = doc(db, 'products', item.id);
    const productSnap = await getDoc(productRef);
    
    if (productSnap.exists()) {
      const product = productSnap.data() as Product;
      const multiplier = type === 'decrement' ? -1 : 1;
      const quantityChange = item.quantity * multiplier;

      let updatedVariations = product.variations || [];
      let newTotalStock = product.stock;

      if (item.selectedColor && updatedVariations.length > 0) {
        updatedVariations = updatedVariations.map(v => 
          v.name === item.selectedColor ? { ...v, stock: Math.max(0, v.stock + quantityChange) } : v
        );
        newTotalStock = updatedVariations.reduce((sum, v) => sum + v.stock, 0);
      } else {
        newTotalStock = Math.max(0, product.stock + quantityChange);
      }

      updateDocumentNonBlocking(productRef, {
        stock: newTotalStock,
        variations: updatedVariations,
        updatedAt: serverTimestamp()
      });
      
      // Registrar movimento automático no histórico
      recordStockMovement(db, {
        productId: item.id,
        productName: product.name,
        variationName: item.selectedColor,
        quantity: quantityChange,
        type: type === 'decrement' ? 'Sale' : 'Adjustment',
        reason: `Ajuste automático via pedido #${order.orderNumber || order.id.substr(0,6)}`
      });
    }
  }
};

/**
 * Salva o pedido e JÁ REALIZA A BAIXA NO ESTOQUE automaticamente.
 */
export const saveOrderToFirestore = async (db: Firestore, order: Order) => {
  const ordersRef = collection(db, 'orders');
  const orderDocRef = doc(ordersRef, order.id);
  
  const cleanedOrder = sanitizeData({
    ...order,
    status: order.status || 'Pendente',
    createdAt: order.createdAt || new Date().toISOString()
  });

  // 1. Salva o documento principal do pedido
  await setDoc(orderDocRef, cleanedOrder, { merge: true });

  // 2. Salva os itens em subcoleção (para relatórios detalhados)
  const itemsRef = collection(orderDocRef, 'orderItems');
  for (const item of order.items) {
    const itemRef = doc(itemsRef);
    await setDoc(itemRef, sanitizeData({
      ...item,
      orderId: order.id,
      productId: item.id,
      productName: item.name,
      productPrice: item.price,
      subtotal: item.price * item.quantity
    }), { merge: true });
  }

  // 3. REALIZA A BAIXA NO ESTOQUE IMEDIATAMENTE (O estoque sai assim que o pedido é gerado)
  await adjustInventoryForOrder(db, order, 'decrement');
};

export const updateOrder = (db: Firestore, order: Order) => {
  const orderRef = doc(db, 'orders', order.id);
  updateDocumentNonBlocking(orderRef, sanitizeData(order));
};

/**
 * Atualiza o status do pedido e gerencia o estoque apenas em casos de cancelamento/reativação.
 */
export const updateOrderStatus = async (db: Firestore, order: Order, newStatus: OrderStatus) => {
  const oldStatus = order.status;
  
  // Como a baixa agora é feita no checkout (saveOrderToFirestore),
  // aqui só precisamos lidar com a DEVOLUÇÃO do estoque se for cancelado,
  // ou RETIRADA novamente se um pedido cancelado for reativado.
  
  const isStockReturned = oldStatus === 'Cancelado';
  const isStockOut = ['Pendente', 'Pago', 'Enviado', 'Entregue', 'Confirmado'].includes(oldStatus);

  const willBeStockReturned = newStatus === 'Cancelado';
  const willBeStockOut = ['Pendente', 'Pago', 'Enviado', 'Entregue', 'Confirmado'].includes(newStatus);

  // 1. Caso especial: Cancelamento (Devolve estoque)
  if (isStockOut && willBeStockReturned) {
    await adjustInventoryForOrder(db, order, 'increment');
  } 
  // 2. Caso especial: Reativar pedido cancelado (Retira estoque novamente)
  else if (isStockReturned && willBeStockOut) {
    await adjustInventoryForOrder(db, order, 'decrement');
  }

  // Atualiza o documento no Firestore
  const orderRef = doc(db, 'orders', order.id);
  updateDocumentNonBlocking(orderRef, { status: newStatus });
};

export const seedInitialDataToFirestore = async (db: Firestore) => {
  const adminCheck = await getDocs(collection(db, 'admin_users'));
  if (adminCheck.empty) {
    const adminRef = doc(db, 'admin_users', 'flordebatom');
    const supportRef = doc(db, 'admin_users', 'suportthreej');
    
    await setDoc(adminRef, { username: 'flordebatom', password: 'gestaoflor@26', role: 'admin' });
    await setDoc(supportRef, { username: 'suportthreej', password: 'ThreeJ@suport3', role: 'admin' });
  }

  const productsCheck = await getDocs(collection(db, 'products'));
  if (productsCheck.empty) {
    const initialProducts: Product[] = [
      { id:"p001", name:"Batom Matte Vinho Intenso", category:"Batom", description:"Batom de longa duração.", price:29.90, stock:25, imageUrl:"https://picsum.photos/seed/lip1/400/400", isFeatured:true, isActive: true },
      { id:"p002", name:"Delineador Líquido Preto", category:"Delineador", description:"Ponta fina precisa.", price:24.90, stock:20, imageUrl:"https://picsum.photos/seed/eye1/400/400", isFeatured:true, isActive: true }
    ];
    for (const p of initialProducts) {
      await setDoc(doc(db, 'products', p.id), sanitizeData(p), { merge: true });
    }
  }
};
