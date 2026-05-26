
"use client"

import React, { useState } from 'react';
import { Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Category } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AdminCategories() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'categories');
  }, [db, user]);

  const { data: categoriesData, isLoading } = useCollection<Category>(categoriesQuery);
  
  // Desduplicação de categorias para garantir estabilidade do React e chaves únicas
  const categories = React.useMemo(() => {
    if (!categoriesData) return [];
    const seen = new Set();
    const filtered = categoriesData.filter(c => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [categoriesData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState('0');

  const openAddModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatOrder('0');
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setCatName(category.name);
    setCatOrder(String(category.order ?? 0));
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    if (confirm('Excluir categoria? Isso afetará todos os dispositivos.')) {
      deleteDocumentNonBlocking(doc(db, 'categories', id));
      toast({ title: "Removida" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !catName.trim()) return;

    const id = editingCategory?.id || Math.random().toString(36).substr(2, 9);
    setDocumentNonBlocking(doc(db, 'categories', id), { 
      id, 
      name: catName,
      order: Number(catOrder) || 0
    }, { merge: true });

    setIsModalOpen(false);
    toast({ title: "Sucesso!", description: editingCategory ? "Atualizada." : "Criada." });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Sincronizando categorias...</div>;

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Categorias</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão global e ordenação da vitrine.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto font-bold rounded-xl" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-right text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhuma categoria.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map(cat => (
                  <TableRow key={cat.id} className="hover:bg-muted/10">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-xs text-primary">{cat.order ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-xs">{cat.name}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(cat)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[90%] max-w-md font-poppins rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="catName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Categoria</Label>
              <Input 
                id="catName" 
                value={catName} 
                onChange={(e) => setCatName(e.target.value)} 
                placeholder="Ex: Novos Batons"
                required 
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catOrder" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordem de Exibição</Label>
              <Input 
                id="catOrder" 
                type="number"
                value={catOrder} 
                onChange={(e) => setCatOrder(e.target.value)} 
                placeholder="Ex: 1"
                required 
                className="h-12 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground italic">Numbers menores aparecem primeiro no catálogo.</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" className="rounded-xl h-11" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-xl h-11 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20">Salvar Categoria</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
