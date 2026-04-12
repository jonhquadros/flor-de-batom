export type ProductCategory = 'Batom' | 'Delineador' | 'Base' | 'Sombra' | 'Blush' | 'Máscara de Cílios' | 'Primer' | 'Contorno' | 'Gloss' | 'Corretivo';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  isFeatured: boolean;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Pendente' | 'Em Separação' | 'Em Entrega' | 'Entregue';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Pix' | 'Dinheiro';
  change?: number;
  status: OrderStatus;
  createdAt: string;
}

export const CATEGORIES: ProductCategory[] = [
  'Batom', 
  'Delineador', 
  'Base', 
  'Sombra', 
  'Blush', 
  'Máscara de Cílios', 
  'Primer', 
  'Contorno', 
  'Gloss', 
  'Corretivo'
];
