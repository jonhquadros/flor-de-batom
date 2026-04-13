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
    if (confirm('Tem certeza que deseja excluir esta categoria? Isso não removerá os produtos, mas eles podem perder o filtro.')) {
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      saveCategories(updated);
      toast({ title: "Removida", description: "A categoria foi excluída com sucesso." });
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
    toast({ title: "Sucesso!", description: editingCategory ? "Categoria atualizada." : "Categoria criada." });
  };

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">Gerencie os filtros da sua vitrine.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nome da Categoria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              categories.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell><Tags className="h-4 w-4 text-muted-foreground" /></TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="font-poppins">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Nome</Label>
              <Input 
                id="catName" 
                value={catName} 
                onChange={(e) => setCatName(e.target.value)} 
                placeholder="Ex: Novos Batons"
                required 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
