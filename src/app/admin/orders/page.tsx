"use client"

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, CheckCircle2, Package, Truck, Clock, Eye, MessageCircle, Save, Trash2, Plus, Minus, XCircle, ChevronLeft, User, Phone, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    const lista = selectedOrder.items.map(i => `• ${i.name}${i.selectedColor ? ` [${i.selectedColor}]` : ''} x${i.quantity}`).join('\n');
    const msg = encodeURIComponent(`🌸 *DETALHES DO PEDIDO #${selectedOrder.orderNumber}*\n\n👤 *Cliente:* ${selectedOrder.customerName}\n🛍️ *PRODUTOS:*\n${lista}\n\n💰 *TOTAL: R$ ${selectedOrder.total.toFixed(2)}*\n💳 *Pagamento:* ${selectedOrder.paymentMethod}`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[9px] py-0"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Pago': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[9px] py-0"><Package className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Enviado': return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[9px] py-0"><Truck className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Entregue': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[9px] py-0"><CheckCircle2 className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Cancelado': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[9px] py-0"><XCircle className="h-3 w-3 mr-1" /> {status}</Badge>;
      default: return <Badge className="text-[9px]">{status}</Badge>;
    }
  };

  if (isOrdersLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Sincronizando pedidos...</div>;

  return (
    <div className="space-y-6 font-poppins pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pedidos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão unificada de vendas e presentes.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar cliente ou número..." className="pl-10 h-12 text-sm rounded-xl border-none bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                <TableHead className="text-[10px] uppercase font-bold px-2">Cliente</TableHead>
                <TableHead className="text-[10px] uppercase font-bold px-2">Total</TableHead>
                <TableHead className="text-[10px] uppercase font-bold px-2">Status</TableHead>
                <TableHead className="text-right px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">Nenhum pedido encontrado.</TableCell></TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/10 h-16 md:h-20">
                    <TableCell className="font-bold text-[10px] md:text-xs text-primary px-4">
                      #{order.orderNumber || order.id.substr(0,6)}
                    </TableCell>
                    <TableCell className="px-2">
                      <span className="font-bold text-[10px] md:text-xs truncate max-w-[80px] md:max-w-[150px] inline-block">{order.customerName}</span>
                    </TableCell>
                    <TableCell className="font-bold text-primary text-[10px] md:text-xs px-2">
                      R${(order.total || 0).toFixed(2)}
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

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] w-[90%] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Deseja alterar o status?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="rounded-xl h-11" onClick={() => setIsStatusConfirmOpen(false)}>Voltar</AlertDialogCancel>
            <div className="flex gap-2 flex-1">
              <Button variant="outline" className="flex-1 rounded-xl h-11 text-[10px] font-bold" onClick={() => handleStatusChangeExecution(false)}>Apenas Alterar</Button>
              <AlertDialogAction className="flex-1 rounded-xl h-11 text-[10px] font-bold" onClick={() => handleStatusChangeExecution(true)}>Alterar e Notificar</AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[95vh] overflow-y-auto font-poppins rounded-[1.5rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b flex items-center justify-between">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-xl md:text-2xl font-semibold font-poppins text-primary">Pedido #{selectedOrder?.orderNumber || selectedOrder?.id.substr(0,6)}</DialogTitle>
            </DialogHeader>
          </div>
          
          {selectedOrder && (
            <div className="p-4 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-muted/20 p-4 md:p-6 rounded-2xl md:rounded-[2rem]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <User className="h-3 w-3" /> Cliente
                  </div>
                  {selectedOrder.status === 'Pendente' ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold ml-1 opacity-50">Nome</Label>
                        <Input className="h-10 rounded-xl bg-white border-none shadow-sm text-sm" value={selectedOrder.customerName} onChange={e => handleUpdateCustomerInfo('customerName', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold ml-1 opacity-50">WhatsApp</Label>
                        <Input className="h-10 rounded-xl bg-white border-none shadow-sm text-sm" value={selectedOrder.customerPhone} onChange={e => handleUpdateCustomerInfo('customerPhone', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-primary/5">
                      <p className="font-bold text-sm text-primary">{selectedOrder.customerName}</p>
                      <p className="text-muted-foreground text-xs mt-1">{selectedOrder.customerPhone}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <Clock className="h-3 w-3" /> Status & Pagamento
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
                      <Badge variant="outline" className="w-full justify-center h-11 rounded-xl border-dashed border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest">
                        {selectedOrder.paymentMethod}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-60">
                    <MapPin className="h-3 w-3" /> Endereço
                  </div>
                  {selectedOrder.status === 'Pendente' ? (
                    <Textarea 
                      className="min-h-[100px] rounded-2xl bg-white border-none shadow-sm resize-none text-sm p-4" 
                      value={selectedOrder.customerAddress} 
                      onChange={e => handleUpdateCustomerInfo('customerAddress', e.target.value)}
                      placeholder="Preencha o endereço completo..."
                    />
                  ) : (
                    <p className="bg-white p-4 rounded-2xl border border-primary/5 text-sm leading-relaxed text-muted-foreground">{selectedOrder.customerAddress || 'Endereço não informado'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] font-black uppercase text-primary/60 tracking-[0.2em]">Itens no Pedido</Label>
                  {selectedOrder.status === 'Pendente' && (
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary h-8 hover:bg-primary/5 rounded-full px-4" onClick={() => setIsAddingProduct(!isAddingProduct)}>
                      {isAddingProduct ? '- Fechar' : '+ Adicionar'}
                    </Button>
                  )}
                </div>

                {isAddingProduct && (
                  <div className="space-y-3 p-4 bg-primary/5 rounded-[1.5rem] animate-in slide-in-from-top-2 duration-300 border border-primary/10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                      <Input placeholder="Buscar por nome do produto..." className="pl-9 h-11 rounded-xl border-none bg-white shadow-sm text-xs" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      {availableProductsToAdd.map(p => {
                        const hasVars = p.variations && p.variations.length > 0;
                        return (
                          <div key={p.id} className="flex flex-col p-3 bg-white rounded-xl shadow-sm border border-primary/5 gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden relative shrink-0">
                                  <Image src={p.imageUrl} alt="" fill className="object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-primary uppercase truncate max-w-[120px] md:max-w-[200px] block">{p.name}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase">{p.category}</span>
                                </div>
                              </div>
                              {!hasVars && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary hover:text-white" onClick={() => handleAddNewProduct(p)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {hasVars && (
                              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-dashed">
                                {p.variations!.map(v => (
                                  <button
                                    key={v.name}
                                    onClick={() => handleAddNewProduct(p, v.name)}
                                    className="px-3 py-1.5 rounded-lg bg-primary/5 text-[8px] font-black uppercase text-primary border border-primary/10 hover:bg-primary hover:text-white transition-all"
                                  >
                                    + {v.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {productSearch && availableProductsToAdd.length === 0 && <p className="text-center text-[9px] text-muted-foreground uppercase py-4 font-bold">Nenhum produto encontrado</p>}
                    </div>
                  </div>
                )}

                <div className="border rounded-[1.5rem] md:rounded-[2rem] divide-y bg-white overflow-hidden shadow-sm">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={(item.id || idx) + (item.selectedColor || '')} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden relative shrink-0 border border-primary/5">
                          <Image src={item.imageUrl} alt="" fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] md:text-xs font-bold truncate text-primary uppercase leading-tight">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.selectedColor && <Badge variant="outline" className="h-4 text-[8px] px-1.5 border-primary/20 text-primary/60 font-black uppercase">{item.selectedColor}</Badge>}
                            <span className="text-[9px] text-muted-foreground font-bold">R${(item.price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectedOrder.status === 'Pendente' ? (
                          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl">
                            <button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)} className="h-7 w-7 flex items-center justify-center text-primary hover:bg-white rounded-lg transition-colors"><Minus className="h-3 w-3" /></button>
                            <span className="text-xs font-black min-w-[20px] text-center text-primary">{item.quantity}</span>
                            <button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)} className="h-7 w-7 flex items-center justify-center text-primary hover:bg-white rounded-lg transition-colors"><Plus className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-primary bg-primary/5 px-4 py-1.5 rounded-xl">{item.quantity}x</span>
                        )}
                        
                        {selectedOrder.status === 'Pendente' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50 rounded-lg" onClick={() => handleRemoveItem(item.id, item.selectedColor)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedOrder.items?.length === 0 && <div className="p-12 text-center text-muted-foreground text-xs italic">Nenhum item no pedido</div>}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-primary p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-2xl shadow-primary/30">
                <div className="text-center md:text-left">
                  <span className="font-black uppercase text-[10px] tracking-[0.3em] opacity-60">Total do Pedido</span>
                  <p className="text-3xl md:text-5xl font-bold mt-1">R$ {(selectedOrder.total || 0).toFixed(2)}</p>
                </div>
                {selectedOrder.status === 'Pendente' ? (
                  <Button className="w-full md:w-auto h-14 md:h-16 px-10 rounded-2xl md:rounded-[1.5rem] bg-white text-primary hover:bg-white/90 text-sm font-black uppercase tracking-widest shadow-xl" onClick={saveOrderChanges}>
                    <Save className="h-5 w-5 mr-2" /> Salvar Tudo
                  </Button>
                ) : (
                  <Button className="w-full md:w-auto h-14 md:h-16 px-10 rounded-2xl md:rounded-[1.5rem] bg-green-500 hover:bg-green-600 text-white text-sm font-black uppercase tracking-widest" onClick={resendToWhatsApp}>
                    <MessageCircle className="h-5 w-5 mr-2" /> Notificar WhatsApp
                  </Button>
                )}
              </div>

              {selectedOrder.status === 'Pendente' && (
                <div className="pt-2">
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-2 border-primary/10 text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/5" onClick={resendToWhatsApp}>
                    <MessageCircle className="h-5 w-5 mr-2" /> Compartilhar no WhatsApp
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
