
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
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

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
          .filter(p => p.id !== idAtual)
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

    const hasVars = p.variations && p.variations.length > 0;
    const color = selectedVariations[p.id] || (hasVars ? p.variations!.find(v => (v.stock ?? 0) > 0)?.name || p.variations![0].name : undefined);
    
    let stock = p.stock ?? 0;
    let img = p.imageUrl;
    
    if (hasVars) {
      const v = p.variations!.find(v => v.name === color);
      if (v) {
        stock = v.stock ?? 0;
        if (v.imageUrl) img = v.imageUrl;
      }
    }

    if (stock <= 0) {
      toast({ variant: "destructive", title: "Ops!", description: "Este item ou cor está esgotado." });
      return;
    }

    const savedCart = localStorage.getItem('flordebatom_carrinho_v3');
    let cart: CartItem[] = [];
    if (savedCart) {
      try { cart = JSON.parse(savedCart); } catch (e) { cart = []; }
    }

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
    <section className="mt-8 bg-primary/[0.02] border border-primary/5 rounded-[2.5rem] p-6 shadow-sm">
      <div className="flex flex-col items-center text-center mb-6 space-y-1">
        <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm border border-primary/10 mb-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Sugestões Especiais</span>
        </div>
        <h2 className="font-headline text-xl md:text-2xl text-primary leading-tight">
          Você também pode gostar
        </h2>
      </div>

      {carregando ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="aspect-square rounded-2xl bg-white/50 border border-black/5" />
              <div className="h-2 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {produtos.map(p => {
            const hasVars = p.variations && p.variations.length > 0;
            const currentVarName = selectedVariations[p.id] || (hasVars ? p.variations![0].name : undefined);
            const currentVar = hasVars ? p.variations!.find(v => v.name === currentVarName) : undefined;
            const displayImg = currentVar?.imageUrl || p.imageUrl;
            const stock = hasVars ? (currentVar?.stock || 0) : (p.stock || 0);
            const isOutOfStock = stock <= 0;

            return (
              <div key={p.id} className={`group flex flex-col h-full bg-white p-2 rounded-[1.8rem] shadow-sm hover:shadow-xl transition-all duration-500 border border-transparent ${isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                <Link href={`/produto/${p.id}`} className="relative aspect-square rounded-[1.4rem] overflow-hidden bg-muted mb-3 border border-black/[0.03] block">
                  <Image
                    src={displayImg}
                    alt={p.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[8px] font-black text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-full shadow-lg">Esgotado</span>
                    </div>
                  )}

                  {!isOutOfStock && (
                    <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-500 hidden md:block">
                      <button
                        onClick={(e) => handleAdicionar(e, p)}
                        className={`w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg transition-all ${
                          adicionados[p.id] 
                            ? 'bg-green-500 text-white' 
                            : 'bg-primary/90 hover:bg-primary text-white backdrop-blur-sm'
                        }`}
                      >
                        {adicionados[p.id] ? '✓ Adicionado' : '+ Adicionar'}
                      </button>
                    </div>
                  )}
                  
                  {!isOutOfStock && (
                    <button
                      onClick={(e) => handleAdicionar(e, p)}
                      className="absolute bottom-2 right-2 md:hidden h-8 w-8 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                    >
                      <span className="text-lg font-bold">+</span>
                    </button>
                  )}
                </Link>

                <div className="flex-1 space-y-1 px-1 pb-1">
                  <Link href={`/produto/${p.id}`}>
                    <h3 className="font-poppins font-normal text-[10px] text-primary leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-primary/70 transition-colors">
                      {p.name}
                    </h3>
                  </Link>
                  <p className="text-xs font-bold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</p>

                  {hasVars && (
                    <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-primary/5">
                      {p.variations!.map(v => {
                        const vOut = (v.stock ?? 0) <= 0;
                        return (
                          <button
                            key={v.name}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!vOut) setSelectedVariations(prev => ({ ...prev, [p.id]: v.name }));
                            }}
                            className={`px-1 py-0.5 rounded-md text-[6px] font-bold border transition-all ${
                              currentVarName === v.name 
                                ? 'bg-primary text-white border-primary shadow-sm' 
                                : vOut ? 'bg-muted/30 border-transparent text-muted-foreground opacity-40 cursor-not-allowed' : 'bg-muted/50 border-transparent text-muted-foreground hover:border-primary/20'
                            }`}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
