
"use client"

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Search, 
  CheckCircle2, 
  Package, 
  Truck, 
  Clock, 
  Eye, 
  MessageCircle, 
  Save, 
  Trash2, 
  Plus, 
  Minus, 
  XCircle, 
  User, 
  Phone, 
  MapPin,
  ShoppingBag,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus, Product } from '@/lib/types';
import { updateOrderStatus, updateOrder } from '@/lib/storage-utils';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function AdminOrders() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'products');
  }, [db, user]);

  const { data: ordersData, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: productsData } = useCollection<Product>(productsQuery);

  const orders = ordersData || [];
  const allProducts = productsData || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{id: string, status: OrderStatus} | null>(null);

  const filteredOrders = useMemo(() => orders.filter(o => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = o.customerName?.toLowerCase().includes(term) || (o.orderNumber && String(o.orderNumber).includes(term));
    const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, searchTerm, statusFilter]);

  const availableProductsToAdd = useMemo(() => {
    if (!productSearch) return [];
    return allProducts.filter(p => 
      p.isActive !== false && 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 5);
  }, [allProducts, productSearch]);

  const openDetails = (order: Order) => {
    setSelectedOrder({ ...order });
    setIsDetailsOpen(true);
    setIsAddingProduct(false);
    setProductSearch('');
  };

  const handleUpdateCustomerInfo = (field: keyof Order, value: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;
    setSelectedOrder({ ...selectedOrder, [field]: value });
  };

  const handleUpdateItemQuantity = (id: string, delta: number, color?: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;
    const updatedItems = selectedOrder.items.map(item => {
      const matchId = item.id === id;
      const matchColor = color ? item.selectedColor === color : true;
      if (matchId && matchColor) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });

    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleRemoveItem = (id: string, color?: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;
    const updatedItems = selectedOrder.items.filter(item => {
      const matchId = item.id === id;
      const matchColor = color ? item.selectedColor === color : true;
      return !(matchId && matchColor);
    });
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleAddNewProduct = (p: Product, variationName?: string) => {
    if (!selectedOrder) return;
    
    const color = variationName || (p.variations && p.variations.length > 0 ? p.variations[0].name : '');
    const variation = p.variations?.find(v => v.name === color);
    const imageUrl = variation?.imageUrl || p.imageUrl;

    const existingItem = selectedOrder.items.find(i => i.id === p.id && i.selectedColor === color);
    let updatedItems = [...selectedOrder.items];

    if (existingItem) {
      updatedItems = updatedItems.map(i => (i.id === p.id && i.selectedColor === color) ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      updatedItems.push({
        ...p,
        imageUrl,
        quantity: 1,
        selectedColor: color
      } as any);
    }

    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
    setIsAddingProduct(false);
    setProductSearch('');
    toast({ title: "Item adicionado" });
  };

  const saveOrderChanges = () => {
    if (!selectedOrder || !db) return;
    updateOrder(db, selectedOrder);
    setIsDetailsOpen(false);
    toast({ title: "Pedido atualizado com sucesso!" });
  };

  const initiateStatusChange = (id: string, status: OrderStatus) => {
    setStatusToUpdate({ id, status });
    setIsStatusConfirmOpen(true);
  };

  const handleStatusChangeExecution = (sendNotification: boolean) => {
    if (!statusToUpdate) return;
    const { id, status } = statusToUpdate;
    const order = orders.find(o => o.id === id);
    
    if (db && order) {
      updateOrderStatus(db, order, status);
    }
    
    setIsStatusConfirmOpen(false);
    setStatusToUpdate(null);
    if (selectedOrder && selectedOrder.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    toast({ title: "Status Atualizado" });
  };

  const resendToWhatsApp = () => {
    if (!selectedOrder) return;
    const rawPhone = selectedOrder.customerPhone.replace(/\D/g, '');
    const finalPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    
    const listaProdutos = selectedOrder.items.map(i => {
      const cor = i.selectedColor ? ` [${i.selectedColor}]` : '';
      return `• ${i.name}${cor} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2)}`;
    }).join('\n');

    const msg = encodeURIComponent(
      `🌸 *DETALHES DO PEDIDO #${selectedOrder.orderNumber}*\n\n` +
      `👤 *Cliente:* ${selectedOrder.customerName}\n` +
      `📍 *Endereço:* ${selectedOrder.customerAddress}\n\n` +
      `🛍️ *PRODUTOS:*\n${listaProdutos}\n\n` +
      `💰 *TOTAL: R$ ${selectedOrder.total.toFixed(2)}*`
    );
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[9px]"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Pago': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[9px]"><Package className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Entregue': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[9px]"><CheckCircle2 className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Cancelado': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[9px]"><XCircle className="h-3 w-3 mr-1" /> {status}</Badge>;
      default: return <Badge className="text-[9px]">{status}</Badge>;
    }
  };

  if (isOrdersLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Sincronizando pedidos...</div>;

  return (
    <div className="space-y-6 font-poppins pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão unificada de vendas e entregas.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por nome ou nº do pedido..." className="pl-10 h-12 text-sm rounded-xl border-none bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 text-sm rounded-xl border-none bg-white shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos Status</SelectItem>
              {['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[10px] uppercase font-bold px-4">Pedido</TableHead>
                <TableHead className="text-[10px] uppercase font-bold px-2">Data</TableHead>
                <TableHead className="text-[10px] uppercase font-bold px-2">Cliente</TableHead>
                <TableHead className="text-[10px] uppercase font-bold px-2">Total</TableHead>
                <TableHead className="text-[10px] uppercase font-bold px-2">Status</TableHead>
                <TableHead className="text-right px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">Nenhum pedido encontrado.</TableCell></TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/10 h-16 md:h-20">
                    <TableCell className="font-bold text-[10px] md:text-xs text-primary px-4">
                      #{order.orderNumber || order.id.substr(0,6)}
                    </TableCell>
                    <TableCell className="px-2">
                      <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="px-2">
                      <span className="font-bold text-[10px] md:text-xs truncate max-w-[80px] md:max-w-[150px] inline-block">{order.customerName}</span>
                    </TableCell>
                    <TableCell className="font-bold text-primary text-[10px] md:text-xs px-2">
                      R$ {(order.total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-2">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right px-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => openDetails(order)}>
                        <Eye className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95%] max-w-3xl max-h-[95vh] overflow-y-auto font-poppins rounded-[2.5rem] p-0 border-none shadow-2xl">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b flex items-center justify-between">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-xl md:text-2xl font-semibold font-poppins text-primary">Pedido #{selectedOrder?.orderNumber || selectedOrder?.id.substr(0,6)}</DialogTitle>
            </DialogHeader>
          </div>
          
          {selectedOrder && (
            <div className="p-4 md:p-8 space-y-8">
              {/* 1. Informações do Cliente e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-muted/20 p-4 md:p-6 rounded-[2rem]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <User className="h-3 w-3" /> Dados do Cliente
                  </div>
                  {selectedOrder.status === 'Pendente' ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold ml-1 opacity-50">Nome Completo</Label>
                        <Input className="h-10 rounded-xl bg-white border-none shadow-sm text-sm" value={selectedOrder.customerName} onChange={e => handleUpdateCustomerInfo('customerName', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold ml-1 opacity-50">WhatsApp</Label>
                        <Input className="h-10 rounded-xl bg-white border-none shadow-sm text-sm" value={selectedOrder.customerPhone} onChange={e => handleUpdateCustomerInfo('customerPhone', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-primary/5">
                      <p className="font-bold text-base text-primary">{selectedOrder.customerName}</p>
                      <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {selectedOrder.customerPhone}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <Clock className="h-3 w-3" /> Status e Pagamento
                  </div>
                  <div className="space-y-3">
                    <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-none shadow-sm font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    {selectedOrder.status === 'Pendente' ? (
                      <Select value={selectedOrder.paymentMethod} onValueChange={(v: any) => handleUpdateCustomerInfo('paymentMethod', v)}>
                        <SelectTrigger className="h-11 rounded-xl bg-white border-none shadow-sm font-bold text-[10px] uppercase tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Pix">Pix</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                          <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="bg-white h-11 px-4 rounded-xl flex items-center justify-between border border-primary/5 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Forma:</span>
                        <span className="text-[10px] font-black text-primary uppercase">{selectedOrder.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <MapPin className="h-3 w-3" /> Endereço de Entrega
                  </div>
                  {selectedOrder.status === 'Pendente' ? (
                    <Textarea 
                      className="min-h-[100px] rounded-2xl bg-white border-none shadow-sm resize-none text-sm p-4" 
                      value={selectedOrder.customerAddress} 
                      onChange={e => handleUpdateCustomerInfo('customerAddress', e.target.value)}
                    />
                  ) : (
                    <div className="bg-white p-4 rounded-2xl border border-primary/5 shadow-sm text-sm">
                      {selectedOrder.customerAddress || 'Não informado'}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Lista Visual de Produtos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <ShoppingBag className="h-3 w-3" /> Produtos no Pedido
                  </div>
                  {selectedOrder.status === 'Pendente' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs font-bold text-primary hover:bg-primary/5 rounded-lg h-8"
                      onClick={() => setIsAddingProduct(!isAddingProduct)}
                    >
                      {isAddingProduct ? 'Fechar' : <><PlusCircle className="h-3.5 w-3.5 mr-1" /> Adicionar Item</>}
                    </Button>
                  )}
                </div>

                {isAddingProduct && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                      <Input 
                        placeholder="Buscar produto para adicionar..." 
                        className="pl-10 h-11 bg-white border-none rounded-xl text-sm"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                    {availableProductsToAdd.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {availableProductsToAdd.map(p => (
                          <div key={p.id} className="bg-white p-2.5 rounded-xl flex items-center justify-between border border-primary/5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 relative rounded-lg overflow-hidden border bg-muted">
                                <Image src={p.imageUrl} alt="" fill className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate max-w-[150px]">{p.name}</p>
                                <p className="text-[10px] text-primary font-semibold">R$ {p.price.toFixed(2)}</p>
                              </div>
                            </div>
                            <Button size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase" onClick={() => handleAddNewProduct(p)}>Adicionar</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-[2rem] border border-primary/5 shadow-sm overflow-hidden">
                  <ScrollArea className="max-h-[300px]">
                    <div className="divide-y divide-primary/5">
                      {selectedOrder.items.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground italic text-xs">Este pedido está vazio.</div>
                      ) : (
                        selectedOrder.items.map((item, idx) => (
                          <div key={`${item.id}-${item.selectedColor || idx}`} className="p-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="relative h-14 w-14 rounded-2xl overflow-hidden border bg-muted shrink-0 shadow-sm">
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-primary leading-tight truncate max-w-[150px] md:max-w-[250px]">{item.name}</h4>
                                {item.selectedColor && (
                                  <span className="inline-block mt-1 bg-primary/5 text-primary text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-primary/10">
                                    Cor: {item.selectedColor}
                                  </span>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <p className="text-xs font-black text-primary">R$ {item.price.toFixed(2)}</p>
                                  <div className="flex items-center gap-3">
                                    {selectedOrder.status === 'Pendente' ? (
                                      <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
                                        <button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)} className="h-6 w-6 flex items-center justify-center text-primary hover:bg-white rounded-md"><Minus className="h-3 w-3" /></button>
                                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                        <button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)} className="h-6 w-6 flex items-center justify-center text-primary hover:bg-white rounded-md"><Plus className="h-3 w-3" /></button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qtd: {item.quantity}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <p className="font-bold text-sm text-primary">R$ {(item.price * item.quantity).toFixed(2)}</p>
                              {selectedOrder.status === 'Pendente' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveItem(item.id, item.selectedColor)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* 3. Footer com Total e Ações */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-primary p-6 md:p-8 rounded-[2.5rem] text-white shadow-2xl">
                <div className="text-center md:text-left">
                  <span className="font-black uppercase text-[10px] tracking-[0.3em] opacity-60">Valor Total do Pedido</span>
                  <p className="text-4xl md:text-5xl font-bold mt-1 tracking-tighter">R$ {(selectedOrder.total || 0).toFixed(2)}</p>
                </div>
                {selectedOrder.status === 'Pendente' ? (
                  <Button className="w-full md:w-auto h-14 md:h-16 px-10 rounded-2xl bg-white text-primary hover:bg-white/90 text-sm font-black uppercase tracking-widest shadow-xl transition-transform active:scale-95" onClick={saveOrderChanges}>
                    <Save className="h-5 w-5 mr-2" /> Salvar Alterações
                  </Button>
                ) : (
                  <Button className="w-full md:w-auto h-14 md:h-16 px-10 rounded-2xl bg-green-500 hover:bg-green-600 text-white text-sm font-black uppercase tracking-widest shadow-xl flex gap-3" onClick={resendToWhatsApp}>
                    <MessageCircle className="h-6 w-6" /> Reenviar via WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Mudança de Status */}
      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] w-[90%] max-w-md border-none p-8 font-poppins">
          <AlertDialogHeader>
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
              <RefreshCw className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-primary text-center">Alterar status do pedido?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground text-center">Isso pode atualizar automaticamente o estoque dos produtos envolvidos.</p>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row mt-6">
            <AlertDialogCancel className="rounded-xl h-12 border-none bg-muted/50 font-bold flex-1" onClick={() => setIsStatusConfirmOpen(false)}>Voltar</AlertDialogCancel>
            <div className="flex gap-2 flex-[2]">
              <Button variant="outline" className="flex-1 rounded-xl h-12 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary" onClick={() => handleStatusChangeExecution(false)}>Apenas Alterar</Button>
              <AlertDialogAction className="flex-1 rounded-xl h-12 text-[9px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90" onClick={() => handleStatusChangeExecution(true)}>Confirmar</AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Icone adicional para o alerta
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
