
"use client"

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Search, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Boxes, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Package
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Product } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

export default function AdminInventory() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'products');
  }, [db, user]);

  const { data: productsData, isLoading } = useCollection<Product>(productsQuery);
  
  const products = useMemo(() => {
    const raw = productsData || [];
    return [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [productsData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'low' | 'out'>('all');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Performance: Contadores memoizados
  const stats = useMemo(() => {
    return {
      total: products.length,
      ok: products.filter(p => p.stock > 5).length,
      low: products.filter(p => p.stock >= 1 && p.stock <= 5).length,
      out: products.filter(p => p.stock === 0).length,
    };
  }, [products]);

  // Performance: Filtro combinado memoizado
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'ok' && p.stock > 5) ||
        (statusFilter === 'low' && p.stock >= 1 && p.stock <= 5) ||
        (statusFilter === 'out' && p.stock === 0);
      
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const handleUpdateStock = (productId: string, newStock: number, variationName?: string) => {
    if (!db) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const stockValue = Math.max(0, newStock);
    const productRef = doc(db, 'products', productId);

    if (variationName && product.variations) {
      const updatedVars = product.variations.map(v => 
        v.name === variationName ? { ...v, stock: stockValue } : v
      );
      const totalStock = updatedVars.reduce((sum, v) => sum + v.stock, 0);
      updateDocumentNonBlocking(productRef, { variations: updatedVars, stock: totalStock });
    } else {
      updateDocumentNonBlocking(productRef, { stock: stockValue });
    }
    
    toast({ title: "Estoque Atualizado" });
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedProducts(next);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Sincronizando estoque...</div>;

  return (
    <div className="space-y-6 font-poppins pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Gestão de Estoque</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Controle preciso de variações e níveis de reposição.</p>
      </div>

      {/* 1. CARDS DE RESUMO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
            <div className="space-y-0.5">
              <h3 className="text-xl font-semibold font-poppins text-foreground">{stats.total}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Produtos</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div className="space-y-0.5">
              <h3 className="text-xl font-semibold font-poppins text-green-600">{stats.ok}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Estoque OK</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-yellow-100"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
            <div className="space-y-0.5">
              <h3 className="text-xl font-semibold font-poppins text-yellow-600">{stats.low}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Estoque Baixo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-red-100"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div className="space-y-0.5">
              <h3 className="text-xl font-semibold font-poppins text-red-600">{stats.out}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Esgotado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. FILTROS E BUSCA */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou categoria..." 
              className="pl-10 h-12 text-sm w-full rounded-xl border-none bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="rounded-xl h-10 px-4 text-[10px] font-bold uppercase"
            >
              Todos
            </Button>
            <Button 
              variant={statusFilter === 'ok' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ok')}
              className="rounded-xl h-10 px-4 text-[10px] font-bold uppercase border-green-200 text-green-700 hover:bg-green-50"
            >
              ✅ OK
            </Button>
            <Button 
              variant={statusFilter === 'low' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('low')}
              className="rounded-xl h-10 px-4 text-[10px] font-bold uppercase border-yellow-200 text-yellow-700 hover:bg-yellow-50"
            >
              🟡 Baixo
            </Button>
            <Button 
              variant={statusFilter === 'out' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('out')}
              className="rounded-xl h-10 px-4 text-[10px] font-bold uppercase border-red-200 text-red-700 hover:bg-red-50"
            >
              🔴 Esgotado
            </Button>
          </div>
        </div>
      </div>

      {/* 3. TABELA COM DESTAQUE VISUAL */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-16 text-xs"></TableHead>
                <TableHead className="w-12 text-xs">Ordem</TableHead>
                <TableHead className="text-xs">Produto / Categoria</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-center w-40">Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                    Nenhum produto encontrado com estes filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(product => {
                  const hasVars = product.variations && product.variations.length > 0;
                  const isExpanded = expandedProducts.has(product.id);
                  const isOut = product.stock === 0;
                  const isLow = product.stock >= 1 && product.stock <= 5;

                  return (
                    <React.Fragment key={product.id}>
                      <TableRow className={cn(
                        "hover:bg-muted/10 h-20 transition-colors border-l-4",
                        isOut ? "bg-red-50/50 border-l-red-500 text-red-900" : 
                        isLow ? "bg-yellow-50/50 border-l-yellow-500" : 
                        "border-l-transparent"
                      )}>
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
                          <span className="font-bold text-[10px] text-primary">{product.order ?? 0}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col min-w-[120px]">
                            <span className="font-bold text-xs truncate max-w-[200px] text-primary">{product.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{product.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isOut ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[9px] font-bold">ESGOTADO</Badge>
                          ) : isLow ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[9px] font-bold">BAIXO</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[9px] font-bold">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasVars ? (
                            <div className="text-center">
                              <span className="text-xs font-bold text-muted-foreground">{product.stock} un. total</span>
                              <p className="text-[8px] uppercase font-bold text-primary">Ver variações</p>
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

                      {hasVars && isExpanded && product.variations?.map((v) => {
                        const vOut = v.stock === 0;
                        const vLow = v.stock >= 1 && v.stock <= 5;
                        
                        return (
                          <TableRow key={`${product.id}-${v.name}`} className={cn(
                            "bg-muted/5 animate-in slide-in-from-left-2 duration-200",
                            vOut ? "bg-red-50/30" : vLow ? "bg-yellow-50/30" : ""
                          )}>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 pl-4">
                                <span className="text-muted-foreground opacity-30">↳</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">COR: {v.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {vOut ? (
                                <Badge variant="outline" className="h-4 text-[8px] bg-red-50 border-red-100 text-red-600 font-bold uppercase">Zerado</Badge>
                              ) : vLow ? (
                                <Badge variant="outline" className="h-4 text-[8px] bg-yellow-50 border-yellow-100 text-yellow-600 font-bold uppercase">Baixo</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleUpdateStock(product.id, v.stock - 1, v.name)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted"><Minus className="h-2 w-2" /></button>
                                <Input 
                                  type="number" 
                                  value={v.stock} 
                                  onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0, v.name)}
                                  className="w-14 h-7 text-center font-bold text-[10px] rounded-lg"
                                />
                                <button onClick={() => handleUpdateStock(product.id, v.stock + 1, v.name)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted"><Plus className="h-2 w-2" /></button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
