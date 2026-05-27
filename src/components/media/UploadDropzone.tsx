'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, ImagePlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFirebase, useUser } from '@/firebase';
import { uploadMedia } from '@/lib/storage-media';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onUploadComplete: () => void;
}

export function UploadDropzone({ onUploadComplete }: Props) {
  const firebase = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [previews, setPreviews] = useState<{file: File, id: string}[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  if (!firebase) return null;
  const { firestore } = firebase;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) prepareUpload(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) prepareUpload(files);
  };

  const prepareUpload = (files: File[]) => {
    const newPreviews = files.map(f => ({ file: f, id: Math.random().toString(36).substr(2, 9) }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreview = (id: string) => {
    setPreviews(prev => prev.filter(p => p.id !== id));
  };

  const startUpload = async () => {
    if (!user) {
      toast({ 
        variant: "destructive", 
        title: "Acesso Negado", 
        description: "Você precisa estar logado como administrador para enviar fotos." 
      });
      return;
    }

    if (previews.length === 0) return;

    setIsGlobalLoading(true);
    let successCount = 0;

    for (const item of previews) {
      try {
        setUploadingFiles(prev => new Map(prev).set(item.id, 0));
        
        await uploadMedia(null, firestore, item.file, 'products', (progress) => {
          setUploadingFiles(prev => {
            const next = new Map(prev);
            next.set(item.id, progress);
            return next;
          });
        });
        
        successCount++;
        setPreviews(prev => prev.filter(p => p.id !== item.id));
      } catch (error: any) {
        console.error("Erro no processo de upload Cloudinary:", error);
        toast({ 
          variant: "destructive", 
          title: "Falha no arquivo", 
          description: `Erro ao subir "${item.file.name}". Verifique os limites do Cloudinary.` 
        });
      } finally {
        setUploadingFiles(prev => {
          const next = new Map(prev);
          next.delete(item.id);
          return next;
        });
      }
    }

    setIsGlobalLoading(false);
    
    if (successCount > 0) {
      onUploadComplete();
      toast({ 
        title: "Sucesso!", 
        description: `${successCount} imagem(ns) adicionada(s) ao Cloudinary e biblioteca.` 
      });
    }
  };

  const isAnythingUploading = uploadingFiles.size > 0 || isGlobalLoading;

  return (
    <div className="space-y-6">
      {(!user && !isUserLoading) && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-bold animate-pulse">
          <AlertCircle className="h-5 w-5" />
          Atenção: Sessão de administrador não detectada. O envio será bloqueado.
        </div>
      )}

      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[2rem] p-10 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 ${
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-primary/20 bg-white hover:border-primary/40'
        } ${isAnythingUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileInput} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isAnythingUploading || isUserLoading}
        />
        
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
          {isUserLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <ImagePlus className="h-8 w-8" />}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-primary">Upload Profissional (Cloudinary)</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-60">Arraste ou clique para escolher</p>
        </div>
        
        <p className="text-[10px] text-muted-foreground">Otimização automática (WebP/AVIF) ativa.</p>
      </div>

      {previews.length > 0 && (
        <div className="bg-white rounded-[2rem] p-6 border border-primary/5 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Arquivos Selecionados ({previews.length})</h4>
            {!isAnythingUploading && (
              <button className="text-destructive text-[10px] font-bold uppercase" onClick={() => setPreviews([])}>
                Limpar Tudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {previews.map((p) => {
              const progress = uploadingFiles.get(p.id);
              const isUploading = progress !== undefined;

              return (
                <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border bg-muted group">
                  <img src={URL.createObjectURL(p.file)} alt="" className="w-full h-full object-cover" />
                  
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                      <div className="w-full space-y-1">
                         <Progress value={progress} className="h-1 bg-white/20" />
                         <p className="text-[8px] text-white font-bold text-center">Processando Cloudinary...</p>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => removePreview(p.id)}
                      className="absolute top-2 right-2 h-6 w-6 bg-white/90 rounded-full flex items-center justify-center text-destructive hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!isAnythingUploading && (
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-xs font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20" 
              onClick={startUpload}
              disabled={isUserLoading || previews.length === 0}
            >
              <Upload className="h-4 w-4" /> Inviar para Biblioteca Otimizada
            </Button>
          )}

          {isAnythingUploading && (
            <div className="p-4 bg-muted/20 rounded-xl text-center">
              <p className="text-[10px] font-bold text-primary animate-pulse uppercase">Otimizando e enviando para o Cloudinary, aguarde...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
