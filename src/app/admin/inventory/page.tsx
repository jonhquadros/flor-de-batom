
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, AlertTriangle, Plus, Minus, Save, RefreshCcw, Boxes, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Product, ProductVariation } from '@/lib/types';
import { getStoredProducts, saveProducts } from '@/lib/storage-utils';

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const loadData = () => {
    setProducts(getStoredProducts());
  };

  const lowStockProducts = useMemo(() => 
    products.filter(p => p.stock <= 12).sort((a, b) => a.stock - b.stock),
  [products]);

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [products, searchTerm]);

  const handleUpdateStock = (productId: string, newStock: number, variationName?: string) => {
    const updated = products.map(p => {
      if (p.id === productId) {
        if (variationName && p.variations) {
          const updatedVars = p.variations.map(v => 
            v.name === variationName ? { ...v, stock: Math.max(0, newStock) } : v
          );
          const totalStock = updatedVars.reduce((sum, v) => sum + v.stock, 0);
          return { ...p, variations: updatedVars, stock: totalStock };
        } else {
          return { ...p, stock: Math.max(0, newStock) };
        }
      }
      return p;
    });
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

  const toggleExpand = (id: string) => {
    const next = new Set(expandedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedProducts(next);
  };

  const expandAll = () => {
    const allIdsWithVars = products.filter(p => p.variations && p.variations.length > 0).map(p => p.id);
    setExpandedProducts(new Set(allIdsWithVars));
  };

  const collapseAll = () => setExpandedProducts(new Set());

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão de Estoque</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Monitore variações de cor e inventário geral.</p>
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
            <CardTitle className="orange-900 text-lg font-bold">Atenção: Estoque Baixo (≤ 12)</CardTitle>
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

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar produto..." 
            className="pl-10 h-12 text-sm w-full rounded-xl border-none bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={expandAll} className="flex-1 h-12 rounded-xl text-[10px] font-bold">Expandir Cores</Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="flex-1 h-12 rounded-xl text-[10px] font-bold">Recolher</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-16 text-xs"></TableHead>
                <TableHead className="text-xs">Produto / Variação</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-center w-40">Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => {
                const hasVars = product.variations && product.variations.length > 0;
                const isExpanded = expandedProducts.has(product.id);

                return (
                  <React.Fragment key={product.id}>
                    <TableRow className={`hover:bg-muted/10 h-20 transition-colors ${!product.isActive ? 'opacity-40' : ''}`}>
                      <TableCell>
                        {hasVars && (
                          <Button variant="ghost" size="icon" onClick={() => toggleExpand(product.id)} className="h-8 w-8">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
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
                        {hasVars ? (
                          <div className="text-center">
                            <span className="text-xs font-bold text-muted-foreground">{product.stock} un. total</span>
                            <p className="text-[8px] uppercase font-bold text-primary">Ver cores abaixo</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleUpdateStock(product.id, product.stock - 1)}><Minus className="h-3 w-3" /></Button>
                            <Input 
                              type="number" 
                              value={product.stock} 
                              onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center font-bold text-xs rounded-lg"
                            />
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleUpdateStock(product.id, product.stock + 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>

                    {hasVars && isExpanded && product.variations?.map((v, idx) => (
                      <TableRow key={`${product.id}-${v.name}`} className="bg-muted/5 animate-in slide-in-from-left-2 duration-200">
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 pl-4">
                            <span className="text-muted-foreground">↳</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">COR: {v.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {v.stock <= 5 ? (
                            <Badge variant="outline" className="h-4 text-[8px] bg-red-50 border-red-100 text-red-600 font-bold">BAIXO</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleUpdateStock(product.id, v.stock - 1, v.name)}><Minus className="h-2 w-2" /></Button>
                            <Input 
                              type="number" 
                              value={v.stock} 
                              onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0, v.name)}
                              className="w-14 h-7 text-center font-bold text-[10px] rounded-lg"
                            />
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleUpdateStock(product.id, v.stock + 1, v.name)}><Plus className="h-2 w-2" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <Button 
        className="fixed bottom-6 right-6 lg:hidden h-14 w-14 rounded-full shadow-2xl bg-primary z-50 p-0"
        onClick={saveAllChanges}
      >
        <Save className="h-6 w-6" />
      </Button>
    </div>
  );
}
