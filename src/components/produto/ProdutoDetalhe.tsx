'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ShoppingBag, Truck, Sparkles, Star } from 'lucide-react';
import { BotaoWhatsApp } from './BotaoWhatsApp';
import { Product, CartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ProdutosRelacionados } from './ProdutosRelacionados';

interface Props {
  produto: Product;
}

export function ProdutoDetalhe({ produto }: Props) {
  const [adicionado, setAdicionado] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { toast } = useToast();

  const formatarReais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  
  // Verifica se a variação selecionada tem estoque
  const variationStock = React.useMemo(() => {
    if (!produto.variations || produto.variations.length === 0) return produto.stock ?? 0;
    const v = produto.variations.find(v => v.name === selectedColor);
    return v ? (v.stock ?? 0) : 0;
  }, [produto, selectedColor]);

  const esgotado = variationStock <= 0;
  const urlProduto = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (produto.variations && produto.variations.length > 0) {
      // Tenta selecionar a primeira variação com estoque
      const firstAvailable = produto.variations.find(v => (v.stock ?? 0) > 0) || produto.variations[0];
      setSelectedColor(firstAvailable.name);
    }
  }, [produto]);

  const displayedImage = React.useMemo(() => {
    if (selectedColor && produto.variations) {
      const v = produto.variations.find(v => v.name === selectedColor);
      if (v?.imageUrl) return v.imageUrl;
    }
    return produto.imageUrl;
  }, [selectedColor, produto]);

  function handleAdicionarCarrinho() {
    if (esgotado) {
      toast({ variant: "destructive", title: "Ops!", description: "Este produto ou cor está esgotado no momento." });
      return;
    }

    const savedCart = localStorage.getItem('flordebatom_carrinho_v3');
    let cart: CartItem[] = savedCart ? JSON.parse(savedCart) : [];
    const itemExistente = cart.find(i => i.id === produto.id && i.selectedColor === selectedColor);
    
    if (itemExistente) {
      cart = cart.map(i => (i.id === produto.id && i.selectedColor === selectedColor) ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      cart.push({ ...produto, quantity: 1, selectedColor, imageUrl: displayedImage });
    }

    localStorage.setItem('flordebatom_carrinho_v3', JSON.stringify(cart));
    setAdicionado(true);
    toast({ title: "Adicionado!" });
    setTimeout(() => setAdicionado(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-poppins">
      <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md px-4 py-4 border-b flex items-center justify-between">
        <Link href="/" className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 text-primary"><ChevronLeft className="h-6 w-6" /></Link>
        <span className="font-bold text-primary text-xs uppercase tracking-widest">Detalhes</span>
        <div className="w-10" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="relative">
            <div className="aspect-square relative rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border border-primary/5">
              <Image src={displayedImage} alt={produto.name} fill className="object-cover" priority />
              {esgotado && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-white text-primary text-sm font-black px-8 py-3 rounded-full uppercase tracking-widest shadow-xl">Esgotado</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">{produto.category}</span>
              <h1 className="font-headline text-4xl lg:text-6xl text-primary leading-tight">{produto.name}</h1>
              <span className="text-3xl font-bold text-primary">{formatarReais(produto.price)}</span>
            </div>

            <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">{produto.description}</p>

            {produto.variations && produto.variations.length > 0 && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Cores Disponíveis</label>
                <div className="flex flex-wrap gap-3">
                  {produto.variations.map((v) => {
                    const varOut = (v.stock ?? 0) <= 0;
                    return (
                      <button 
                        key={v.name} 
                        onClick={() => !varOut && setSelectedColor(v.name)} 
                        disabled={varOut}
                        className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-2xl border-2 transition-all font-bold text-[10px] uppercase relative ${selectedColor === v.name ? 'border-primary bg-primary text-white shadow-lg' : varOut ? 'border-muted bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed' : 'border-muted bg-white text-muted-foreground hover:border-primary/30'}`}
                      >
                        {v.imageUrl && <div className="relative h-7 w-7 rounded-xl overflow-hidden border"><Image src={v.imageUrl} alt="" fill className="object-cover" /></div>}
                        <span>{v.name}</span>
                        {varOut && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded-full shadow-md">ESGOTADO</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 bg-primary/5 border border-primary/10 rounded-[1.5rem] p-4">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-md text-primary"><Truck className="h-5 w-5" /></div>
              <div><p className="text-[11px] font-bold text-primary uppercase">Entrega Grátis</p><p className="text-[10px] text-muted-foreground">Em toda a região de Capanema!</p></div>
            </div>

            <ProdutosRelacionados categoriaAtual={produto.category} idAtual={produto.id} />

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  onClick={handleAdicionarCarrinho} 
                  disabled={esgotado} 
                  className={`h-16 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${esgotado ? 'bg-muted cursor-not-allowed' : 'bg-primary shadow-xl shadow-primary/20 active:scale-95'}`}
                >
                  {esgotado ? 'Item Esgotado' : adicionado ? '✓ No Carrinho' : 'Adicionar ao Carrinho'}
                </Button>
                <BotaoWhatsApp nomeProduto={produto.name} preco={produto.price} urlProduto={urlProduto} variante="direto" />
              </div>
              <BotaoWhatsApp nomeProduto={produto.name} preco={produto.price} urlProduto={urlProduto} variante="outline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
