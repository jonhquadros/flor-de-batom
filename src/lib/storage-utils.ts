import { Product, Order, CartItem, INITIAL_CATEGORIES, Category } from './types';

const PRODUCTS_KEY = 'flordebatom_produtos_v2';
const ORDERS_KEY = 'flordebatom_pedidos_v2';
const CART_KEY = 'flordebatom_carrinho_v2';
const CATEGORIES_KEY = 'flordebatom_categorias_v2';

export const getStoredProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (!stored) {
      seedInitialData();
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    }
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

export const saveProducts = (products: Product[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  window.dispatchEvent(new Event('storage'));
};

export const getStoredCategories = (): Category[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (!stored) {
      seedInitialData();
      return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
    }
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

export const saveCategories = (categories: Category[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  window.dispatchEvent(new Event('storage'));
};

export const getStoredOrders = (): Order[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveOrder = (order: Order) => {
  if (typeof window === 'undefined') return;
  const orders = getStoredOrders();
  const updatedOrders = [...orders, order];
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
  window.dispatchEvent(new Event('storage'));
};

export const updateOrder = (updatedOrder: Order) => {
  if (typeof window === 'undefined') return;
  const orders = getStoredOrders();
  const updated = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
};

export const updateOrderStatus = (orderId: string, status: Order['status']) => {
  if (typeof window === 'undefined') return;
  const orders = getStoredOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
};

export const getStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveCart = (cart: CartItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const seedInitialData = (force: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  const existingCategories = localStorage.getItem(CATEGORIES_KEY);
  if (!existingCategories || force) {
    const initialCats: Category[] = INITIAL_CATEGORIES.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name
    }));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initialCats));
  }

  const existingProducts = localStorage.getItem(PRODUCTS_KEY);
  if (!existingProducts || force) {
    const initialProducts: Product[] = [
      { id:"p001", name:"Batom Matte Vinho Intenso",    category:"Batom",            description:"Batom de longa duração com textura matte sedosa. Tom vinho intenso para lábios marcantes.",          price:29.90, stock:15, imageUrl:"https://picsum.photos/seed/lip1/400/400",     isFeatured:true, colors: ["Vinho", "Bordô", "Marsala"]  },
      { id:"p002", name:"Batom Nude Rosado",             category:"Batom",            description:"Tom nude cremoso. Perfeito para o dia a dia com hidratação natural e brilho discreto.",           price:26.90, stock:12, imageUrl:"https://picsum.photos/seed/lip2/400/400",      isFeatured:false, colors: ["Nude 01", "Nude 02"] },
      { id:"p003", name:"Batom Glitter Rosa Gold",       category:"Batom",            description:"Glitter dourado e tom rosa vibrante. Ideal para looks noturnos e festas sofisticadas.",               price:34.90, stock:8,  imageUrl:"https://picsum.photos/seed/lip3/400/400",   isFeatured:true  },
      { id:"p004", name:"Delineador Líquido Preto",      category:"Delineador",       description:"Ponta fina para traços precisos e gatinhos perfeitos. Fórmula à prova d'água.",                      price:24.90, stock:20, imageUrl:"https://picsum.photos/seed/eye1/400/400",       isFeatured:true  },
      { id:"p006", name:"Base Líquida Cobertura Total",  category:"Base",             description:"Alta cobertura, acabamento matte, fórmula leve que não pesa na pele.",                               price:45.90, stock:18, imageUrl:"https://picsum.photos/seed/face1/400/400",    isFeatured:true, colors: ["Bege 01", "Bege 02", "Bege 03", "Marrom 01"]  },
      { id:"p008", name:"Paleta de Sombras Rose",        category:"Sombra",           description:"12 tons de rosa e nude, alta pigmentação e cores fáceis de esfumar.",                                     price:59.90, stock:7,  imageUrl:"https://picsum.photos/seed/palette1/400/400",  isFeatured:true  },
      { id:"p010", name:"Blush Pêssego Luminoso",        category:"Blush",            description:"Shimmer suave em tom pêssego, ilumina o rosto com aspecto saudável.",                               price:32.90, stock:13, imageUrl:"https://picsum.photos/seed/blush1/400/400",   isFeatured:true  },
      { id:"p012", name:"Máscara de Cílios Volume Max",  category:"Máscara de Cílios",description:"Volumiza e alonga os cílios em uma única passada para um olhar de impacto.",                             price:35.90, stock:22, imageUrl:"https://picsum.photos/seed/mask1/400/400",  isFeatured:true  },
      { id:"p016", name:"Kit Contorno e Iluminador",     category:"Contorno",         description:"Pó de contorno + iluminador dourado em um único kit para definir o rosto.",                          price:49.90, stock:6,  imageUrl:"https://picsum.photos/seed/contour1/400/400",    isFeatured:true  },
      { id:"p018", name:"Gloss Voluminizador Rosa",      category:"Gloss",            description:"Efeito voluminizador com brilho espelhado em tom rosa suave.",                        price:23.90, stock:19, imageUrl:"https://picsum.photos/seed/gloss1/400/400",      isFeatured:true, colors: ["Rosa Claro", "Rosa Choque"]  },
      { id:"p020", name:"Corretivo Alta Cobertura",      category:"Corretivo",        description:"Cobertura total, cobre olheiras e imperfeições, acabamento matte natural.",             price:27.90, stock:21, imageUrl:"https://picsum.photos/seed/concealer1/400/400",       isFeatured:true, colors: ["Claro", "Médio", "Escuro"]  },
    ];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
  }
  window.dispatchEvent(new Event('storage'));
};
