
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PassoEmbalagem } from './PassoEmbalagem';
import { PassoProdutos } from './PassoProdutos';
import { PreviewPresente } from './PreviewPresente';
import { PassoFinalizacao } from './PassoFinalizacao';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Embalagem, ItemPresente, Presente } from '@/types/presente';

type Passo = 1 | 2 | 3;

function inferirMaxItens(produto: Product): number {
  if ((produto as any).maxItens) return Number((produto as any).maxItens);
  
  const nome = (produto.name || '').toLowerCase();
  if (nome.includes('cesta')) return 15;
  if (nome.includes('copo')) return 4;
  if (nome.includes('sacola')) return 7;
  return 10;
}

export function MontadorPresente() {
  const db = useFirestore();
  const [passoAtual, setPassoAtual] = useState<Passo>(1);
  const [embalagem, setEmbalagem] = useState<Embalagem | null>(null);
  const [itens, setItens] = useState<ItemPresente[]>([]);

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'products');
  }, [db]);

  const { data: allProducts, isLoading: isProductsLoading } = useCollection<Product>(productsQuery);

  const embalagens = useMemo(() => {
    if (!allProducts) return [];
    return allProducts
      .filter(p => {
        const cat = (p.category || '').trim().toLowerCase();
        // Filtro resiliente para a categoria
        return cat === 'monte seu presente' && p.isActive !== false;
      })
      .map(p => ({
        ...p,
        maxItens: (p as any).maxItens || inferirMaxItens(p)
      })) as Embalagem[];
  }, [allProducts]);

  const totalItens = itens.reduce((s, i) => s + i.quantidade, 0);
  const totalProdutos = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const totalFinal = (embalagem?.price ?? 0) + totalProdutos;
  const limiteAtingido = embalagem ? totalItens >= embalagem.maxItens : false;

  const presente: Presente | null = embalagem
    ? { embalagem, itens, totalItens, totalProdutos, totalFinal }
    : null;

  function adicionarProduto(produto: Product, corSelecionada?: string) {
    if (!embalagem || totalItens >= embalagem.maxItens) return;
    setItens(prev => {
      const existente = prev.find(i => i.produtoId === produto.id && i.corSelecionada === corSelecionada);
      if (existente) {
        return prev.map(i =>
          (i.produtoId === produto.id && i.corSelecionada === corSelecionada) ? { ...i, quantity: (i.quantidade + 1) as any, quantidade: i.quantidade + 1 } : i
        );
      }
      
      let imagem = produto.imageUrl;
      if (corSelecionada && produto.variations) {
        const v = produto.variations.find(v => v.name === corSelecionada);
        if (v?.imageUrl) imagem = v.imageUrl;
      }

      return [...prev, {
        produtoId: produto.id,
        nome: produto.name,
        preco: produto.price,
        imagem: imagem,
        categoria: produto.category,
        quantidade: 1,
        corSelecionada: corSelecionada
      }];
    });
  }

  function decrementarProduto(produtoId: string, corSelecionada?: string) {
    setItens(prev => {
      const item = prev.find(i => i.produtoId === produtoId && i.corSelecionada === corSelecionada);
      if (!item) return prev;
      if (item.quantidade > 1)
        return prev.map(i =>
          (i.produtoId === produtoId && i.corSelecionada === corSelecionada) ? { ...i, quantidade: i.quantidade - 1 } : i
        );
      return prev.filter(i => !(i.produtoId === produtoId && i.corSelecionada === corSelecionada));
    });
  }

  function removerItemCompleto(produtoId: string, corSelecionada?: string) {
    setItens(prev => prev.filter(i => !(i.produtoId === produtoId && i.corSelecionada === corSelecionada)));
  }

  function selecionarEmbalagem(e: Embalagem) {
    setEmbalagem(e);
    setItens([]);
    setPassoAtual(2);
    window.scrollTo(0, 0);
  }

  function reiniciar() {
    setPassoAtual(1);
    setEmbalagem(null);
    setItens([]);
    window.scrollTo(0, 0);
  }

  return (
    <div className="font-poppins pb-20">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 text-primary">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <span className="font-bold text-primary text-xs uppercase tracking-widest">Monte seu Presente</span>
        <div className="w-10" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-12">
          {[
            { n: 1, label: 'Embalagem', icon: '🎀' },
            { n: 2, label: 'Produtos', icon: '🛍️' },
            { n: 3, label: 'Finalizar', icon: '💌' }
          ].map((p, i) => (
            <React.Fragment key={p.n}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                  passoAtual >= p.n ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'
                }`}>
                  {passoAtual > p.n ? '✓' : p.icon}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${passoAtual >= p.n ? 'text-primary' : 'text-muted-foreground'}`}>
                  {p.label}
                </span>
              </div>
              {i < 2 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-2 mb-6 rounded-full transition-all duration-700 ${
                  passoAtual > p.n ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {passoAtual === 1 && (
            <PassoEmbalagem
              embalagens={embalagens}
              carregando={isProductsLoading}
              onSelecionar={selecionarEmbalagem}
            />
          )}

          {passoAtual === 2 && embalagem && (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <PassoProdutos
                  embalagem={embalagem}
                  itens={itens}
                  limiteAtingido={limiteAtingido}
                  totalItens={totalItens}
                  onAdicionar={adicionarProduto}
                  onDecrementar={decrementarProduto}
                  onVoltar={() => setPassoAtual(1)}
                  onAvancar={() => setPassoAtual(3)}
                />
              </div>
              <aside className="lg:w-80 shrink-0 hidden lg:block">
                <div className="sticky top-24">
                  <PreviewPresente
                    presente={presente}
                    onRemoverItem={removerItemCompleto}
                    onAvancar={() => setPassoAtual(3)}
                  />
                </div>
              </aside>
            </div>
          )}

          {passoAtual === 3 && presente && (
            <PassoFinalizacao
              presente={presente}
              onVoltar={() => setPassoAtual(2)}
              onReiniciar={reiniciar}
            />
          )}
        </div>
      </div>
    </div>
  );
}
