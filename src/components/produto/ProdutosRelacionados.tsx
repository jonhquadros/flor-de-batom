
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, getDocs, limit, Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Product, CartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface Props {
  categoriaAtual: string;
  idAtual: string;
}

export function ProdutosRelacionados({ categoriaAtual, idAtual }: Props) {
  const db = useFirestore();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [adicionados, setAdicionados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!db || !categoriaAtual || !idAtual) return;

    async function buscarRelacionados() {
      setCarregando(true);
      try {
        const q = query(
          collection(db as Firestore, 'products'),
          where('category', '==', categoriaAtual),
          where('isActive', '==', true),
          limit(6)
        );
        
        const snap = await getDocs(q);
        const lista = snap.docs
          .map(doc => ({ ...doc.data(), id: doc.id } as Product))
          .filter(p => p.id !== idAtual && p.stock > 0)
          .slice(0, 4);
          
        setProdutos(lista);
      } catch (err) {
        console.error('Erro ao buscar relacionados:', err);
      } finally {
        setCarregando(false);
      }
    }

    buscarRelacionados();
  }, [db, categoriaAtual, idAtual]);

  function handleAdicionar(e: React.MouseEvent, p: Product) {
    e.preventDefault();
    e.stopPropagation();

    const savedCart = localStorage.getItem('flordebatom_carrinho_v3');
    let cart: CartItem[] = [];
    if (savedCart) {
      try { cart = JSON.parse(savedCart); } catch (e) { cart = []; }
    }

    const color = p.variations && p.variations.length > 0 ? p.variations[0].name : undefined;
    const img = p.variations && p.variations.length > 0 && p.variations[0].imageUrl ? p.variations[0].imageUrl : p.imageUrl;

    const itemExistente = cart.find(i => i.id === p.id && i.selectedColor === color);
    
    if (itemExistente) {
      cart = cart.map(i => (i.id === p.id && i.selectedColor === color) 
        ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      cart.push({ ...p, quantity: 1, selectedColor: color, imageUrl: img });
    }

    localStorage.setItem('flordebatom_carrinho_v3', JSON.stringify(cart));
    
    toast({ title: "Adicionado!", description: `${p.name} no carrinho.` });
    setAdicionados(prev => ({ ...prev, [p.id]: true }));
    setTimeout(() => setAdicionados(prev => ({ ...prev, [p.id]: false })), 2000);
  }

  if (!carregando && produtos.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-primary/5">
      <div className="text-center mb-6">
        <h2 className="font-headline text-xl md:text-2xl text-primary mb-1">
          Você também pode gostar
        </h2>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-70">
          Mais da categoria {categoriaAtual}
        </p>
      </div>

      {carregando ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="aspect-square rounded-2xl bg-muted" />
              <div className="h-2 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {produtos.map(p => (
            <Link key={p.id} href={`/produto/${p.id}`} className="group flex flex-col h-full">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-primary/5 mb-3">
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Botão Adicionar Rápido Desktop */}
                <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden md:block">
                  <button
                    onClick={(e) => handleAdicionar(e, p)}
                    className={`w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg transition-all ${
                      adicionados[p.id] 
                        ? 'bg-green-500 text-white' 
                        : 'bg-primary/90 hover:bg-primary text-white backdrop-blur-sm'
                    }`}
                  >
                    {adicionados[p.id] ? '✓ Adicionado' : '+ Carrinho'}
                  </button>
                </div>
                
                {/* Mobile: Botão + compacto */}
                <button
                  onClick={(e) => handleAdicionar(e, p)}
                  className="absolute bottom-2 right-2 md:hidden h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <span className="text-base font-bold">+</span>
                </button>
              </div>

              <div className="flex-1 space-y-0.5">
                <p className="text-[7px] font-bold text-primary/30 uppercase tracking-widest">{p.category}</p>
                <h3 className="font-poppins font-normal text-[11px] text-primary leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-primary/70 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs font-bold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
