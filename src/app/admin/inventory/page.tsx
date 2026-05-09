
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
  Package,
  History,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Product, StockMovement, StockMovementType } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { recordStockMovement } from '@/lib/storage-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminInventory() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Queries
  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'products');
  }, [db, user]);

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'stockMovements'), orderBy('createdAt', 'desc'), limit(50));
  }, [db, user]);

  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: movementsData, isLoading: movementsLoading } = useCollection<StockMovement>(movementsQuery);
  
  const products = useMemo(() => {
    const raw = productsData || [];
    return [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [productsData]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'low' | 'out'>('all');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Write-off Modal States
  const [isWriteOffOpen, setIsWriteOffOpen] = useState(false);
  const [selectedItemForWriteOff, setSelectedItemForWriteOff] = useState<{product: Product, variationName?: string} | null>(null);
  const [writeOffQty, setWriteOffQty] = useState('1');
  const [writeOffReason, setWriteOffReason] = useState<StockMovementType>('Breakage');

  // Stats
  const stats = useMemo(() => {
    return {
      total: products.length,
      ok: products.filter(p => p.stock > 5).length,
      low: products.filter(p => p.stock >= 1 && p.stock <= 5).length,
      out: products.filter(p => p.stock === 0).length,
    };
  }, [products]);

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

  const handleUpdateStock = (productId: string, newStock: number, variationName?: string, isWriteOff = false, type: StockMovementType = 'Adjustment') => {
    if (!db) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const stockValue = Math.max(0, newStock);
    const productRef = doc(db, 'products', productId);
    const diff = stockValue - (variationName ? (product.variations?.find(v => v.name === variationName)?.stock || 0) : product.stock);

    if (diff === 0) return;

    if (variationName && product.variations) {
      const updatedVars = product.variations.map(v => 
        v.name === variationName ? { ...v, stock: stockValue } : v
      );
      const totalStock = updatedVars.reduce((sum, v) => sum + v.stock, 0);
      updateDocumentNonBlocking(productRef, { variations: updatedVars, stock: totalStock, updatedAt: serverTimestamp() });
    } else {
      updateDocumentNonBlocking(productRef, { stock: stockValue, updatedAt: serverTimestamp() });
    }

    // Record Movement
    recordStockMovement(db, {
      productId,
      productName: product.name,
      variationName,
      quantity: diff,
      type: isWriteOff ? type : (diff > 0 ? 'Addition' : 'Adjustment'),
      reason: isWriteOff ? `Baixa manual: ${type}` : 'Ajuste rápido de inventário'
    });
    
    toast({ title: diff > 0 ? "Estoque Adicionado" : "Baixa Realizada" });
  };

  const openWriteOff = (product: Product, variationName?: string) => {
    setSelectedItemForWriteOff({ product, variationName });
    setWriteOffQty('1');
    setWriteOffReason('Breakage');
    setIsWriteOffOpen(true);
  };

  const confirmWriteOff = () => {
    if (!selectedItemForWriteOff || !db) return;
    const { product, variationName } = selectedItemForWriteOff;
    const currentStock = variationName 
      ? (product.variations?.find(v => v.name === variationName)?.stock || 0)
      : product.stock;
    
    const qty = parseInt(writeOffQty) || 0;
    if (qty > currentStock) {
      toast({ variant: "destructive", title: "Erro", description: "Quantidade maior que o estoque disponível." });
      return;
    }

    handleUpdateStock(product.id, currentStock - qty, variationName, true, writeOffReason);
    setIsWriteOffOpen(false);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedProducts(next);
  };

  const getMovementIcon = (type: StockMovementType) => {
    switch (type) {
      case 'Addition': return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'Sale': return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
      case 'Loss':
      case 'Breakage': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'Donation': return <History className="h-4 w-4 text-purple-500" />;
      default: return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMovementLabel = (type: StockMovementType) => {
    switch (type) {
      case 'Addition': return 'Adição';
      case 'Sale': return 'Venda';
      case 'Loss': return 'Perda';
      case 'Breakage': return 'Quebra';
      case 'Donation': return 'Doação';
      case 'Adjustment': return 'Ajuste';
      default: return type;
    }
  };

  if (productsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Sincronizando estoque...</div>;

  return (
    <div className="space-y-6 font-poppins pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Gestão de Estoque</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Controle preciso de variações e níveis de reposição.</p>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md rounded-xl h-12 bg-white shadow-sm border mb-6">
          <TabsTrigger value="inventory" className="rounded-lg font-bold text-xs uppercase tracking-wider">Estoque Atual</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-bold text-xs uppercase tracking-wider">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
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
              {['all', 'ok', 'low', 'out'].map((f) => (
                <Button 
                  key={f}
                  variant={statusFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(f as any)}
                  className={cn(
                    "rounded-xl h-10 px-4 text-[10px] font-bold uppercase",
                    f === 'ok' && "border-green-200 text-green-700 hover:bg-green-50",
                    f === 'low' && "border-yellow-200 text-yellow-700 hover:bg-yellow-50",
                    f === 'out' && "border-red-200 text-red-700 hover:bg-red-50"
                  )}
                >
                  {f === 'all' ? 'Todos' : f === 'ok' ? '✅ OK' : f === 'low' ? '🟡 Baixo' : '🔴 Esgotado'}
                </Button>
              ))}
            </div>
          </div>

          {/* 3. TABELA */}
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
                    <TableHead className="text-xs text-center w-48">Estoque / Baixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                        Nenhum produto encontrado.
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
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[9px] font-bold uppercase">Esgotado</Badge>
                              ) : isLow ? (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[9px] font-bold uppercase">Baixo</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[9px] font-bold uppercase">OK</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                {!hasVars ? (
                                  <>
                                    <div className="flex items-center gap-1.5 border rounded-xl p-1.5 bg-muted/20">
                                      <button onClick={() => handleUpdateStock(product.id, product.stock - 1)} className="p-1 hover:bg-white rounded-lg"><Minus className="h-3 w-3" /></button>
                                      <span className="w-8 text-center font-bold text-xs">{product.stock}</span>
                                      <button onClick={() => handleUpdateStock(product.id, product.stock + 1)} className="p-1 hover:bg-white rounded-lg"><Plus className="h-3 w-3" /></button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-red-50 rounded-xl" onClick={() => openWriteOff(product)}>
                                      <ArrowDownCircle className="h-5 w-5" />
                                    </Button>
                                  </>
                                ) : (
                                  <div className="text-center">
                                    <span className="text-xs font-bold text-muted-foreground">{product.stock} un. total</span>
                                    <p className="text-[8px] uppercase font-bold text-primary">Ver variações</p>
                                  </div>
                                )}
                              </div>
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
                                <TableCell colSpan={3}></TableCell>
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
                                    <div className="flex items-center gap-1 border rounded-xl p-1 bg-white">
                                      <button onClick={() => handleUpdateStock(product.id, v.stock - 1, v.name)} className="p-1 hover:bg-muted rounded-lg"><Minus className="h-2 w-2" /></button>
                                      <span className="w-8 text-center font-bold text-[10px]">{v.stock}</span>
                                      <button onClick={() => handleUpdateStock(product.id, v.stock + 1, v.name)} className="p-1 hover:bg-muted rounded-lg"><Plus className="h-2 w-2" /></button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50 rounded-xl" onClick={() => openWriteOff(product, v.name)}>
                                      <ArrowDownCircle className="h-4 w-4" />
                                    </Button>
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
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-center">Qtd</TableHead>
                    <TableHead className="text-xs text-center">Tipo</TableHead>
                    <TableHead className="text-xs">Motivo / Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 animate-pulse">Carregando histórico...</TableCell></TableRow>
                  ) : movementsData?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Nenhuma movimentação registrada ainda.</TableCell></TableRow>
                  ) : (
                    movementsData?.map(mov => (
                      <TableRow key={mov.id} className="hover:bg-muted/10 h-16">
                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {mov.createdAt ? format(new Date(mov.createdAt), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-primary">{mov.productName}</span>
                            {mov.variationName && <span className="text-[9px] text-muted-foreground uppercase">Cor: {mov.variationName}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "font-bold text-xs",
                            mov.quantity > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getMovementIcon(mov.type)}
                            <span className="text-[9px] font-bold uppercase text-muted-foreground">{getMovementLabel(mov.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-[10px] text-muted-foreground max-w-xs">{mov.reason || '-'}</p>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Write-off Dialog */}
      <Dialog open={isWriteOffOpen} onOpenChange={setIsWriteOffOpen}>
        <DialogContent className="w-[90%] max-w-md font-poppins rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Registrar Baixa de Estoque</DialogTitle>
            <DialogDescription className="text-xs">Reduzir o estoque por motivos de perda ou doação.</DialogDescription>
          </DialogHeader>
          
          {selectedItemForWriteOff && (
            <div className="space-y-6 pt-4">
              <div className="p-4 bg-muted/10 rounded-2xl border flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border bg-white">
                  <Image src={selectedItemForWriteOff.product.imageUrl} alt="" fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-primary truncate">{selectedItemForWriteOff.product.name}</p>
                  {selectedItemForWriteOff.variationName && <p className="text-[10px] font-bold text-muted-foreground uppercase">COR: {selectedItemForWriteOff.variationName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Quantidade</Label>
                  <Input 
                    type="number" 
                    value={writeOffQty} 
                    onChange={(e) => setWriteOffQty(e.target.value)} 
                    className="h-12 rounded-xl text-center font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Motivo</Label>
                  <Select value={writeOffReason} onValueChange={(v: any) => setWriteOffReason(v)}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Breakage">Quebra</SelectItem>
                      <SelectItem value="Loss">Perda / Extravio</SelectItem>
                      <SelectItem value="Donation">Doação</SelectItem>
                      <SelectItem value="Adjustment">Ajuste de Saldo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="ghost" className="rounded-xl h-12" onClick={() => setIsWriteOffOpen(false)}>Cancelar</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 font-bold px-8" onClick={confirmWriteOff}>Confirmar Baixa</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
