
'use client';

import React from 'react';
import Image from 'next/image';
import { Eye, Copy, Trash2, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { Media } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  media: Media;
  onDelete: (media: Media) => void;
  onSelect?: (url: string) => void;
  variant?: 'grid' | 'selectable';
}

export function MediaCard({ media, onDelete, onSelect, variant = 'grid' }: Props) {
  const { toast } = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(media.url);
    toast({ title: "Copiado!", description: "Link da imagem pronto para uso." });
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(media.url, '_blank');
  };

  const formattedDate = media.createdAt 
    ? format(new Date(media.createdAt), 'dd MMM yyyy', { locale: ptBR })
    : '-';

  return (
    <div 
      className={`group relative bg-white rounded-2xl overflow-hidden border border-primary/5 shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer flex flex-col ${variant === 'selectable' ? 'hover:border-primary' : ''}`}
      onClick={() => onSelect?.(media.url)}
    >
      <div className="relative aspect-square bg-muted/30 overflow-hidden">
        <Image 
          src={media.url} 
          alt={media.name} 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-110" 
          sizes="(max-width: 768px) 50vw, 20vw"
        />
        
        {/* Overlays/Controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {variant === 'selectable' ? (
            <div className="bg-white text-primary px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Usar Imagem
            </div>
          ) : (
            <>
              <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl" onClick={handleView} title="Visualizar">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl" onClick={handleCopy} title="Copiar URL">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" className="h-9 w-9 rounded-xl" onClick={(e) => { e.stopPropagation(); onDelete(media); }} title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-3 space-y-1">
        <p className="text-[10px] font-bold text-primary truncate leading-tight uppercase tracking-tight" title={media.name}>
          {media.name}
        </p>
        <div className="flex items-center justify-between opacity-60">
          <div className="flex items-center gap-1 text-[8px] font-bold uppercase">
            <Calendar className="h-2.5 w-2.5" /> {formattedDate}
          </div>
          <div className="flex items-center gap-1 text-[8px] font-bold uppercase">
            <FileText className="h-2.5 w-2.5" /> {(media.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>
    </div>
  );
}
