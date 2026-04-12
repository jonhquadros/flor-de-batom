import { Product, Order, CartItem } from './types';

const PRODUCTS_KEY = 'flor_de_batom_products';
const ORDERS_KEY = 'flor_de_batom_orders';
const CART_KEY = 'flor_de_batom_cart';

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

// Seed initial data if empty
export const seedInitialData = () => {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    const initialProducts: Product[] = [
      {
        id: '1',
        name: 'Batom Velvet Matte Berry',
        description: 'Um batom de textura aveludada com cor intensa e duradoura.',
        price: 49.90,
        category: 'Labiais',
        imageUrl: 'https://picsum.photos/seed/lip1/400/400',
        isFeatured: true,
        stock: 50
      },
      {
        id: '2',
        name: 'Paleta de Sombras Nude Elegance',
        description: '12 cores altamente pigmentadas para looks sofisticados.',
        price: 89.90,
        category: 'Olhos',
        imageUrl: 'https://picsum.photos/seed/eyes1/400/400',
        isFeatured: true,
        stock: 30
      },
      {
        id: '3',
        name: 'Base Fluida Radiant Skin',
        description: 'Cobertura média com acabamento natural e hidratante.',
        price: 75.00,
        category: 'Rosto',
        imageUrl: 'https://picsum.photos/seed/face1/400/400',
        isFeatured: false,
        stock: 45
      }
    ];
    saveProducts(initialProducts);
  }
};