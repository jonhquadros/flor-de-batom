
import { Product } from '@/lib/types';

export interface Embalagem extends Product {
  maxItens: number;
}

export interface ItemPresente {
  produtoId: string;
  nome: string;
  preco: number;
  imagem: string;
  categoria: string;
  quantidade: number;
}

export interface Presente {
  embalagem: Embalagem;
  itens: ItemPresente[];
  totalItens: number;
  totalProdutos: number;
  totalFinal: number;
}
