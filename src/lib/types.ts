
export interface ProductVariation {
  name: string;
  stock: number;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  order?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost?: number;
  category: string;
  imageUrl: string;
  isFeatured: boolean;
  stock: number;
  colors?: string[];
  variations?: ProductVariation[];
  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: any;
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string; 
}

export type OrderStatus = 'Pendente' | 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado' | 'Confirmado';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Pix' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito';
  change?: number;
  status: OrderStatus;
  createdAt: string;
  source?: 'manual' | 'catalog';
  discount?: number;
}

export type StockMovementType = 'Addition' | 'Sale' | 'Loss' | 'Breakage' | 'Donation' | 'Adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  variationName?: string;
  quantity: number; 
  type: StockMovementType;
  reason?: string;
  createdAt: string;
  adminId?: string;
}

export interface Media {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  productId?: string | null;
  createdAt: any;
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
