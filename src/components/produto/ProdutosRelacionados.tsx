
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, getDocs, limit, Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Product, CartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

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
    <section className="mt-16 bg-primary/[0.02] border border-primary/5 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
      <div className="flex flex-col items-center text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-primary/10 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sugestões Especiais</span>
        </div>
        <h2 className="font-headline text-2xl md:text-4xl text-primary leading-tight">
          Você também pode gostar
        </h2>
        <p className="text-[10px] md:text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground opacity-70">
          Mais da categoria <span className="font-bold text-primary/60">{categoriaAtual}</span>
        </p>
      </div>

      {carregando ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="aspect-square rounded-2xl bg-white/50 border border-black/5" />
              <div className="h-2 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {produtos.map(p => (
            <Link key={p.id} href={`/produto/${p.id}`} className="group flex flex-col h-full bg-white p-2 rounded-[1.8rem] shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-square rounded-[1.4rem] overflow-hidden bg-muted mb-3 border border-black/[0.03]">
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Botão Adicionar Rápido Desktop */}
                <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-500 hidden md:block">
                  <button
                    onClick={(e) => handleAdicionar(e, p)}
                    className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all ${
                      adicionados[p.id] 
                        ? 'bg-green-500 text-white' 
                        : 'bg-primary/90 hover:bg-primary text-white backdrop-blur-sm'
                    }`}
                  >
                    {adicionados[p.id] ? '✓ No Carrinho' : '+ Adicionar'}
                  </button>
                </div>
                
                {/* Mobile: Botão + compacto */}
                <button
                  onClick={(e) => handleAdicionar(e, p)}
                  className="absolute bottom-2 right-2 md:hidden h-8 w-8 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>

              <div className="flex-1 space-y-1 px-1 pb-1">
                <p className="text-[8px] font-bold text-primary/30 uppercase tracking-[0.15em]">{p.category}</p>
                <h3 className="font-poppins font-normal text-[11px] md:text-xs text-primary leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-primary/70 transition-colors">
                  {p.name}
                </h3>
                <p className="text-sm font-bold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
