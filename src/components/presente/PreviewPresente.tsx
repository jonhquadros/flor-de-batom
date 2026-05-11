
'use client';

import React from 'react';
import Image from 'next/image';
import { ShoppingBag, Trash2, Gift } from 'lucide-react';
import { Presente } from '@/types/presente';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Props {
  presente: Presente | null;
  onRemoverItem: (id: string) => void;
  onAvancar: () => void;
}

export function PreviewPresente({ presente, onRemoverItem, onAvancar }: Props) {
  if (!presente) return null;
  const { embalagem, itens, totalItens, totalFinal } = presente;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-primary/5 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
      <div className="bg-primary p-6 text-white text-center space-y-1">
        <Gift className="h-6 w-6 mx-auto mb-1" />
        <h3 className="font-bold text-sm uppercase tracking-widest">Resumo do Presente</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="flex gap-4 items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border">
              <Image src={embalagem.imageUrl} alt="" fill className="object-cover" />
            </div>
            <div>
              <p className="text-[8px] font-black text-primary/40 uppercase tracking-widest">Embalagem</p>
              <p className="font-bold text-primary text-xs leading-tight">{embalagem.name}</p>
              <p className="text-xs font-bold text-primary">R$ {embalagem.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="h-3 w-3" /> Itens ({totalItens})
            </p>
            {itens.length === 0 ? (
              <p className="text-center py-10 text-[10px] font-bold text-muted-foreground uppercase italic tracking-widest opacity-50">Adicione produtos</p>
            ) : (
              <div className="space-y-3">
                {itens.map(item => (
                  <div key={item.produtoId} className="flex gap-3 items-center group">
                    <div className="relative h-10 w-10 rounded-xl overflow-hidden border shrink-0">
                      <Image src={item.imagem} alt="" fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-primary truncate leading-tight">{item.nome}</p>
                      <p className="text-[9px] font-bold text-muted-foreground">{item.quantidade}x R$ {item.preco.toFixed(2)}</p>
                    </div>
                    <button 
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                      onClick={() => onRemoverItem(item.produtoId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-6 bg-primary/5 border-t space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>PRODUTOS</span>
            <span>R$ {(totalFinal - embalagem.price).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>EMBALAGEM</span>
            <span>R$ {embalagem.price.toFixed(2)}</span>
          </div>
          <Separator className="bg-primary/10" />
          <div className="flex justify-between text-xl font-bold text-primary pt-1">
            <span className="text-[10px] mt-2">TOTAL</span>
            <span>R$ {totalFinal.toFixed(2)}</span>
          </div>
        </div>

        <Button 
          className="w-full h-14 rounded-2xl bg-primary text-xs font-black uppercase shadow-xl shadow-primary/20"
          disabled={itens.length === 0}
          onClick={onAvancar}
        >
          Finalizar Presente
        </Button>
      </div>
    </div>
  );
}
