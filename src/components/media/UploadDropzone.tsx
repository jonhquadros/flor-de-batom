
'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFirebase } from '@/firebase';
import { uploadMedia } from '@/lib/storage-media';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onUploadComplete: () => void;
}

export function UploadDropzone({ onUploadComplete }: Props) {
  const firebase = useFirebase();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [previews, setPreviews] = useState<{file: File, id: string}[]>([]);

  if (!firebase) return null;
  const { storage, firestore } = firebase;

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
    if (previews.length === 0) return;

    let successCount = 0;
    const totalFiles = previews.length;

    for (const item of previews) {
      try {
        setUploadingFiles(prev => new Map(prev).set(item.id, 0));
        await uploadMedia(storage, firestore, item.file, 'products', (progress) => {
          setUploadingFiles(prev => new Map(prev).set(item.id, progress));
        });
        successCount++;
      } catch (error: any) {
        console.error("Erro detalhado no upload:", error);
        toast({ 
          variant: "destructive", 
          title: "Erro no upload", 
          description: `Falha ao subir ${item.file.name}. Verifique sua conexão ou permissões.` 
        });
      }
    }

    if (successCount > 0) {
      setPreviews([]);
      setUploadingFiles(new Map());
      onUploadComplete();
      toast({ 
        title: "Upload Concluído!", 
        description: `${successCount} de ${totalFiles} imagens foram adicionadas à biblioteca.` 
      });
    }
  };

  const totalUploading = uploadingFiles.size > 0;

  return (
    <div className="space-y-6">
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[2rem] p-10 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 ${
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-primary/20 bg-white hover:border-primary/40'
        }`}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileInput} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={totalUploading}
        />
        
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
          <ImagePlus className="h-8 w-8" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-primary">Solte suas fotos aqui</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-60">Ou clique para selecionar arquivos</p>
        </div>
        
        <p className="text-[10px] text-muted-foreground">Suporte para JPG, PNG e WebP (Máx. 5MB por arquivo)</p>
      </div>

      {previews.length > 0 && (
        <div className="bg-white rounded-[2rem] p-6 border border-primary/5 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Imagens Pendentes ({previews.length})</h4>
            {!totalUploading && (
              <Button variant="ghost" size="sm" className="text-destructive text-[10px] font-bold h-7" onClick={() => setPreviews([])}>
                Limpar Tudo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {previews.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border bg-muted">
                <img src={URL.createObjectURL(p.file)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
                
                {uploadingFiles.has(p.id) ? (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                    <Progress value={uploadingFiles.get(p.id)!} className="h-1" />
                  </div>
                ) : (
                  <button 
                    onClick={() => removePreview(p.id)}
                    className="absolute top-2 right-2 h-6 w-6 bg-white/90 rounded-full flex items-center justify-center text-destructive hover:bg-white shadow-lg"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!totalUploading && (
            <Button className="w-full h-14 rounded-2xl bg-primary text-xs font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20" onClick={startUpload}>
              <Upload className="h-4 w-4" /> Iniciar Upload de {previews.length} fotos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
