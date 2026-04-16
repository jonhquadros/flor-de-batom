
"use client"

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Edit, Trash2, Search, Palette, X, ImageIcon, ArrowUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Product, Category, ProductVariation } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AdminProducts() {
  const db = useFirestore();
  const { toast } = useToast();

  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);
  const categoriesQuery = useMemoFirebase(() => collection(db, 'categories'), [db]);

  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: categoriesData } = useCollection<Category>(categoriesQuery);

  const products = React.useMemo(() => {
    const raw = productsData || [];
    return [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [productsData]);

  const categories = categoriesData || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
    isFeatured: false,
    stock: 0,
    isActive: true,
    order: 0,
    variations: []
  });

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
      isActive: true,
      order: 0,
      variations: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir este produto permanentemente em todos os dispositivos?')) {
      const productRef = doc(db, 'products', id);
      deleteDocumentNonBlocking(productRef);
      toast({ title: "Removido do Banco de Dados" });
    }
  };

  const addVariation = () => {
    const currentVars = formData.variations || [];
    setFormData({
      ...formData,
      variations: [...currentVars, { name: '', stock: 0, imageUrl: '' }]
    });
  };

  const removeVariation = (index: number) => {
    const currentVars = formData.variations || [];
    setFormData({
      ...formData,
      variations: currentVars.filter((_, i) => i !== index)
    });
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: string | number) => {
    const currentVars = formData.variations || [];
    const updatedVars = currentVars.map((v, i) => 
      i === index ? { ...v, [field]: value } : v
    );
    
    const totalStock = updatedVars.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    
    setFormData({
      ...formData,
      variations: updatedVars,
      stock: updatedVars.length > 0 ? totalStock : formData.stock
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const id = editingProduct?.id || Math.random().toString(36).substr(2, 9);
    const productData: Product = {
      id,
      name: formData.name || '',
      description: formData.description || '',
      price: Number(formData.price) || 0,
      category: formData.category || '',
      imageUrl: formData.imageUrl || '',
      isFeatured: !!formData.isFeatured,
      isActive: formData.isActive !== false,
      stock: Number(formData.stock) || 0,
      order: Number(formData.order) || 0,
      variations: formData.variations || []
    };

    setDocumentNonBlocking(doc(db, 'products', id), productData, { merge: true });
    setIsModalOpen(false);
    toast({ title: "Sincronizado!", description: "Dados salvos na nuvem." });
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (productsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Sincronizando produtos...</div>;

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Produtos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão global de inventário.</p>
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
                <TableHead className="w-12 text-xs">Ordem</TableHead>
                <TableHead className="w-16 text-xs"></TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Status</TableHead>
                <TableHead className="text-xs">Preço</TableHead>
                <TableHead className="text-right text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum produto cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id} className={`hover:bg-muted/10 ${!product.isActive ? 'opacity-50' : ''}`}>
                    <TableCell>
                      <div className="flex items-center gap-1 font-bold text-xs text-primary">
                        <ArrowUpDown className="h-3 w-3" />
                        {product.order ?? 0}
                      </div>
                    </TableCell>
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
                    <TableCell className="text-xs hidden md:table-cell">
                      {product.isActive ? (
                        <span className="text-green-600 font-bold">Ativo</span>
                      ) : (
                        <span className="text-red-500 font-bold">Desativado</span>
                      )}
                    </TableCell>
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
            <DialogDescription className="text-xs">As mudanças serão salvas em todos os dispositivos.</DialogDescription>
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
                  value={formData.price} 
                  onChange={(e) => setFormData(p => ({...p, price: parseFloat(e.target.value)}))} 
                  required 
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordem de Exibição</Label>
                <Input 
                  id="order" 
                  type="number" 
                  value={formData.order} 
                  onChange={(e) => setFormData(p => ({...p, order: parseInt(e.target.value) || 0}))} 
                  required 
                  className="h-11 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground italic">Menores números aparecem primeiro.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estoque Total</Label>
                <Input 
                  id="stock" 
                  type="number" 
                  value={formData.stock} 
                  readOnly={formData.variations && formData.variations.length > 0}
                  onChange={(e) => setFormData(p => ({...p, stock: parseInt(e.target.value)}))} 
                  required 
                  className="h-11 rounded-xl bg-muted/20"
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/10 rounded-xl">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Variações e Imagens de Cores
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariation} className="h-8 text-[10px] font-bold rounded-lg border-primary/20 text-primary">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Cor
                </Button>
              </div>
              
              {formData.variations?.map((v, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-white rounded-xl shadow-sm border animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-3">
                    <Input 
                      placeholder="Nome da Cor" 
                      value={v.name} 
                      onChange={(e) => updateVariation(i, 'name', e.target.value)}
                      className="flex-1 h-10 rounded-xl"
                    />
                    <Input 
                      type="number" 
                      placeholder="Qtd" 
                      value={v.stock} 
                      onChange={(e) => updateVariation(i, 'stock', parseInt(e.target.value) || 0)}
                      className="w-20 h-10 text-center rounded-xl"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVariation(i)} className="text-destructive h-10 w-10">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-muted rounded-lg overflow-hidden shrink-0 border">
                      {v.imageUrl && <Image src={v.imageUrl} alt="preview" width={36} height={36} className="object-cover" />}
                    </div>
                    <Input 
                      placeholder="URL da Imagem desta cor" 
                      value={v.imageUrl || ''} 
                      onChange={(e) => updateVariation(i, 'imageUrl', e.target.value)}
                      className="flex-1 h-9 text-[10px] rounded-xl border-dashed"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea id="desc" rows={4} value={formData.description || ''} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} required className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="img" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Imagem Principal</Label>
              <Input id="img" value={formData.imageUrl || ''} onChange={(e) => setFormData(p => ({...p, imageUrl: e.target.value}))} required className="h-11 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border">
                <Switch id="feat" checked={!!formData.isFeatured} onCheckedChange={(v) => setFormData(p => ({...p, isFeatured: v}))} />
                <Label htmlFor="feat" className="text-[10px] font-bold uppercase">Destaque</Label>
              </div>
              <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border">
                <Switch id="active" checked={formData.isActive !== false} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} />
                <Label htmlFor="active" className="text-[10px] font-bold uppercase">Ativo</Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" className="rounded-xl h-12" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 px-8 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">Salvar Sincronizado</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
