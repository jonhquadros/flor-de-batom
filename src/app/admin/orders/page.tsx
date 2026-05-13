
"use client"

import React, { useState, useMemo } from 'react';
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

  const handleAddNewProduct = (p: Product) => {
    if (!selectedOrder) return;
    
    const existingItem = selectedOrder.items.find(i => i.id === p.id);
    let updatedItems = [...selectedOrder.items];

    if (existingItem && (!p.variations || p.variations.length === 0)) {
      updatedItems = updatedItems.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      updatedItems.push({
        ...p,
        quantity: 1,
        selectedColor: p.variations?.[0]?.name || ''
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
      // Aqui você poderia chamar a função de notificação do WhatsApp se desejado
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
      case 'Pendente': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] py-0"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Pago': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] py-0"><Package className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Enviado': return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] py-0"><Truck className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Entregue': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] py-0"><CheckCircle2 className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Cancelado': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] py-0"><XCircle className="h-3 w-3 mr-1" /> {status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (isOrdersLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Sincronizando pedidos...</div>;

  return (
    <div className="space-y-6 font-poppins">
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
            <SelectTrigger className="h-12 text-sm rounded-xl border-none bg-white shadow-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos</SelectItem>
              {['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/30"><TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">Nenhum pedido encontrado.</TableCell></TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/10 h-20">
                    <TableCell className="font-bold text-xs text-primary">#{order.orderNumber || order.id.substr(0,6)}</TableCell>
                    <TableCell><span className="font-bold text-xs truncate max-w-[120px] inline-block">{order.customerName}</span></TableCell>
                    <TableCell className="font-bold text-primary text-xs">R$ {(order.total || 0).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openDetails(order)}><Eye className="h-5 w-5 text-primary" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader><AlertDialogTitle>Alterar Status?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsStatusConfirmOpen(false)}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleStatusChangeExecution(false)}>Alterar Apenas</Button>
            <AlertDialogAction onClick={() => handleStatusChangeExecution(true)}>Alterar e Notificar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto font-poppins rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-bold text-primary">Detalhes do Pedido</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest"><User className="h-3 w-3" /> Dados do Cliente</div>
                  {selectedOrder.status === 'Pendente' ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase opacity-60">Nome Completo</Label>
                        <Input className="h-9 rounded-lg bg-white" value={selectedOrder.customerName} onChange={e => handleUpdateCustomerInfo('customerName', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase opacity-60">WhatsApp</Label>
                        <Input className="h-9 rounded-lg bg-white" value={selectedOrder.customerPhone} onChange={e => handleUpdateCustomerInfo('customerPhone', e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-sm">{selectedOrder.customerName}</p>
                      <p className="text-muted-foreground text-xs">{selectedOrder.customerPhone}</p>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest"><Clock className="h-3 w-3" /> Status e Pagamento</div>
                  <div className="space-y-3">
                    <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                      <SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Badge variant="outline" className="w-full justify-center h-10 rounded-xl border-dashed border-primary/30 text-primary font-bold uppercase text-[9px]">{selectedOrder.paymentMethod}</Badge>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest"><MapPin className="h-3 w-3" /> Endereço de Entrega</div>
                  {selectedOrder.status === 'Pendente' ? (
                    <Textarea 
                      className="min-h-[80px] rounded-xl bg-white border-none resize-none text-xs" 
                      value={selectedOrder.customerAddress} 
                      onChange={e => handleUpdateCustomerInfo('customerAddress', e.target.value)}
                    />
                  ) : (
                    <p className="bg-white p-4 rounded-xl border border-muted-foreground/10 text-xs leading-relaxed">{selectedOrder.customerAddress || 'Endereço não informado'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-bold uppercase text-primary tracking-widest">Produtos no Pedido</Label>
                  {selectedOrder.status === 'Pendente' && (
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary h-8" onClick={() => setIsAddingProduct(!isAddingProduct)}>
                      {isAddingProduct ? '- Fechar Busca' : '+ Adicionar Produto'}
                    </Button>
                  )}
                </div>

                {isAddingProduct && (
                  <div className="space-y-3 p-4 bg-primary/5 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                      <Input placeholder="Buscar por nome do produto..." className="pl-9 h-10 rounded-xl border-none bg-white shadow-sm text-xs" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      {availableProductsToAdd.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded-xl shadow-sm border border-primary/5 group">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted overflow-hidden"><img src={p.imageUrl} alt="" className="object-cover h-full w-full" /></div>
                            <span className="text-[10px] font-bold text-primary uppercase truncate max-w-[150px]">{p.name}</span>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-primary hover:text-white" onClick={() => handleAddNewProduct(p)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      {productSearch && availableProductsToAdd.length === 0 && <p className="text-center text-[9px] text-muted-foreground uppercase py-2">Nenhum produto encontrado</p>}
                    </div>
                  </div>
                )}

                <div className="border rounded-2xl divide-y bg-white overflow-hidden shadow-sm">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={(item.id || idx) + (item.selectedColor || '')} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate text-primary uppercase">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.selectedColor && <span className="text-[9px] font-black text-primary/40 uppercase">Cor: {item.selectedColor}</span>}
                          <span className="text-[9px] text-muted-foreground">R$ {(item.price || 0).toFixed(2)} cada</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {selectedOrder.status === 'Pendente' ? (
                          <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-xl border border-muted-foreground/10">
                            <button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)} className="h-6 w-6 flex items-center justify-center text-primary hover:bg-white rounded-lg"><Minus className="h-3 w-3" /></button>
                            <span className="text-xs font-bold min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)} className="h-6 w-6 flex items-center justify-center text-primary hover:bg-white rounded-lg"><Plus className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg">{item.quantity}x</span>
                        )}
                        
                        {selectedOrder.status === 'Pendente' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50 rounded-full" onClick={() => handleRemoveItem(item.id, item.selectedColor)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedOrder.items?.length === 0 && <div className="p-10 text-center text-muted-foreground text-xs italic">Nenhum item no pedido</div>}
                </div>
              </div>

              <div className="flex justify-between items-center bg-primary p-6 rounded-[1.5rem] text-white shadow-xl shadow-primary/20">
                <span className="font-black uppercase text-[10px] tracking-[0.2em] opacity-80">Total Atualizado</span>
                <span className="text-3xl font-bold">R$ {(selectedOrder.total || 0).toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <Button variant="outline" className="h-14 font-bold rounded-2xl border-2 hover:bg-muted/10" onClick={resendToWhatsApp}><MessageCircle className="h-5 w-5 mr-2" /> Reenviar no WhatsApp</Button>
                {selectedOrder.status === 'Pendente' && (
                  <Button className="h-14 font-bold rounded-2xl shadow-lg shadow-primary/10" onClick={saveOrderChanges}><Save className="h-5 w-5 mr-2" /> Salvar Alterações</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
