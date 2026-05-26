
'use client';

import React from 'react';
import { Media } from '@/lib/types';
import { MediaCard } from './MediaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface Props {
  items: Media[];
  isLoading: boolean;
  onDelete: (media: Media) => void;
  onSelect?: (url: string) => void;
  variant?: 'grid' | 'selectable';
}

export function MediaGrid({ items, isLoading, onDelete, onSelect, variant = 'grid' }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
        <div className="w-16 h-16 rounded-[1.5rem] bg-muted flex items-center justify-center">
          <ImageOff className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-widest">Nenhuma imagem encontrada</p>
          <p className="text-xs">Faça o primeiro upload para começar sua biblioteca.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {items.map(media => (
        <MediaCard 
          key={media.id} 
          media={media} 
          onDelete={onDelete} 
          onSelect={onSelect}
          variant={variant}
        />
      ))}
    </div>
  );
}
