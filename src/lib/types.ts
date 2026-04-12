export type ProductCategory = 'Labiais' | 'Olhos' | 'Rosto' | 'Skincare' | 'Acessórios' | 'Kits';

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
  address: string;
}

export const CATEGORIES: ProductCategory[] = ['Labiais', 'Olhos', 'Rosto', 'Skincare', 'Acessórios', 'Kits'];