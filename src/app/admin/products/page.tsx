"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit, Trash2, Search, Wand2, Loader2, ImagePlus, Palette } from 'lucide-react';
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
import { getStoredProducts, saveProducts, getStoredCategories } from '@/lib/storage-utils';
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
    stock: 0,
    colors: []
  });

  const [colorsString, setColorsString] = useState('');

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
      stock: 0,
      colors: []
    });
    setColorsString('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setColorsString(product.colors?.join(', ') || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir este produto?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      saveProducts(updated);
      toast({ title: "Removido" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let updated: Product[];
    
    const colorsArray = colorsString.split(',').map(s => s.trim()).filter(s => s !== '');

    const productData = {
      name: formData.name || '',
      description: formData.description || '',
      price: Number(formData.price) || 0,
      category: formData.category || '',
      imageUrl: formData.imageUrl || '',
      isFeatured: !!formData.isFeatured,
      stock: Number(formData.stock) || 0,
      colors: colorsArray
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
    toast({ title: "Sucesso!", description: editingProduct ? "Atualizado." : "Criado." });
  };

  const handleAIGenerate = async () => {
    if (!formData.name || !formData.category) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome e categoria." });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const description = await generateProductDescription({ 
        productName: formData.name, 
        category: formData.category 
      });
      setFormData(prev => ({ ...prev, description }));
      toast({ title: "Descrição Gerada" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na IA" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getNumericValue = (val: any) => {
    if (val === undefined || val === null || isNaN(val)) return '';
    return val;
  };

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Produtos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão de inventário.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto font-bold rounded-xl" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Pesquisar..." 
          className="pl-10 h-10 text-sm w-full md:max-w-sm rounded-xl border-none bg-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-16 text-xs"></TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-xs">Preço</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum produto.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id} className="hover:bg-muted/10">
                    <TableCell>
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-[100px]">
                        <span className="font-bold text-xs truncate max-w-[150px]">{product.name}</span>
                        <span className="text-[9px] text-muted-foreground md:hidden">{product.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell">{product.category}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">R$ {product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(product)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto font-poppins rounded-2xl p-4 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome</Label>
                <Input id="name" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço (R$)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.01" 
                  value={getNumericValue(formData.price)} 
                  onChange={(e) => setFormData(p => ({...p, price: parseFloat(e.target.value)}))} 
                  required 
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estoque</Label>
                <Input 
                  id="stock" 
                  type="number" 
                  value={getNumericValue(formData.stock)} 
                  onChange={(e) => setFormData(p => ({...p, stock: parseInt(e.target.value)}))} 
                  required 
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="colors" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cores (separe por vírgula)</Label>
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="colors" 
                  placeholder="Ex: Bege 01, Bege 02" 
                  className="pl-10 h-11 rounded-xl"
                  value={colorsString} 
                  onChange={(e) => setColorsString(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold rounded-lg border-primary/20 text-primary hover:bg-primary/5"
                  onClick={handleAIGenerate}
                  disabled={isGeneratingAI}
                >
                  {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                  Gerar IA
                </Button>
              </div>
              <Textarea id="desc" rows={4} value={formData.description || ''} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} required className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="img" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Imagem</Label>
              <Input id="img" value={formData.imageUrl || ''} onChange={(e) => setFormData(p => ({...p, imageUrl: e.target.value}))} required className="h-11 rounded-xl" />
            </div>

            <div className="flex items-center gap-3 bg-muted/20 p-4 rounded-xl">
              <Switch id="feat" checked={!!formData.isFeatured} onCheckedChange={(v) => setFormData(p => ({...p, isFeatured: v}))} />
              <Label htmlFor="feat" className="text-xs font-medium cursor-pointer">Produto em Destaque na Vitrine</Label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" className="rounded-xl h-12" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 px-8 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">Salvar Produto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
