export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isFeatured: boolean;
  stock: number;
  colors?: string[]; // Lista de cores disponíveis
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string; // Cor escolhida pelo cliente
}

export type OrderStatus = 'Pendente' | 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado';

export interface Order {
  id: string;
  orderNumber: string;
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
