"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit, Trash2, Search, Wand2, Loader2, ImagePlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Product, Category } from '@/lib/types';
import { getStoredProducts, saveProducts, getStoredCategories, seedInitialData } from '@/lib/storage-utils';
import { generateProductDescription } from '@/ai/flows/generate-product-description';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
    isFeatured: false,
    stock: 0
  });

  const loadData = () => {
    setProducts(getStoredProducts());
    setCategories(getStoredCategories());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      description: '', 
      price: 0, 
      category: categories.length > 0 ? categories[0].name : '', 
      imageUrl: `https://picsum.photos/seed/${Math.random()}/400/400`, 
      isFeatured: false, 
      stock: 0 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      saveProducts(updated);
      toast({ title: "Removido", description: "O produto foi excluído com sucesso." });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let updated: Product[];
    
    const productData = {
      name: formData.name || '',
      description: formData.description || '',
      price: Number(formData.price) || 0,
      category: formData.category || '',
      imageUrl: formData.imageUrl || '',
      isFeatured: !!formData.isFeatured,
      stock: Number(formData.stock) || 0,
    };

    if (editingProduct) {
      updated = products.map(p => p.id === editingProduct.id ? { ...productData, id: p.id } : p);
    } else {
      const newProduct: Product = { 
        ...productData, 
        id: Math.random().toString(36).substr(2, 9) 
      };
      updated = [...products, newProduct];
    }

    setProducts(updated);
    saveProducts(updated);
    setIsModalOpen(false);
    toast({ title: "Sucesso!", description: editingProduct ? "Produto atualizado." : "Produto criado." });
  };

  const handleAIGenerate = async () => {
    if (!formData.name || !formData.category) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha o nome e a categoria antes de usar a IA." });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const description = await generateProductDescription({ 
        productName: formData.name, 
        category: formData.category 
      });
      setFormData(prev => ({ ...prev, description }));
      toast({ title: "Descrição Gerada", description: "IA criou uma descrição sofisticada para o produto." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na IA", description: "Não foi possível gerar a descrição no momento." });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu inventário de maquiagem.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Pesquisar por nome..." 
          className="pl-10 max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Destaque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.isFeatured ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(product)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData(p => ({...p, price: parseFloat(e.target.value)}))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData(p => ({...p, stock: parseInt(e.target.value)}))} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="desc">Descrição</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
                  onClick={handleAIGenerate}
                  disabled={isGeneratingAI}
                >
                  {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Gerar com IA
                </Button>
              </div>
              <Textarea id="desc" rows={5} value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="img">URL da Imagem</Label>
              <Input id="img" value={formData.imageUrl} onChange={(e) => setFormData(p => ({...p, imageUrl: e.target.value}))} required />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ImagePlus className="h-3 w-3" /> Sugerido: Usar URLs estáveis de imagens de produtos.</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="feat" checked={formData.isFeatured} onCheckedChange={(v) => setFormData(p => ({...p, isFeatured: v}))} />
              <Label htmlFor="feat">Produto em Destaque na Vitrine</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 px-8">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
