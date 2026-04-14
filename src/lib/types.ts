export interface ProductVariation {
  name: string;
  stock: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isFeatured: boolean;
  stock: number; // Representa o estoque total (soma das variações)
  colors?: string[]; // Mantido para compatibilidade
  variations?: ProductVariation[]; // Estoque detalhado por cor
  isActive?: boolean;
  order?: number; // Campo para ordenação personalizada no catálogo
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string; 
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
  order?: number;
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
