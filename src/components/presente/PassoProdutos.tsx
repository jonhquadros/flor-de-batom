
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Plus, Minus } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Product, INITIAL_CATEGORIES } from '@/lib/types';
import { Embalagem, ItemPresente } from '@/types/presente';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  embalagem: Embalagem;
  itens: ItemPresente[];
  limiteAtingido: boolean;
  totalItens: number;
  onAdicionar: (produto: Product, variationName?: string) => void;
  onDecrementar: (produtoId: string, variationName?: string) => void;
  onVoltar: () => void;
  onAvancar: () => void;
}

export function PassoProdutos({
  embalagem, itens, limiteAtingido, totalItens,
  onAdicionar, onDecrementar, onVoltar, onAvancar
}: Props) {
  const db = useFirestore();
  const [busca, setBusca] = useState('');
  const [catSelecionada, setCatSelecionada] = useState('Todos');
  const [selectedVars, setSelectedVars] = useState<Record<string, string>>({});

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'products');
  }, [db]);

  const { data: allProducts, isLoading } = useCollection<Product>(productsQuery);

  const produtos = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => {
      const cat = (p.category || '').trim().toLowerCase();
      return cat !== 'monte seu presente' && p.isActive !== false;
    });
  }, [allProducts]);

  const filtrados = useMemo(() => {
    return produtos.filter(p => {
      const matchCat = catSelecionada === 'Todos' || p.category === catSelecionada;
      const matchBusca = (p.name || '').toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [produtos, busca, catSelecionada]);

  const progresso = Math.min((totalItens / embalagem.maxItens) * 100, 100);

  function getQtd(id: string, color?: string) {
    return itens.find(i => i.produtoId === id && i.corSelecionada === color)?.quantidade || 0;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-primary/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-2xl overflow-hidden border">
              <Image src={embalagem.imageUrl} alt="" fill className="object-cover" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">{embalagem.name}</h4>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Capacidade: {embalagem.maxItens} itens</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold ${limiteAtingido ? 'text-red-500' : 'text-primary'}`}>{totalItens} / {embalagem.maxItens}</span>
            <p className="text-[9px] text-muted-foreground uppercase font-black">Produtos selecionados</p>
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${limiteAtingido ? 'bg-red-500' : progresso > 80 ? 'bg-orange-400' : 'bg-primary'}`} 
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Adicione produtos ao presente..." 
            className="pl-11 h-14 rounded-2xl bg-white border-none shadow-sm"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            <button 
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${catSelecionada === 'Todos' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-muted-foreground border-muted'}`}
              onClick={() => setCatSelecionada('Todos')}
            >
              Todos
            </button>
            {INITIAL_CATEGORIES.map(cat => (
              <button 
                key={cat}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${catSelecionada === cat ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-muted-foreground border-muted'}`}
                onClick={() => setCatSelecionada(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] rounded-3xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map(p => {
            const hasVars = p.variations && p.variations.length > 0;
            const currentVarName = selectedVars[p.id] || (hasVars ? p.variations![0].name : undefined);
            const currentVar = hasVars ? p.variations!.find(v => v.name === currentVarName) : undefined;
            const stock = hasVars ? (currentVar?.stock || 0) : p.stock;
            const qtd = getQtd(p.id, currentVarName);
            const jaAdicionado = qtd > 0;
            const isOutOfStock = stock <= 0;

            return (
              <div key={p.id} className={`bg-white rounded-[2rem] overflow-hidden border-2 transition-all duration-300 flex flex-col h-full ${jaAdicionado ? 'border-primary shadow-xl shadow-primary/5' : 'border-transparent shadow-sm'} ${isOutOfStock ? 'opacity-40' : ''}`}>
                <div className="relative aspect-square">
                  <Image src={currentVar?.imageUrl || p.imageUrl} alt={p.name} fill className="object-cover" />
                  {jaAdicionado && (
                    <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                      {qtd}
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-black uppercase">Esgotado</div>
                  )}
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-primary/40 uppercase truncate">{p.category}</p>
                    <h5 className="text-[10px] font-bold text-primary leading-tight line-clamp-2 min-h-[2.5em]">{p.name}</h5>
                    <p className="text-xs font-bold text-primary">R$ {p.price.toFixed(2)}</p>
                  </div>
                  
                  {hasVars && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.variations!.map(v => (
                        <button
                          key={v.name}
                          className={`px-1.5 py-0.5 rounded-md text-[7px] font-bold border transition-all ${currentVarName === v.name ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-transparent hover:border-primary/30'}`}
                          onClick={() => setSelectedVars(prev => ({ ...prev, [p.id]: v.name }))}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 mt-auto">
                    {jaAdicionado ? (
                      <div className="flex items-center justify-between bg-primary/5 rounded-xl p-1">
                        <button onClick={() => onDecrementar(p.id, currentVarName)} className="h-8 w-8 flex items-center justify-center text-primary"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-bold text-primary">{qtd}</span>
                        <button 
                          onClick={() => onAdicionar(p, currentVarName)} 
                          disabled={limiteAtingido || isOutOfStock}
                          className="h-8 w-8 flex items-center justify-center text-primary disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full h-9 rounded-xl text-[9px] font-black uppercase gap-1"
                        disabled={limiteAtingido || isOutOfStock}
                        onClick={() => onAdicionar(p, currentVarName)}
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {itens.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between gap-3 z-[100] shadow-2xl">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase font-bold truncate">{totalItens} itens na {embalagem.name.toLowerCase()}</p>
            <p className="font-bold text-primary">R$ {((embalagem.price) + itens.reduce((s, i) => s + i.preco * i.quantidade, 0)).toFixed(2)}</p>
          </div>
          <Button onClick={onAvancar} className="bg-primary hover:bg-primary/90 rounded-xl px-8 h-12 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20">Finalizar →</Button>
        </div>
      )}

      <div className="hidden lg:flex gap-3 pt-6">
        <Button variant="outline" className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase" onClick={onVoltar}>← Voltar</Button>
        <Button 
          className="flex-2 h-14 rounded-2xl text-[10px] font-black uppercase gap-2" 
          disabled={itens.length === 0}
          onClick={onAvancar}
        >
          Finalizar Presente →
        </Button>
      </div>
      <div className="lg:hidden h-20" />
    </div>
  );
}
