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
      { id:"p001", name:"Batom Matte Vinho Intenso",    category:"Batom",            description:"Batom de longa duração com textura matte sedosa. Tom vinho intenso para lábios marcantes.",          price:29.90, stock:15, imageUrl:"https://picsum.photos/seed/lip1/400/400",     isFeatured:true  },
      { id:"p002", name:"Batom Nude Rosado",             category:"Batom",            description:"Tom nude cremoso. Perfeito para o dia a dia com hidratação natural e brilho discreto.",           price:26.90, stock:12, imageUrl:"https://picsum.photos/seed/lip2/400/400",      isFeatured:false },
      { id:"p003", name:"Batom Glitter Rosa Gold",       category:"Batom",            description:"Glitter dourado e tom rosa vibrante. Ideal para looks noturnos e festas sofisticadas.",               price:34.90, stock:8,  imageUrl:"https://picsum.photos/seed/lip3/400/400",   isFeatured:true  },
      { id:"p004", name:"Delineador Líquido Preto",      category:"Delineador",       description:"Ponta fina para traços precisos e gatinhos perfeitos. Fórmula à prova d'água.",                      price:24.90, stock:20, imageUrl:"https://picsum.photos/seed/eye1/400/400",       isFeatured:true  },
      { id:"p005", name:"Delineador Gel Marrom",         category:"Delineador",       description:"Tom marrom natural para um look sofisticado e olhos mais expressivos de forma suave.",                                   price:27.90, stock:14, imageUrl:"https://picsum.photos/seed/eye2/400/400",  isFeatured:false },
      { id:"p006", name:"Base Líquida Cobertura Total",  category:"Base",             description:"Alta cobertura, acabamento matte, fórmula leve que não pesa na pele.",                               price:45.90, stock:18, imageUrl:"https://picsum.photos/seed/face1/400/400",    isFeatured:true  },
      { id:"p007", name:"Base Mousse Natural",           category:"Base",             description:"Textura mousse super leve para peles mistas e oleosas, controla o brilho.",                        price:39.90, stock:10, imageUrl:"https://picsum.photos/seed/face2/400/400",     isFeatured:false },
      { id:"p008", name:"Paleta de Sombras Rose",        category:"Sombra",           description:"12 tons de rosa e nude, alta pigmentação e cores fáceis de esfumar.",                                     price:59.90, stock:7,  imageUrl:"https://picsum.photos/seed/palette1/400/400",  isFeatured:true  },
      { id:"p009", name:"Sombra Pigmento Vinho",         category:"Sombra",           description:"Pigmento em pó de alta concentração, tom vinho intenso para acabamento luxuoso.",                       price:22.90, stock:16, imageUrl:"https://picsum.photos/seed/shadow1/400/400",        isFeatured:false },
      { id:"p010", name:"Blush Pêssego Luminoso",        category:"Blush",            description:"Shimmer suave em tom pêssego, ilumina o rosto com aspecto saudável.",                               price:32.90, stock:13, imageUrl:"https://picsum.photos/seed/blush1/400/400",   isFeatured:true  },
      { id:"p011", name:"Blush Rosado Matte",            category:"Blush",            description:"Tom rosado suave, acabamento matte para uso diário em qualquer tom de pele.",                           price:28.90, stock:11, imageUrl:"https://picsum.photos/seed/blush2/400/400",    isFeatured:false },
      { id:"p012", name:"Máscara de Cílios Volume Max",  category:"Máscara de Cílios",description:"Volumiza e alonga os cílios em uma única passada para um olhar de impacto.",                             price:35.90, stock:22, imageUrl:"https://picsum.photos/seed/mask1/400/400",  isFeatured:true  },
      { id:"p013", name:"Máscara Curvex Alongadora",     category:"Máscara de Cílios",description:"Efeito curvex, cílios alongados e curvados o dia todo sem borrar.",                        price:33.90, stock:17, imageUrl:"https://picsum.photos/seed/mask2/400/400",  isFeatured:false },
      { id:"p014", name:"Primer Facial Poros Invisíveis",category:"Primer",           description:"Poros invisíveis e maior fixação da maquiagem, controla a oleosidade.",                               price:38.90, stock:9,  imageUrl:"https://picsum.photos/seed/primer1/400/400",   isFeatured:false },
      { id:"p015", name:"Primer Labial Aveludado",       category:"Primer",           description:"Prepara os lábios e aumenta a fixação do batom sem ressecar.",                               price:19.90, stock:25, imageUrl:"https://picsum.photos/seed/primer2/400/400",   isFeatured:false },
      { id:"p016", name:"Kit Contorno e Iluminador",     category:"Contorno",         description:"Pó de contorno + iluminador dourado em um único kit para definir o rosto.",                          price:49.90, stock:6,  imageUrl:"https://picsum.photos/seed/contour1/400/400",    isFeatured:true  },
      { id:"p017", name:"Contorno Stick Cremoso",        category:"Contorno",         description:"Bastão cremoso de fácil aplicação, blendagem natural e rápida.",                         price:31.90, stock:14, imageUrl:"https://picsum.photos/seed/contour2/400/400",  isFeatured:false },
      { id:"p018", name:"Gloss Voluminizador Rosa",      category:"Gloss",            description:"Efeito voluminizador com brilho espelhado em tom rosa suave.",                        price:23.90, stock:19, imageUrl:"https://picsum.photos/seed/gloss1/400/400",      isFeatured:true  },
      { id:"p019", name:"Gloss Transparente Hidratante", category:"Gloss",            description:"Ativos hidratantes com brilho natural nos lábios, sem grudar.",                             price:18.90, stock:30, imageUrl:"https://picsum.photos/seed/gloss2/400/400",   isFeatured:false },
      { id:"p020", name:"Corretivo Alta Cobertura",      category:"Corretivo",        description:"Cobertura total, cobre olheiras e imperfeições, acabamento matte natural.",             price:27.90, stock:21, imageUrl:"https://picsum.photos/seed/concealer1/400/400",       isFeatured:true  },
    ];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
  }
  window.dispatchEvent(new Event('storage'));
};
