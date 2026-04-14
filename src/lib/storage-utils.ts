import { Product, Order, CartItem, INITIAL_CATEGORIES, Category, OrderStatus } from './types';

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
    const products: Product[] = JSON.parse(stored);
    // Garantir que isActive exista
    return products.map(p => ({ ...p, isActive: p.isActive ?? true }));
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

export const updateOrderStatus = (orderId: string, status: OrderStatus) => {
  if (typeof window === 'undefined') return;
  
  const orders = getStoredOrders();
  const products = getStoredProducts();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) return;
  
  const order = orders[orderIndex];
  const oldStatus = order.status;
  const newStatus = status;

  const soldStatuses: OrderStatus[] = ['Pago', 'Enviado', 'Entregue'];
  const wasSold = soldStatuses.includes(oldStatus);
  const isSold = soldStatuses.includes(newStatus);

  if (!wasSold && isSold) {
    const updatedProducts = products.map(p => {
      const orderItemsForThisProduct = order.items.filter(item => item.id === p.id);
      if (orderItemsForThisProduct.length > 0) {
        let newVariations = p.variations ? [...p.variations] : [];
        let totalDeduction = 0;

        orderItemsForThisProduct.forEach(item => {
          totalDeduction += item.quantity;
          if (newVariations.length > 0 && item.selectedColor) {
            newVariations = newVariations.map(v => 
              v.name === item.selectedColor ? { ...v, stock: Math.max(0, v.stock - item.quantity) } : v
            );
          }
        });

        return { 
          ...p, 
          stock: Math.max(0, p.stock - totalDeduction),
          variations: newVariations 
        };
      }
      return p;
    });
    saveProducts(updatedProducts);
  } else if (wasSold && !isSold) {
    const updatedProducts = products.map(p => {
      const orderItemsForThisProduct = order.items.filter(item => item.id === p.id);
      if (orderItemsForThisProduct.length > 0) {
        let newVariations = p.variations ? [...p.variations] : [];
        let totalReturn = 0;

        orderItemsForThisProduct.forEach(item => {
          totalReturn += item.quantity;
          if (newVariations.length > 0 && item.selectedColor) {
            newVariations = newVariations.map(v => 
              v.name === item.selectedColor ? { ...v, stock: v.stock + item.quantity } : v
            );
          }
        });

        return { 
          ...p, 
          stock: p.stock + totalReturn,
          variations: newVariations 
        };
      }
      return p;
    });
    saveProducts(updatedProducts);
  }

  order.status = newStatus;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
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
      { id:"p001", name:"Batom Matte Vinho Intenso",    category:"Batom",            description:"Batom de longa duração com textura matte sedosa.", price:29.90, stock:25, imageUrl:"https://picsum.photos/seed/lip1/400/400", isFeatured:true, isActive: true, variations: [{name: "Vinho", stock: 15}, {name: "Bordô", stock: 10}] },
      { id:"p002", name:"Batom Nude Rosado",             category:"Batom",            description:"Tom nude cremoso.", price:26.90, stock:12, imageUrl:"https://picsum.photos/seed/lip2/400/400", isFeatured:false, isActive: true, variations: [{name: "Nude 01", stock: 6}, {name: "Nude 02", stock: 6}] },
      { id:"p004", name:"Delineador Líquido Preto",      category:"Delineador",       description:"Ponta fina para traços precisos.", price:24.90, stock:20, imageUrl:"https://picsum.photos/seed/eye1/400/400", isFeatured:true, isActive: true },
      { id:"p006", name:"Base Líquida Cobertura Total",  category:"Base",             description:"Alta cobertura, acabamento matte.", price:45.90, stock:20, imageUrl:"https://picsum.photos/seed/face1/400/400", isFeatured:true, isActive: true, variations: [{name: "Bege 01", stock: 10}, {name: "Bege 02", stock: 10}] },
    ];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
  }
  window.dispatchEvent(new Event('storage'));
};
