import { Product, Order, CartItem } from './types';

const PRODUCTS_KEY = 'flordebatom_produtos';
const ORDERS_KEY = 'flordebatom_pedidos';
const CART_KEY = 'flordebatom_carrinho';

export const getStoredProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PRODUCTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const getStoredOrders = (): Order[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ORDERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveOrder = (order: Order) => {
  const orders = getStoredOrders();
  localStorage.setItem(ORDERS_KEY, JSON.stringify([...orders, order]));
};

export const updateOrderStatus = (orderId: string, status: Order['status']) => {
  const orders = getStoredOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
};

export const getStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CART_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveCart = (cart: CartItem[]) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const seedInitialData = () => {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(PRODUCTS_KEY) || JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]').length === 0) {
    const initialProducts: Product[] = [
      { id:"p001", name:"Batom Matte Vinho Intenso",    categoria:"Batom",            description:"Batom de longa duração com textura matte sedosa. Tom vinho intenso.",          price:29.90, stock:15, imageUrl:"https://picsum.photos/seed/lip1/400/400",     isFeatured:true  },
      { id:"p002", name:"Batom Nude Rosado",             categoria:"Batom",            description:"Tom nude cremoso. Perfeito para o dia a dia com hidratação natural.",           price:26.90, stock:12, imageUrl:"https://picsum.photos/seed/lip2/400/400",      isFeatured:false },
      { id:"p003", name:"Batom Glitter Rosa Gold",       categoria:"Batom",            description:"Glitter dourado e tom rosa vibrante. Ideal para looks noturnos.",               price:34.90, stock:8,  imageUrl:"https://picsum.photos/seed/lip3/400/400",   isFeatured:true  },
      { id:"p004", name:"Delineador Líquido Preto",      categoria:"Delineador",       description:"Ponta fina para traços precisos. Fórmula à prova d'água.",                      price:24.90, stock:20, imageUrl:"https://picsum.photos/seed/eye1/400/400",       isFeatured:true  },
      { id:"p005", name:"Delineador Gel Marrom",         categoria:"Delineador",       description:"Tom marrom natural para um look sofisticado.",                                   price:27.90, stock:14, imageUrl:"https://picsum.photos/seed/eye2/400/400",  isFeatured:false },
      { id:"p006", name:"Base Líquida Cobertura Total",  categoria:"Base",             description:"Alta cobertura, acabamento matte, fórmula leve.",                               price:45.90, stock:18, imageUrl:"https://picsum.photos/seed/face1/400/400",    isFeatured:true  },
      { id:"p007", name:"Base Mousse Natural",           categoria:"Base",             description:"Textura mousse super leve para peles mistas e oleosas.",                        price:39.90, stock:10, imageUrl:"https://picsum.photos/seed/face2/400/400",     isFeatured:false },
      { id:"p008", name:"Paleta de Sombras Rose",        categoria:"Sombra",           description:"12 tons de rosa e nude, alta pigmentação.",                                     price:59.90, stock:7,  imageUrl:"https://picsum.photos/seed/palette1/400/400",  isFeatured:true  },
      { id:"p009", name:"Sombra Pigmento Vinho",         categoria:"Sombra",           description:"Pigmento em pó de alta concentração, tom vinho intenso.",                       price:22.90, stock:16, imageUrl:"https://picsum.photos/seed/shadow1/400/400",        isFeatured:false },
      { id:"p010", name:"Blush Pêssego Luminoso",        categoria:"Blush",            description:"Shimmer suave em tom pêssego, ilumina o rosto.",                               price:32.90, stock:13, imageUrl:"https://picsum.photos/seed/blush1/400/400",   isFeatured:true  },
      { id:"p011", name:"Blush Rosado Matte",            categoria:"Blush",            description:"Tom rosado suave, acabamento matte para uso diário.",                           price:28.90, stock:11, imageUrl:"https://picsum.photos/seed/blush2/400/400",    isFeatured:false },
      { id:"p012", name:"Máscara de Cílios Volume Max",  categoria:"Máscara de Cílios",description:"Volumiza e alonga os cílios em uma única passada.",                             price:35.90, stock:22, imageUrl:"https://picsum.photos/seed/mask1/400/400",  isFeatured:true  },
      { id:"p013", name:"Máscara Curvex Alongadora",     categoria:"Máscara de Cílios",description:"Efeito curvex, cílios alongados e curvados o dia todo.",                        price:33.90, stock:17, imageUrl:"https://picsum.photos/seed/mask2/400/400",  isFeatured:false },
      { id:"p014", name:"Primer Facial Poros Invisíveis",categoria:"Primer",           description:"Poros invisíveis e maior fixação da maquiagem.",                               price:38.90, stock:9,  imageUrl:"https://picsum.photos/seed/primer1/400/400",   isFeatured:false },
      { id:"p015", name:"Primer Labial Aveludado",       categoria:"Primer",           description:"Prepara os lábios e aumenta a fixação do batom.",                               price:19.90, stock:25, imageUrl:"https://picsum.photos/seed/primer2/400/400",   isFeatured:false },
      { id:"p016", name:"Kit Contorno e Iluminador",     categoria:"Contorno",         description:"Pó de contorno + iluminador dourado em um único kit.",                          price:49.90, stock:6,  imageUrl:"https://picsum.photos/seed/contour1/400/400",    isFeatured:true  },
      { id:"p017", name:"Contorno Stick Cremoso",        categoria:"Contorno",         description:"Bastão cremoso de fácil aplicação, blendagem natural.",                         price:31.90, stock:14, imageUrl:"https://picsum.photos/seed/contour2/400/400",  isFeatured:false },
      { id:"p018", name:"Gloss Voluminizador Rosa",      categoria:"Gloss",            description:"Efeito voluminizador com brilho espelhado em tom rosa.",                        price:23.90, stock:19, imageUrl:"https://picsum.photos/seed/gloss1/400/400",      isFeatured:true  },
      { id:"p019", name:"Gloss Transparente Hidratante", categoria:"Gloss",            description:"Ativos hidratantes com brilho natural nos lábios.",                             price:18.90, stock:30, imageUrl:"https://picsum.photos/seed/gloss2/400/400",   isFeatured:false },
      { id:"p020", name:"Corretivo Alta Cobertura",      categoria:"Corretivo",        description:"Cobertura total, cobre olheiras e imperfeições, acabamento matte.",             price:27.90, stock:21, imageUrl:"https://picsum.photos/seed/concealer1/400/400",       isFeatured:true  },
    ].map(p => ({
      ...p,
      category: p.categoria as any // Map original PRD field to our type
    }));
    saveProducts(initialProducts);
  }
};
