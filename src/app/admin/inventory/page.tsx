"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, AlertTriangle, Plus, Minus, Save, RefreshCcw, Boxes } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Product } from '@/lib/types';
import { getStoredProducts, saveProducts } from '@/lib/storage-utils';

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const loadData = () => {
    setProducts(getStoredProducts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const lowStockProducts = useMemo(() => 
    products.filter(p => p.stock <= 12).sort((a, b) => a.stock - b.stock),
  [products]);

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [products, searchTerm]);

  const handleUpdateStock = (id: string, newStock: number) => {
    const updated = products.map(p => p.id === id ? { ...p, stock: Math.max(0, newStock) } : p);
    setProducts(updated);
  };

  const saveAllChanges = () => {
    setIsUpdating(true);
    saveProducts(products);
    setTimeout(() => {
      setIsUpdating(false);
      toast({ title: "Estoque Atualizado", description: "As quantidades foram salvas com sucesso." });
    }, 500);
  };

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão de Estoque</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Monitore e atualize seu inventário rapidamente.</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto font-bold rounded-xl h-12 shadow-lg shadow-primary/20" 
          onClick={saveAllChanges}
          disabled={isUpdating}
        >
          {isUpdating ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-none bg-orange-50 border-orange-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900 text-lg font-bold">Atenção: Baixo Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map(p => (
                <Badge key={p.id} variant="outline" className={`bg-white border-orange-200 text-orange-700 py-1 px-3 rounded-full text-[10px] font-bold uppercase`}>
                  {p.name}: {p.stock} un.
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar produto para conferência..." 
            className="pl-10 h-12 text-sm w-full rounded-xl border-none bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
          <Boxes className="h-5 w-5 text-primary" />
          <div className="text-xs">
            <p className="font-bold text-primary">{products.length} Produtos</p>
            <p className="text-muted-foreground">Total em estoque: {products.reduce((acc, p) => acc + p.stock, 0)} unidades</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-16 text-xs"></TableHead>
                <TableHead className="text-xs">Produto</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-center w-40">Quantidade em Mãos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground text-sm italic">
                    Nenhum produto encontrado para o termo pesquisado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id} className="hover:bg-muted/10 h-20 transition-colors">
                    <TableCell>
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted border border-muted-foreground/10">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-[120px]">
                        <span className="font-bold text-xs truncate max-w-[200px] text-primary">{product.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{product.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.stock === 0 ? (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] font-bold">ESGOTADO</Badge>
                      ) : product.stock <= 12 ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] font-bold">CRÍTICO</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] font-bold">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl border-muted-foreground/10 hover:bg-primary/5 hover:text-primary"
                          onClick={() => handleUpdateStock(product.id, product.stock - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input 
                          type="number"
                          value={product.stock}
                          onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0)}
                          className="w-16 h-9 text-center font-bold text-xs rounded-xl border-muted-foreground/10"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl border-muted-foreground/10 hover:bg-primary/5 hover:text-primary"
                          onClick={() => handleUpdateStock(product.id, product.stock + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl">
            <Save className="h-5 w-5 text-white" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-primary uppercase tracking-widest">Ação Necessária</p>
            <p className="text-muted-foreground">Após conferir os produtos fisicamente, clique em salvar para confirmar o novo estoque.</p>
          </div>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 px-10 h-12 rounded-xl font-bold w-full sm:w-auto"
          onClick={saveAllChanges}
          disabled={isUpdating}
        >
          {isUpdating ? "Salvando..." : "Confirmar Estoque"}
        </Button>
      </div>
    </div>
  );
}