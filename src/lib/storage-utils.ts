
import { Product, Order, Category, OrderStatus, StockMovement, StockMovementType } from './types';
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
const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
    // Deep sanitize for items array if present
    if (key === 'items' && Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => sanitizeData(item));
    }
  });
  return sanitized;
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
    if (e.code === 'permission-denied' || e.message?.includes('permissions')) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: counterRef.path,
        operation: 'write',
      }));
    }
    nextNum = Math.floor(100000 + Math.random() * 899999);
  }

  return nextNum.toString().padStart(6, '0');
};

export const recordStockMovement = async (
  db: Firestore, 
  movement: Omit<StockMovement, 'id' | 'createdAt'>
) => {
  const movementsRef = collection(db, 'stockMovements');
  const movementId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  const newMovement: StockMovement = {
    ...movement,
    id: movementId,
    createdAt: new Date().toISOString()
  };

  const movementDocRef = doc(movementsRef, movementId);
  await setDoc(movementDocRef, sanitizeData(newMovement), { merge: true });
};

export const saveOrderToFirestore = async (db: Firestore, order: Order) => {
  const ordersRef = collection(db, 'orders');
  const orderDocRef = doc(ordersRef, order.id);
  
  const cleanedOrder = sanitizeData({
    ...order,
    status: order.status || 'Pendente',
    createdAt: order.createdAt || new Date().toISOString()
  });

  // Salva o pedido principal (aguarda conclusão para garantir visibilidade no admin)
  await setDoc(orderDocRef, cleanedOrder, { merge: true });

  // Salva itens em sub-coleção para redundância e relatórios complexos
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

/** 
 * Ajusta o inventário baseado nos itens de um pedido.
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

      recordStockMovement(db, {
        productId: item.id,
        productName: product.name,
        variationName: item.selectedColor,
        quantity: quantityChange,
        type: multiplier < 0 ? 'Sale' : 'Adjustment',
        reason: multiplier < 0 ? `Venda Pedido #${order.orderNumber}` : `Estorno Pedido #${order.orderNumber}`
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
  const productsCheck = await getDocs(collection(db, 'products'));
  if (productsCheck.empty) {
    const initialProducts: Product[] = [
      { id:"p001", name:"Batom Matte Vinho Intenso",    category:"Batom",            description:"Batom de longa duração com textura matte sedosa.", price:29.90, stock:25, imageUrl:"https://picsum.photos/seed/lip1/400/400", isFeatured:true, isActive: true, variations: [{name: "Vinho", stock: 15}, {name: "Bordô", stock: 10}] },
      { id:"p002", name:"Batom Nude Rosado",             category:"Batom",            description:"Tom nude cremoso.", price:26.90, stock:12, imageUrl:"https://picsum.photos/seed/lip2/400/400", isFeatured:false, isActive: true, variations: [{name: "Nude 01", stock: 6}, {name: "Nude 02", stock: 6}] },
      { id:"p004", name:"Delineador Líquido Preto",      category:"Delineador",       description:"Ponta fina para traços precisos.", price:24.90, stock:20, imageUrl:"https://picsum.photos/seed/eye1/400/400", isFeatured:true, isActive: true },
      { id:"p006", name:"Base Líquida Cobertura Total",  category:"Base",             description:"Alta cobertura, acabamento matte.", price:45.90, stock:20, imageUrl:"https://picsum.photos/seed/face1/400/400", isFeatured:true, isActive: true, variations: [{name: "Bege 01", stock: 10}, {name: "Bege 02", stock: 10}] },
    ];

    for (const p of initialProducts) {
      const pRef = doc(db, 'products', p.id);
      await setDoc(pRef, sanitizeData(p), { merge: true });
    }
  }

  const categoriesCheck = await getDocs(collection(db, 'categories'));
  if (categoriesCheck.empty) {
    const initialCats = ['Batom', 'Delineador', 'Base', 'Sombra', 'Blush'];
    for (const name of initialCats) {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'categories', id), { id, name }, { merge: true });
    }
  }
};
