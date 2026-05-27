
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

export const saveOrderToFirestore = async (db: Firestore, order: Order) => {
  const ordersRef = collection(db, 'orders');
  const orderDocRef = doc(ordersRef, order.id);
  
  const cleanedOrder = sanitizeData({
    ...order,
    status: order.status || 'Pendente',
    createdAt: order.createdAt || new Date().toISOString()
  });

  await setDoc(orderDocRef, cleanedOrder, { merge: true });

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
};

export const updateOrder = (db: Firestore, order: Order) => {
  const orderRef = doc(db, 'orders', order.id);
  updateDocumentNonBlocking(orderRef, sanitizeData(order));
};

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
    }
  }
};

export const updateOrderStatus = async (db: Firestore, order: Order, newStatus: OrderStatus) => {
  const oldStatus = order.status;
  const isPaidState = (s: OrderStatus) => ['Pago', 'Enviado', 'Entregue'].includes(s);
  const isUnpaidState = (s: OrderStatus) => ['Pendente', 'Cancelado'].includes(s);

  if (isUnpaidState(oldStatus) && isPaidState(newStatus)) {
    await adjustInventoryForOrder(db, order, 'decrement');
  } 
  else if (isPaidState(oldStatus) && isUnpaidState(newStatus)) {
    await adjustInventoryForOrder(db, order, 'increment');
  }

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
