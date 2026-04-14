
"use client"

import React, { useState, useMemo } from 'react';
import { Download, Search, CheckCircle2, Package, Truck, Clock, Eye, MessageCircle, Save, Trash2, Plus, Minus, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus, Product, CartItem } from '@/lib/types';
import { updateOrderStatus, updateOrder } from '@/lib/storage-utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminOrders() {
  const db = useFirestore();
  const { toast } = useToast();

  const ordersQuery = useMemoFirebase(() => collection(db, 'orders'), [db]);
  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);

  const { data: orders = [] } = useCollection<Order>(ordersQuery);
  const { data: products = [] } = useCollection<Product>(productsQuery);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Adição de Produto no Pedido
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [addingProductSearch, setAddingProductSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [selectedColorToAdd, setSelectedColorToAdd] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  
  // Confirmação de Status
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{id: string, status: OrderStatus} | null>(null);

  const sendWhatsAppStatusUpdate = (order: Order) => {
    const rawPhone = order.customerPhone.replace(/\D/g, '');
    const telefone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const nome = order.customerName;
    const id = order.orderNumber || order.id.substr(0, 6);
    const status = order.status;

    let mensagem = "";
    switch(status) {
      case "Pago":
        mensagem = `🌸 *Flor de Batom Makeup*\n\n💖 Olá ${nome}!\nSeu pedido #${id} foi CONFIRMADO e já estamos separando seus produtinhos 💄✨`;
        break;
      case "Enviado":
        mensagem = `🌸 *Flor de Batom Makeup*\n\n🚚 ${nome}, seu pedido #${id} já foi enviado e está a caminho! Em breve chega até você 😍`;
        break;
      case "Entregue":
        mensagem = `🌸 *Flor de Batom Makeup*\n\n✨ ${nome}, seu pedido #${id} foi entregue! Obrigada pela sua compra 💕`;
        break;
      case "Cancelado":
        mensagem = `🌸 *Flor de Batom Makeup*\n\n⚠️ ${nome}, seu pedido #${id} foi cancelado. Qualquer dúvida estamos à disposição!`;
        break;
    }

    if (!mensagem) return;
    const msg = encodeURIComponent(mensagem);
    window.open(`https://wa.me/${telefone}?text=${msg}`, '_blank');
  };

  const initiateStatusChange = (id: string, status: OrderStatus) => {
    setStatusToUpdate({ id, status });
    setIsStatusConfirmOpen(true);
  };

  const handleStatusChangeExecution = (sendNotification: boolean) => {
    if (!statusToUpdate) return;
    const { id, status } = statusToUpdate;
    updateOrderStatus(db, id, status);
    
    if (sendNotification) {
      const order = orders.find(o => o.id === id);
      if (order) sendWhatsAppStatusUpdate({ ...order, status });
    }

    setIsStatusConfirmOpen(false);
    setStatusToUpdate(null);
    if (selectedOrder && selectedOrder.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    toast({ title: "Status Atualizado" });
  };

  const openDetails = (order: Order) => {
    setSelectedOrder({ ...order });
    setIsDetailsOpen(true);
    setIsAddingProduct(false);
  };

  const handleUpdateItemQuantity = (id: string, delta: number, color?: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    const updatedItems = selectedOrder.items.map(item => {
      if (item.id === id && item.selectedColor === color) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);

    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleRemoveItem = (id: string, color?: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;
    const updatedItems = selectedOrder.items.filter(item => !(item.id === id && item.selectedColor === color));
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleAddProductToOrder = () => {
    if (!selectedOrder || !selectedProductToAdd) return;
    const updatedItems = [...selectedOrder.items, { ...selectedProductToAdd, quantity: quantityToAdd, selectedColor: selectedColorToAdd }];
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
    setIsAddingProduct(false);
    setSelectedProductToAdd(null);
    toast({ title: "Produto Adicionado" });
  };

  const saveOrderChanges = () => {
    if (!selectedOrder) return;
    updateOrder(db, selectedOrder);
    setIsDetailsOpen(false);
    toast({ title: "Pedido Atualizado" });
  };

  const resendToWhatsApp = () => {
    if (!selectedOrder) return;
    const rawPhone = selectedOrder.customerPhone.replace(/\D/g, '');
    const finalPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const linhasProdutos = selectedOrder.items.map(i => `• ${i.name}${i.selectedColor ? ` [${i.selectedColor}]` : ''} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`).join('\n');
    const linhaPagamento = selectedOrder.paymentMethod === 'Dinheiro' ? `💵 Dinheiro${selectedOrder.change ? ` (troco para R$ ${selectedOrder.change})` : ' (sem troco)'}` : `📱 Pix — comprovante a enviar`;
    const msg = encodeURIComponent(`🌸 *PEDIDO ATUALIZADO #${selectedOrder.orderNumber}*\n\n👤 *Cliente:* ${selectedOrder.customerName}\n🛍️ *PRODUTOS:*\n${linhasProdutos}\n\n💰 *TOTAL: R$ ${selectedOrder.total.toFixed(2).replace('.', ',')}*\n💳 *Pagamento:* ${linhaPagamento}`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
  };

  const filteredOrders = useMemo(() => orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || (o.orderNumber && o.orderNumber.includes(searchTerm));
    const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, searchTerm, statusFilter]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] py-0"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Pago': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] py-0"><Package className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Enviado': return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] py-0"><Truck className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Entregue': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] py-0"><CheckCircle2 className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Cancelado': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] py-0"><XCircle className="h-3 w-3 mr-1" /> {status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pedidos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Acompanhe suas vendas em tempo real.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar cliente ou pedido..." className="pl-10 h-12 text-sm rounded-xl border-none bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
            <TableHeader><TableRow className="bg-muted/30"><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredOrders.slice().reverse().map(order => (
                <TableRow key={order.id} className="hover:bg-muted/10 h-20">
                  <TableCell className="font-bold text-xs text-primary">#{order.orderNumber || order.id.substr(0,4)}</TableCell>
                  <TableCell><span className="font-bold text-xs">{order.customerName}</span></TableCell>
                  <TableCell className="font-bold text-primary text-xs">R$ {order.total.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openDetails(order)}><Eye className="h-5 w-5 text-primary" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader><AlertDialogTitle>Alterar Status?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsStatusConfirmOpen(false)}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleStatusChangeExecution(false)}>Alterar</Button>
            <AlertDialogAction onClick={() => handleStatusChangeExecution(true)}>Alterar e Notificar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto font-poppins rounded-[2.5rem]">
          <DialogHeader><DialogTitle className="text-2xl font-bold text-primary">Detalhes do Pedido</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-6 rounded-2xl text-xs">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Cliente</Label>
                  {selectedOrder.status === 'Pendente' ? <Input value={selectedOrder.customerName} onChange={(e) => setSelectedOrder({...selectedOrder, customerName: e.target.value})} className="h-8 bg-white" /> : <p className="font-bold">{selectedOrder.customerName}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Telefone</Label>
                  {selectedOrder.status === 'Pendente' ? <Input value={selectedOrder.customerPhone} onChange={(e) => setSelectedOrder({...selectedOrder, customerPhone: e.target.value})} className="h-8 bg-white" /> : <p className="font-bold">{selectedOrder.customerPhone}</p>}
                </div>
                <div className="space-y-3">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Forma de Pagamento</Label>
                  {selectedOrder.status === 'Pendente' ? (
                    <RadioGroup value={selectedOrder.paymentMethod} onValueChange={(v: 'Pix' | 'Dinheiro') => setSelectedOrder({...selectedOrder, paymentMethod: v})} className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Pix" id="pix-admin" /><Label htmlFor="pix-admin">Pix</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Dinheiro" id="cash-admin" /><Label htmlFor="cash-admin">Dinheiro</Label></div>
                      {selectedOrder.paymentMethod === 'Dinheiro' && <Input type="number" placeholder="Troco p/" value={selectedOrder.change || ''} onChange={(e) => setSelectedOrder({...selectedOrder, change: parseFloat(e.target.value) || 0})} className="h-7 w-20 bg-white" />}
                    </RadioGroup>
                  ) : <p className="font-bold">{selectedOrder.paymentMethod} {selectedOrder.change ? `(Troco p/ R$ ${selectedOrder.change})` : ''}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Status</Label>
                  <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center"><Label className="text-[11px] font-bold uppercase text-primary">Itens</Label>{selectedOrder.status === 'Pendente' && <Button variant="outline" size="sm" onClick={() => setIsAddingProduct(!isAddingProduct)} className="rounded-full h-8 text-[10px]">{isAddingProduct ? 'Fechar' : '+ Adicionar'}</Button>}</div>
                {isAddingProduct && (
                  <div className="bg-primary/5 p-4 rounded-xl space-y-3">
                    <Input placeholder="Buscar produto..." value={addingProductSearch} onChange={(e) => setAddingProductSearch(e.target.value)} className="h-9 bg-white" />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {products.filter(p => p.name.toLowerCase().includes(addingProductSearch.toLowerCase())).map(p => (
                        <div key={p.id} onClick={() => { setSelectedProductToAdd(p); handleAddProductToOrder(); }} className="p-2 bg-white hover:bg-primary/5 cursor-pointer rounded-lg text-xs flex justify-between"><span>{p.name}</span><span className="font-bold">R$ {p.price.toFixed(2)}</span></div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border rounded-2xl divide-y bg-white overflow-hidden shadow-sm">
                  {selectedOrder.items.map(item => (
                    <div key={item.id + (item.selectedColor || '')} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0"><p className="text-[11px] font-bold truncate text-primary">{item.name}</p><p className="text-[9px] text-muted-foreground">{item.selectedColor ? `COR: ${item.selectedColor} • ` : ''}R$ {item.price.toFixed(2)} un.</p></div>
                      <div className="flex items-center gap-3">
                        {selectedOrder.status === 'Pendente' ? (
                          <><div className="flex items-center border rounded-lg px-1 bg-muted/20"><button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)}><Minus className="h-3 w-3" /></button><span className="w-6 text-center text-xs">{item.quantity}</span><button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)}><Plus className="h-3 w-3" /></button></div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveItem(item.id, item.selectedColor)}><Trash2 className="h-4 w-4" /></Button></>
                        ) : <span className="text-xs font-bold text-primary">{item.quantity}x</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center bg-primary p-6 rounded-[1.5rem] text-white">
                <span className="font-bold uppercase text-[10px]">Total</span>
                <span className="text-3xl font-bold">R$ {selectedOrder.total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="h-14 font-bold" onClick={resendToWhatsApp}><MessageCircle className="h-5 w-5 mr-2" /> Notificar Cliente</Button>
                {selectedOrder.status === 'Pendente' && <Button className="h-14 font-bold" onClick={saveOrderChanges}><Save className="h-5 w-5 mr-2" /> Salvar Alterações</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
