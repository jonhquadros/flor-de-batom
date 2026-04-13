export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // Mudado para string para suportar categorias dinâmicas
  imageUrl: string;
  isFeatured: boolean;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Pendente' | 'Em Separação' | 'Em Entrega' | 'Entregue' | 'Cancelado';

export interface Order {
  id: string;
  orderNumber: string; // Adicionado para numeração sequencial 00001
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Pix' | 'Dinheiro';
  change?: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export const INITIAL_CATEGORIES: string[] = [
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
