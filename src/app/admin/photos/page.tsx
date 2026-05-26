
'use client';

import React, { useState } from 'react';
import { 
  Images, 
  Search, 
  Upload as UploadIcon, 
  Filter, 
  RefreshCcw,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadDropzone } from '@/components/media/UploadDropzone';
import { MediaGrid } from '@/components/media/MediaGrid';
import { useFirestore, useCollection, useMemoFirebase, useUser, useStorage } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Media } from '@/lib/types';
import { deleteMedia } from '@/lib/storage-media';
import { useToast } from '@/hooks/use-toast';

export default function AdminPhotos() {
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('library');

  const mediaQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'media'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const { data: mediaData, isLoading } = useCollection<Media>(mediaQuery);

  const filteredItems = (mediaData || []).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (media: Media) => {
    if (!storage || !db) return;
    if (confirm(`Excluir permanentemente "${media.name}"? Isso não pode ser desfeito.`)) {
      try {
        await deleteMedia(storage, db, media);
        toast({ title: "Removido", description: "Imagem excluída com sucesso." });
      } catch (e) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o arquivo." });
      }
    }
  };

  return (
    <div className="space-y-8 font-poppins pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] opacity-60">
            <LayoutGrid className="h-3 w-3" /> Gestão de Ativos
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Biblioteca de Imagens</h1>
          <p className="text-sm text-muted-foreground max-w-md">Gerencie todas as fotos de produtos e vitrine em um só lugar com compressão inteligente.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <Button 
            className="flex-1 md:flex-none h-12 px-6 rounded-xl bg-primary text-white font-bold gap-2 shadow-lg shadow-primary/20"
            onClick={() => setActiveTab('upload')}
          >
            <UploadIcon className="h-4 w-4" /> Novo Upload
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm mb-8">
          <TabsTrigger value="library" className="flex-1 rounded-xl h-full font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
            <Images className="h-4 w-4 mr-2" /> Minha Biblioteca
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex-1 rounded-xl h-full font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
            <UploadIcon className="h-4 w-4 mr-2" /> Enviar Fotos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-8 animate-in fade-in duration-500">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
              <Input 
                placeholder="Pesquisar por nome do arquivo..." 
                className="pl-12 h-14 rounded-2xl bg-white border-none shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-14 w-14 rounded-2xl bg-white border-none shadow-sm text-primary">
              <Filter className="h-5 w-5" />
            </Button>
          </div>

          <div className="bg-white/50 rounded-[2.5rem] p-4 md:p-8 border border-white min-h-[400px]">
            <MediaGrid 
              items={filteredItems} 
              isLoading={isLoading} 
              onDelete={handleDelete}
            />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="max-w-4xl mx-auto">
            <UploadDropzone onUploadComplete={() => setActiveTab('library')} />
          </div>
        </TabsContent>
      </Tabs>

      {/* FOOTER INFO */}
      <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Dica de Performance</p>
            <p className="text-xs text-muted-foreground">Todas as imagens são comprimidas automaticamente para menos de 1MB antes de serem salvas.</p>
          </div>
        </div>
        <div className="text-right">
           <span className="text-xl font-bold text-primary">{mediaData?.length || 0}</span>
           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Arquivos Totais</span>
        </div>
      </div>
    </div>
  );
}
