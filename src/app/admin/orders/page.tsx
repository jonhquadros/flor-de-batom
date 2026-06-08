
"use client"

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Search, 
  CheckCircle2, 
  Package, 
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
  Wallet
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

  const openDetails = (order: Order) => {
    setSelectedOrder({ ...order });
    setIsDetailsOpen(true);
    setIsAddingProduct(false);
  };

  const isEditable = selectedOrder?.status === 'Pendente';

  const handleUpdateField = (field: keyof Order, value: any) => {
    if (!selectedOrder || !isEditable) return;
    setSelectedOrder({ ...selectedOrder, [field]: value });
  };

  const handleUpdateItemQuantity = (id: string, delta: number, color?: string) => {
    if (!selectedOrder || !isEditable) return;
    const updatedItems = selectedOrder.items.map(item => {
      const matchId = item.id === id;
      const matchColor = color ? item.selectedColor === color : true;
      if (matchId && matchColor) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    });
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleRemoveItem = (id: string, color?: string) => {
    if (!selectedOrder || !isEditable) return;
    const updatedItems = selectedOrder.items.filter(item => !(item.id === id && item.selectedColor === color));
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const saveOrderChanges = () => {
    if (!selectedOrder || !db) return;
    updateOrder(db, selectedOrder);
    setIsDetailsOpen(false);
    toast({ title: "Pedido atualizado!" });
  };

  const initiateStatusChange = (id: string, status: OrderStatus) => {
    setStatusToUpdate({ id, status });
    setIsStatusConfirmOpen(true);
  };

  const handleStatusChangeExecution = () => {
    if (!statusToUpdate) return;
    const { id, status } = statusToUpdate;
    const order = orders.find(o => o.id === id);
    if (db && order) updateOrderStatus(db, order, status);
    setIsStatusConfirmOpen(false);
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    toast({ title: "Status atualizado" });
  };

  const sendOrderToWhatsApp = (order: Order) => {
    const phone = order.customerPhone.replace(/\D/g, '');
    const linhasProdutos = order.items.map(i => `• ${i.name}${i.selectedColor ? ` [${i.selectedColor}]` : ''} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`).join('\n');
    let linhaPag = order.paymentMethod === 'Dinheiro' ? `💵 Dinheiro${order.change ? ` (troco para R$ ${order.change.toFixed(2).replace('.', ',')})` : ' (sem troco)'}` : `💳 ${order.paymentMethod}`;
    const msg = encodeURIComponent(`🌸 *PEDIDO #${order.orderNumber || order.id.substr(0, 6)}*\n\n👤 *Cliente:* ${order.customerName}\n📍 *Endereço:* ${order.customerAddress || 'Retirada'}\n\n🛍️ *PRODUTOS:*\n${linhasProdutos}\n\n💰 *TOTAL: R$ ${(order.total || 0).toFixed(2).replace('.', ',')}*\n💳 *Pagamento:* ${linhaPag}`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-2xl md:text-3xl font-bold">Pedidos</h1>
      <div className="flex flex-col md:flex-row gap-3">
        <Input placeholder="Pesquisar..." className="h-12 rounded-xl bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-12 w-full md:w-48 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            {['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredOrders.map(order => (
              <TableRow key={order.id} className="h-16">
                <TableCell className="font-bold text-primary">#{order.orderNumber || order.id.substr(0,6)}</TableCell>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell className="font-black">R$ {order.total.toFixed(2).replace('.', ',')}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${order.status === 'Entregue' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDetails(order)}><Eye className="h-5 w-5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[98%] max-w-4xl h-[94vh] rounded-[2rem] p-0 flex flex-col overflow-hidden">
          <div className="px-3 md:px-5 py-3 border-b flex items-center justify-between bg-[#FDFCFB]">
            <DialogTitle className="text-sm md:text-lg font-bold text-primary truncate pr-2">#{selectedOrder?.orderNumber || selectedOrder?.id.substr(0,6)}</DialogTitle>
            {selectedOrder && (
              <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                <SelectTrigger className="w-24 md:w-32 h-8 md:h-10 rounded-xl shadow-sm font-bold text-[8px] md:text-[10px] uppercase bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          
          {selectedOrder && (
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-6 no-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase text-primary/40"><User className="h-3 w-3" /> Dados Básicos</div>
                  <Input className="h-10 md:h-12 rounded-xl bg-muted/20 border-none font-bold text-xs" value={selectedOrder.customerName} readOnly={!isEditable} onChange={e => handleUpdateField('customerName', e.target.value)} placeholder="Nome do Cliente" />
                  <Input className="h-10 md:h-12 rounded-xl bg-muted/20 border-none font-bold text-xs" value={selectedOrder.customerPhone} readOnly={!isEditable} onChange={e => handleUpdateField('customerPhone', e.target.value)} placeholder="WhatsApp" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase text-primary/40"><Wallet className="h-3 w-3" /> Pagamento</div>
                  <div className="h-10 md:h-12 px-4 rounded-xl bg-muted/10 flex items-center text-[9px] md:text-[10px] font-bold uppercase">{selectedOrder.paymentMethod}</div>
                  {selectedOrder.paymentMethod === 'Dinheiro' && (
                    <Input className="h-10 md:h-12 rounded-xl bg-muted/20 border-none font-bold text-xs" value={selectedOrder.change || ''} placeholder="Troco para quanto?" readOnly={!isEditable} type="number" onChange={e => handleUpdateField('change', parseFloat(e.target.value))} />
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase text-primary/40"><MapPin className="h-3 w-3" /> Endereço Completo</div>
                  <Textarea className="min-h-[50px] md:min-h-[80px] rounded-xl bg-muted/20 border-none resize-none font-medium text-[11px] md:text-xs leading-relaxed" value={selectedOrder.customerAddress} readOnly={!isEditable} onChange={e => handleUpdateField('customerAddress', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase text-primary/40 border-b pb-2"><ShoppingBag className="h-3 w-3" /> Itens Escolhidos</div>
                <div className="grid grid-cols-1 gap-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between gap-3 bg-white rounded-2xl border border-primary/5 shadow-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative h-10 w-10 md:h-14 md:w-14 rounded-xl overflow-hidden border shrink-0"><Image src={item.imageUrl} alt="" fill className="object-cover" /></div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[9px] md:text-[11px] text-primary truncate">{item.name}</h4>
                          {item.selectedColor && <Badge className="text-[6px] md:text-[7px] font-black uppercase mt-0.5 h-3 md:h-4 px-1">{item.selectedColor}</Badge>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] md:text-[10px] font-black">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                            {isEditable ? (
                              <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
                                <button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)} className="h-4 w-4 md:h-5 md:w-5 flex items-center justify-center"><Minus className="h-2 w-2" /></button>
                                <span className="w-4 md:w-6 text-center text-[8px] md:text-[10px] font-bold">{item.quantity}</span>
                                <button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)} className="h-4 w-4 md:h-5 md:w-5 flex items-center justify-center"><Plus className="h-2 w-2" /></button>
                              </div>
                            ) : <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground">Qtd: {item.quantity}</span>}
                          </div>
                        </div>
                      </div>
                      {isEditable && <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9 text-red-400 shrink-0" onClick={() => handleRemoveItem(item.id, item.selectedColor)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-4 md:p-6 border-t bg-[#FDFCFB] flex flex-col items-center gap-4">
            <div className="text-center"><p className="text-[8px] md:text-[9px] font-black uppercase text-primary/40">Total do Pedido</p><p className="text-xl md:text-2xl font-black text-primary">R$ {selectedOrder?.total.toFixed(2).replace('.', ',')}</p></div>
            <div className="flex flex-col md:flex-row gap-2 w-full max-w-lg">
              {isEditable && <Button className="h-11 md:h-14 flex-1 rounded-xl bg-white border-2 border-primary text-primary font-black uppercase text-[9px] md:text-[10px]" onClick={saveOrderChanges}><Save className="h-4 w-4 mr-2" /> Salvar Alterações</Button>}
              <Button className="h-11 md:h-14 flex-1 rounded-xl bg-[#25D366] text-white font-black uppercase text-[9px] md:text-[10px] flex gap-2 shadow-lg shadow-green-500/10" onClick={() => selectedOrder && sendOrderToWhatsApp(selectedOrder)}><MessageCircle className="h-4 w-4" /> Enviar p/ WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm p-8 text-center">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Atualizar Status?</AlertDialogTitle><p className="text-sm text-muted-foreground mt-2">Isso pode devolver ou retirar produtos do estoque.</p></AlertDialogHeader>
          <div className="flex gap-3 mt-6"><AlertDialogCancel className="flex-1 rounded-xl h-11 border-none bg-muted/50">Cancelar</AlertDialogCancel><AlertDialogAction className="flex-1 rounded-xl h-11 bg-primary" onClick={handleStatusChangeExecution}>Confirmar</AlertDialogAction></div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
