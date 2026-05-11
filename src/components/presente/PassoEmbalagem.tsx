'use client';

import React from 'react';
import Image from 'next/image';
import { Embalagem } from '@/types/presente';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, PackageSearch } from 'lucide-react';

interface Props {
  embalagens: Embalagem[];
  carregando: boolean;
  onSelecionar: (embalagem: Embalagem) => void;
}

export function PassoEmbalagem({ embalagens, carregando, onSelecionar }: Props) {
  if (carregando) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {[1, 2].map(i => (
          <div key={i} className="aspect-square rounded-[2rem] bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (embalagens.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-primary/20 max-w-2xl mx-auto space-y-6">
        <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground">
          <PackageSearch className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-primary">Nenhuma embalagem encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Certifique-se de que existem produtos cadastrados na categoria <span className="font-bold">"Monte seu Presente"</span> e que estão como <span className="font-bold">Ativos</span> no painel admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="font-headline text-3xl md:text-5xl text-primary leading-tight">Escolha sua Embalagem</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">O primeiro passo para um presente inesquecível é a apresentação 🌸</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {embalagens.map(emb => (
          <Card 
            key={emb.id} 
            className="group relative border-none bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer"
            onClick={() => onSelecionar(emb)}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              <Image 
                src={emb.imageUrl} 
                alt={emb.name} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-primary text-[10px] font-black px-4 py-2 rounded-full shadow-lg border border-primary/10 uppercase tracking-widest">
                Até {emb.maxItens} itens
              </div>
            </div>
            <CardContent className="p-6 text-center space-y-2">
              <h3 className="font-poppins text-xl font-semibold text-primary">{emb.name}</h3>
              <p className="text-2xl font-bold text-primary">R$ {emb.price.toFixed(2)}</p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 group-hover:text-primary transition-colors">
                  Escolher esta <Sparkles className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
