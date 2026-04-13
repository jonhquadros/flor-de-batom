"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tags } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Category } from '@/lib/types';
import { getStoredCategories, saveCategories } from '@/lib/storage-utils';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setCategories(getStoredCategories());
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setCatName('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setCatName(category.name);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir categoria?')) {
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      saveCategories(updated);
      toast({ title: "Removida" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    let updated: Category[];
    if (editingCategory) {
      updated = categories.map(c => c.id === editingCategory.id ? { ...c, name: catName } : c);
    } else {
      const newCat: Category = {
        id: Math.random().toString(36).substr(2, 9),
        name: catName
      };
      updated = [...categories, newCat];
    }

    setCategories(updated);
    saveCategories(updated);
    setIsModalOpen(false);
    toast({ title: "Sucesso!", description: editingCategory ? "Atualizada." : "Criada." });
  };

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Categorias</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão de filtros da vitrine.</p>
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
                <TableHead className="w-12"></TableHead>
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
                    <TableCell><Tags className="h-4 w-4 text-muted-foreground" /></TableCell>
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
