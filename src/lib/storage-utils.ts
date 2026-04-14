
import { Product, Order, Category, OrderStatus } from './types';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  increment,
  writeBatch,
  Firestore
} from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// Nota: A maioria das leituras agora é feita via hooks (useCollection) nas páginas.
// Este arquivo agora foca em utilitários de escrita e seeding.

export const saveOrderToFirestore = async (db: Firestore, order: Order) => {
  const ordersRef = collection(db, 'orders');
  const orderDocRef = doc(ordersRef, order.id);
  
  // Criar o pedido e atualizar estoque em lote seria ideal, 
  // mas usaremos a lógica simplificada de addDoc para manter compatibilidade com o fluxo atual.
  setDocumentNonBlocking(orderDocRef, {
    ...order,
    status: 'Pendente',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // Adicionar itens do pedido como subcoleção para histórico (opcional, mas boa prática)
  const itemsRef = collection(orderDocRef, 'orderItems');
  order.items.forEach(item => {
    const itemRef = doc(itemsRef);
    setDocumentNonBlocking(itemRef, {
      ...item,
      orderId: order.id,
      productId: item.id,
      productName: item.name,
      productPrice: item.price,
      subtotal: item.price * item.quantity
    }, { merge: true });
  });
};

export const updateOrderStatusInFirestore = (db: Firestore, orderId: string, status: OrderStatus, orderItems: any[]) => {
  const orderRef = doc(db, 'orders', orderId);
  updateDocumentNonBlocking(orderRef, { status });

  // Lógica de retorno de estoque se for cancelado ou dedução se for pago
  // Para MVP, estamos focando na sincronização dos dados.
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

    initialProducts.forEach(p => {
      setDocumentNonBlocking(doc(db, 'products', p.id), p, { merge: true });
    });
  }

  const categoriesCheck = await getDocs(collection(db, 'categories'));
  if (categoriesCheck.empty) {
    const initialCats = ['Batom', 'Delineador', 'Base', 'Sombra', 'Blush'];
    initialCats.forEach(name => {
      const id = Math.random().toString(36).substr(2, 9);
      setDocumentNonBlocking(doc(db, 'categories', id), { id, name }, { merge: true });
    });
  }
};
