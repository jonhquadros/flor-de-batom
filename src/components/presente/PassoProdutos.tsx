
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Plus, Minus, Filter } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
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
  onAdicionar: (produto: Product) => void;
  onDecrementar: (produtoId: string) => void;
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

  const produtosQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), where('isActive', '==', true), orderBy('category'));
  }, [db]);

  const { data: produtosRaw, isLoading } = useCollection<Product>(produtosQuery);

  const produtos = useMemo(() => {
    if (!produtosRaw) return [];
    return produtosRaw.filter(p => p.category !== 'Monte seu Presente' && p.stock > 0);
  }, [produtosRaw]);

  const filtrados = useMemo(() => {
    return produtos.filter(p => {
      const matchCat = catSelecionada === 'Todos' || p.category === catSelecionada;
      const matchBusca = p.name.toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [produtos, busca, catSelecionada]);

  const progresso = Math.min((totalItens / embalagem.maxItens) * 100, 100);

  function getQtd(id: string) {
    return itens.find(i => i.produtoId === id)?.quantidade || 0;
  }

  return (
    <div className="space-y-6">
      {/* Status da Embalagem */}
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
        {limiteAtingido && <p className="text-center text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Capacidade máxima atingida!</p>}
      </div>

      {/* Busca e Filtros */}
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

      {/* Grid de Produtos */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] rounded-3xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map(p => {
            const qtd = getQtd(p.id);
            const jaAdicionado = qtd > 0;

            return (
              <div key={p.id} className={`bg-white rounded-[2rem] overflow-hidden border-2 transition-all duration-300 ${jaAdicionado ? 'border-primary shadow-xl shadow-primary/5' : 'border-transparent shadow-sm'}`}>
                <div className="relative aspect-square">
                  <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                  {jaAdicionado && (
                    <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                      {qtd}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-[8px] font-bold text-primary/40 uppercase truncate">{p.category}</p>
                  <h5 className="text-[10px] font-bold text-primary leading-tight line-clamp-2 min-h-[2.5em]">{p.name}</h5>
                  <p className="text-xs font-bold text-primary">R$ {p.price.toFixed(2)}</p>
                  
                  <div className="pt-2">
                    {jaAdicionado ? (
                      <div className="flex items-center justify-between bg-primary/5 rounded-xl p-1">
                        <button onClick={() => onDecrementar(p.id)} className="h-8 w-8 flex items-center justify-center text-primary"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-bold text-primary">{qtd}</span>
                        <button 
                          onClick={() => onAdicionar(p)} 
                          disabled={limiteAtingido}
                          className="h-8 w-8 flex items-center justify-center text-primary disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full h-9 rounded-xl text-[9px] font-black uppercase gap-1"
                        disabled={limiteAtingido}
                        onClick={() => onAdicionar(p)}
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

      {/* Botões Mobile Navegação */}
      <div className="lg:hidden flex gap-3 pt-6">
        <Button variant="outline" className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase" onClick={onVoltar}>← Voltar</Button>
        <Button 
          className="flex-2 h-14 rounded-2xl text-[10px] font-black uppercase gap-2" 
          disabled={itens.length === 0}
          onClick={onAvancar}
        >
          Finalizar Presente →
        </Button>
      </div>
    </div>
  );
}
