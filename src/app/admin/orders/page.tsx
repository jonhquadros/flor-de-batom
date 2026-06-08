
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
  PlusCircle,
  CreditCard,
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

  const isEditable = selectedOrder?.status === 'Pendente';

  const handleUpdateField = (field: keyof Order, value: string) => {
    if (!selectedOrder || !isEditable) return;
    setSelectedOrder({ ...selectedOrder, [field]: value });
  };

  const handleUpdateItemQuantity = (id: string, delta: number, color?: string) => {
    if (!selectedOrder || !isEditable) return;
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
    if (!selectedOrder || !isEditable) return;
    const updatedItems = selectedOrder.items.filter(item => {
      const matchId = item.id === id;
      const matchColor = color ? item.selectedColor === color : true;
      return !(matchId && matchColor);
    });
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleAddNewProduct = (p: Product, variationName?: string) => {
    if (!selectedOrder || !isEditable) return;
    
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

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] uppercase font-bold px-3 py-1 rounded-full"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Pago': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] uppercase font-bold px-3 py-1 rounded-full"><Package className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Entregue': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] uppercase font-bold px-3 py-1 rounded-full"><CheckCircle2 className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'Cancelado': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] uppercase font-bold px-3 py-1 rounded-full"><XCircle className="h-3 w-3 mr-1" /> {status}</Badge>;
      default: return <Badge className="text-[10px] uppercase font-bold px-3 py-1 rounded-full">{status}</Badge>;
    }
  };

  const sendOrderToWhatsApp = (order: Order) => {
    const phone = order.customerPhone.replace(/\D/g, '');
    
    const linhasProdutos = order.items.map(i => {
      const labelCor = i.selectedColor ? ` [${i.selectedColor}]` : '';
      return `• ${i.name}${labelCor} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`;
    }).join('\n');

    let linhaPagamento = "";
    if (order.paymentMethod === 'Dinheiro') {
      linhaPagamento = `💵 Dinheiro${order.change ? ` (troco para R$ ${order.change})` : ' (sem troco)'}`;
    } else if (order.paymentMethod === 'Pix') {
      linhaPagamento = `📱 Pix — comprovante a enviar`;
    } else {
      linhaPagamento = `💳 ${order.paymentMethod}`;
    }

    const totalFormatado = (order.total || 0).toFixed(2).replace('.', ',');
    
    const msg = encodeURIComponent(
      `🌸 *PEDIDO #${order.orderNumber || order.id.substr(0, 6)} - Flor de Batom Makeup*\n\n` +
      `👤 *Cliente:* ${order.customerName}\n` +
      `📱 *Telefone:* ${order.customerPhone}\n` +
      `📍 *Endereço:* ${order.customerAddress || 'Retirada na loja'}\n\n` +
      `🛍️ *PRODUTOS:*\n${linhasProdutos}\n\n` +
      `💰 *TOTAL: R$ ${totalFormatado}*\n` +
      `💳 *Pagamento:* ${linhaPagamento}\n\n` +
      `_Atendimento Flor de Batom Makeup_`
    );
    
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  if (isOrdersLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Sincronizando pedidos...</div>;

  return (
    <div className="space-y-6 font-poppins pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pedidos da Loja</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Monitore e edite as vendas recebidas pelo catálogo.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por nome ou nº do pedido..." className="pl-12 h-14 rounded-2xl border-none bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full md:w-56">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-xs uppercase tracking-widest px-6">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="Todos">Todos Status</SelectItem>
              {['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-none">
                <TableHead className="text-[10px] uppercase font-black tracking-widest px-8 h-14">Nº Pedido</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest px-4 h-14">Data</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest px-4 h-14">Cliente</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest px-4 h-14">Total</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest px-4 h-14 text-center">Status</TableHead>
                <TableHead className="text-right px-8 h-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">Nenhum pedido encontrado.</TableCell></TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/10 h-20 transition-colors border-primary/5">
                    <TableCell className="font-bold text-xs md:text-sm text-primary px-8">
                      #{order.orderNumber || order.id.substr(0,6)}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="font-bold text-xs md:text-sm text-foreground">{order.customerName}</span>
                    </TableCell>
                    <TableCell className="font-black text-primary text-xs md:text-sm px-4">
                      R$ {(order.total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 text-center">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right px-8">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-11 w-11 rounded-2xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" 
                        onClick={() => openDetails(order)}
                      >
                        <Eye className="h-5 w-5" />
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
        <DialogContent className="w-[95%] max-w-4xl max-h-[95vh] overflow-hidden font-poppins rounded-[2rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl flex flex-col bg-white">
          <div className="px-6 py-6 md:px-8 md:py-8 border-b border-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FDFCFB]">
            <div className="pr-12 sm:pr-0">
              <DialogTitle className="text-2xl md:text-3xl font-bold text-primary font-poppins tracking-tight truncate max-w-xs md:max-w-none">
                Pedido #{selectedOrder?.orderNumber || selectedOrder?.id.substr(0,6)}
              </DialogTitle>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary/40 mt-1">Detalhes da Transação</p>
            </div>
            {selectedOrder && (
              <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                <SelectTrigger className="w-full sm:w-40 h-10 md:h-11 rounded-xl md:rounded-2xl border-none shadow-lg font-bold text-[10px] md:text-xs uppercase bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {['Pendente', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {selectedOrder && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="p-6 md:p-10 space-y-8 md:space-y-10">
                
                {/* 1. SEÇÃO DE INFORMAÇÕES DO CLIENTE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[9px] md:text-[10px] tracking-widest opacity-60">
                      <User className="h-3 w-3" /> Dados Pessoais
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] md:text-[9px] uppercase font-black ml-1 opacity-50">Nome do Cliente</Label>
                        <Input 
                          className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-sm text-xs md:text-sm font-bold" 
                          value={selectedOrder.customerName} 
                          readOnly={!isEditable}
                          onChange={e => handleUpdateField('customerName', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] md:text-[9px] uppercase font-black ml-1 opacity-50">WhatsApp / Telefone</Label>
                        <Input 
                          className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-sm text-xs md:text-sm font-bold" 
                          value={selectedOrder.customerPhone} 
                          readOnly={!isEditable}
                          onChange={e => handleUpdateField('customerPhone', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[9px] md:text-[10px] tracking-widest opacity-60">
                      <Wallet className="h-3 w-3" /> Pagamento e Controle
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] md:text-[9px] uppercase font-black ml-1 opacity-50">Forma de Pagamento</Label>
                        {isEditable ? (
                          <Select value={selectedOrder.paymentMethod} onValueChange={(v: any) => handleUpdateField('paymentMethod', v)}>
                            <SelectTrigger className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-sm font-bold text-[10px] md:text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                              <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-11 md:h-12 px-4 rounded-xl md:rounded-2xl bg-muted/10 flex items-center text-xs font-bold text-muted-foreground uppercase">{selectedOrder.paymentMethod}</div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] md:text-[9px] uppercase font-black ml-1 opacity-50">Nº de Controle (Edição)</Label>
                        <Input 
                          className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-sm text-xs md:text-sm font-bold" 
                          value={selectedOrder.orderNumber || ''} 
                          readOnly={!isEditable}
                          onChange={e => handleUpdateField('orderNumber', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[9px] md:text-[10px] tracking-widest opacity-60">
                      <MapPin className="h-3 w-3" /> Endereço de Entrega
                    </div>
                    <div className="space-y-1.5">
                      <Textarea 
                        className="min-h-[80px] md:min-h-[100px] rounded-xl md:rounded-[1.5rem] bg-muted/20 border-none shadow-sm resize-none text-xs md:text-sm p-4 md:p-5 font-medium leading-relaxed" 
                        value={selectedOrder.customerAddress} 
                        readOnly={!isEditable}
                        onChange={e => handleUpdateField('customerAddress', e.target.value)}
                        placeholder="Endereço não informado"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. SEÇÃO DE PRODUTOS */}
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[9px] md:text-[10px] tracking-widest opacity-60">
                      <ShoppingBag className="h-3 w-3" /> Produtos no Pedido
                    </div>
                    {isEditable && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[9px] md:text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary rounded-lg md:rounded-xl h-8 md:h-9 px-3 md:px-4"
                        onClick={() => setIsAddingProduct(!isAddingProduct)}
                      >
                        {isAddingProduct ? 'Cancelar' : <><PlusCircle className="h-3.5 w-3.5 mr-2" /> Adicionar</>}
                      </Button>
                    )}
                  </div>

                  {isAddingProduct && (
                    <div className="p-4 md:p-6 bg-primary/5 rounded-2xl md:rounded-[2rem] border border-dashed border-primary/20 space-y-3 md:space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/30" />
                        <Input 
                          placeholder="Buscar produto pelo nome..." 
                          className="pl-11 h-11 md:h-14 bg-white border-none rounded-xl md:rounded-2xl text-xs md:text-sm"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                      </div>
                      {availableProductsToAdd.length > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                          {availableProductsToAdd.map(p => (
                            <div key={p.id} className="bg-white p-2.5 md:p-3 rounded-xl md:rounded-2xl flex items-center justify-between border border-primary/5 shadow-sm">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="h-10 w-10 md:h-12 md:w-12 relative rounded-lg md:rounded-xl overflow-hidden border bg-muted">
                                  <Image src={p.imageUrl} alt="" fill className="object-cover" />
                                </div>
                                <div>
                                  <p className="text-[10px] md:text-xs font-bold text-primary truncate max-w-[120px] md:max-w-[150px]">{p.name}</p>
                                  <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-black tracking-widest">R$ {p.price.toFixed(2)}</p>
                                </div>
                              </div>
                              <Button size="sm" className="h-8 md:h-10 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase px-4 md:px-5" onClick={() => handleAddNewProduct(p)}>Inserir</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white rounded-2xl md:rounded-[2rem] border border-primary/5 shadow-sm overflow-hidden divide-y divide-primary/5">
                    {selectedOrder.items.length === 0 ? (
                      <div className="p-16 md:p-20 text-center text-muted-foreground italic text-xs md:text-sm">Este pedido está vazio.</div>
                    ) : (
                      selectedOrder.items.map((item, idx) => (
                        <div key={`${item.id}-${item.selectedColor || idx}`} className="p-4 md:p-8 flex items-center justify-between group bg-white hover:bg-primary/[0.01] transition-colors">
                          <div className="flex items-center gap-3 md:gap-6">
                            <div className="relative h-14 w-14 md:h-20 md:w-20 rounded-xl md:rounded-[1.5rem] overflow-hidden border border-primary/5 shrink-0 shadow-sm">
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="space-y-1 md:space-y-1.5">
                              <h4 className="font-poppins font-semibold text-xs md:text-lg text-primary leading-tight line-clamp-1">{item.name}</h4>
                              {item.selectedColor && (
                                <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 md:px-3 md:py-1 border-primary/10 tracking-widest rounded-md md:rounded-lg">
                                  {item.selectedColor}
                                </Badge>
                              )}
                              <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-1.5 md:mt-3">
                                <p className="text-xs md:text-sm font-black text-primary uppercase">R$ {item.price.toFixed(2)}</p>
                                <div className="flex items-center gap-2 md:gap-3">
                                  {isEditable ? (
                                    <div className="flex items-center bg-muted/40 rounded-lg md:rounded-xl p-0.5 md:p-1 shadow-inner">
                                      <button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)} className="h-6 w-6 md:h-8 md:w-8 flex items-center justify-center text-primary hover:bg-white rounded-md md:rounded-lg transition-all"><Minus className="h-3 w-3 md:h-4 md:w-4" /></button>
                                      <span className="w-7 md:w-10 text-center text-[10px] md:text-xs font-black">{item.quantity}</span>
                                      <button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)} className="h-6 w-6 md:h-8 md:w-8 flex items-center justify-center text-primary hover:bg-white rounded-md md:rounded-lg transition-all"><Plus className="h-3 w-3 md:h-4 md:w-4" /></button>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Qtd: {item.quantity}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 md:gap-3">
                            <p className="font-black text-sm md:text-lg text-primary">R$ {(item.price * item.quantity).toFixed(2)}</p>
                            {isEditable && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 md:h-10 md:w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg md:rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveItem(item.id, item.selectedColor)}
                              >
                                <Trash2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. RODAPÉ DE AÇÕES */}
          <div className="p-6 md:p-10 border-t bg-[#FDFCFB] flex flex-col items-center gap-6">
            <div className="text-center">
              <span className="font-black uppercase text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] text-primary/40">Valor Total do Pedido</span>
              <p className="text-3xl md:text-5xl font-black text-primary mt-0.5 md:mt-1 tracking-tighter">R$ {(selectedOrder?.total || 0).toFixed(2)}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full justify-center">
              {isEditable && (
                <Button 
                  className="h-14 md:h-16 px-6 md:px-10 rounded-xl md:rounded-2xl bg-white border-2 border-primary text-primary hover:bg-primary/5 text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 w-full sm:w-auto" 
                  onClick={saveOrderChanges}
                >
                  <Save className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" /> Salvar Alterações
                </Button>
              )}
              <Button 
                className="h-14 md:h-16 px-6 md:px-10 rounded-xl md:rounded-2xl bg-[#25D366] hover:bg-[#1da851] text-white text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 flex gap-2 md:gap-3 transition-all active:scale-95 w-full sm:w-auto" 
                onClick={() => selectedOrder && sendOrderToWhatsApp(selectedOrder)}
              >
                <MessageCircle className="h-5 w-5 md:h-6 md:w-6" /> Enviar p/ WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Mudança de Status */}
      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] w-[90%] max-w-md border-none p-10 font-poppins shadow-2xl">
          <AlertDialogHeader>
            <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
              <Package className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-primary text-center">Atualizar Status?</AlertDialogTitle>
            <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">Esta ação pode atualizar automaticamente o estoque dos produtos e alterar o bloqueio de edição do pedido.</p>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row mt-8">
            <AlertDialogCancel className="rounded-2xl h-14 border-none bg-muted/50 font-black text-[10px] uppercase tracking-widest flex-1" onClick={() => setIsStatusConfirmOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl h-14 bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 flex-1" onClick={() => handleStatusChangeExecution(true)}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
