
'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Images, Library } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MediaGrid } from './MediaGrid';
import { useFirestore, useCollection, useMemoFirebase, useUser, useStorage } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Media } from '@/lib/types';
import { deleteMedia } from '@/lib/storage-media';

interface Props {
  onSelect: (url: string) => void;
}

export function MediaModal({ onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();

  const mediaQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'media'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const { data: mediaData, isLoading } = useCollection<Media>(mediaQuery);

  const filteredMedia = (mediaData || []).filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (url: string) => {
    onSelect(url);
    setIsOpen(false);
  };

  const handleDelete = async (media: Media) => {
    if (!storage || !db) return;
    if (confirm("Deseja excluir esta imagem da biblioteca permanentemente?")) {
      await deleteMedia(storage, db, media);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase rounded-lg border-primary/20 text-primary gap-2 hover:bg-primary hover:text-white transition-all">
          <Library className="h-3.5 w-3.5" /> Selecionar da Biblioteca
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] max-w-5xl max-h-[90vh] overflow-hidden p-0 border-none rounded-[2.5rem] flex flex-col font-poppins shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Images className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-primary">Biblioteca de Imagens</DialogTitle>
            </div>
          </div>
          
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar imagem por nome..." 
              className="pl-11 h-12 rounded-2xl bg-muted/40 border-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <MediaGrid 
            items={filteredMedia} 
            isLoading={isLoading} 
            onDelete={handleDelete}
            onSelect={handleSelect}
            variant="selectable"
          />
        </div>

        <div className="p-4 bg-muted/20 border-t text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selecione uma imagem para preencher o campo automaticamente</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
