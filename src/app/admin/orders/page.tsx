
"use client"

import React, { useState, useEffect } from 'react';
import { Download, Search, CheckCircle2, Package, Truck, Clock, Eye, MessageCircle, Save, Trash2, Plus, Minus, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus, Product } from '@/lib/types';
import { getStoredOrders, updateOrderStatus, updateOrder, getStoredProducts } from '@/lib/storage-utils';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Confirmação de Status
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{id: string, status: OrderStatus} | null>(null);
  
  const { toast } = useToast();

  const loadData = () => {
    setOrders(getStoredOrders());
    setProducts(getStoredProducts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const sendWhatsAppStatusUpdate = (order: Order) => {
    const telefone = order.customerPhone.replace(/\D/g, '');
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
      default:
        return;
    }

    if (!mensagem) return;

    const msg = encodeURIComponent(mensagem);
    window.open(`https://wa.me/55${telefone}?text=${msg}`, '_blank');
  };

  const initiateStatusChange = (id: string, status: OrderStatus) => {
    setStatusToUpdate({ id, status });
    setIsStatusConfirmOpen(true);
  };

  const handleStatusChangeExecution = (sendNotification: boolean) => {
    if (!statusToUpdate) return;
    
    const { id, status } = statusToUpdate;
    updateOrderStatus(id, status);
    
    if (sendNotification) {
      const order = orders.find(o => o.id === id);
      if (order) {
        sendWhatsAppStatusUpdate({ ...order, status });
      }
    }

    loadData();
    setIsStatusConfirmOpen(false);
    setStatusToUpdate(null);
    
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }

    toast({ 
      title: "Status Atualizado", 
      description: status === 'Cancelado' ? "O pedido foi cancelado e o estoque atualizado." : `Pedido marcado como ${status}.` 
    });
  };

  const openDetails = (order: Order) => {
    setSelectedOrder({ ...order });
    setIsDetailsOpen(true);
  };

  const handleUpdateItemQuantity = (id: string, delta: number) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;

    // VERIFICAÇÃO DE ESTOQUE DISPONÍVEL
    const product = products.find(p => p.id === id);
    
    const updatedItems = selectedOrder.items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        
        if (delta > 0 && product && newQty > product.stock) {
          toast({ 
            variant: "destructive", 
            title: "Estoque Insuficiente", 
            description: `Este produto possui apenas ${product.stock} unidades em estoque.` 
          });
          return item;
        }
        
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);

    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const handleRemoveItem = (id: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;

    const updatedItems = selectedOrder.items.filter(item => item.id !== id);
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
  };

  const saveOrderChanges = () => {
    if (!selectedOrder) return;
    updateOrder(selectedOrder);
    loadData();
    setIsDetailsOpen(false);
    toast({ title: "Pedido Atualizado", description: "Alterações salvas." });
  };

  const resendToWhatsApp = () => {
    if (!selectedOrder) return;

    const NUMERO_LOJA = "5591987199039";
    const linhasProdutos = selectedOrder.items.map(i =>
      `• ${i.name} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`
    ).join('\n');

    const linhaPagamento = selectedOrder.paymentMethod === 'Dinheiro'
      ? `💵 Dinheiro${selectedOrder.change ? ` (troco para R$ ${selectedOrder.change})` : ' (sem troco)'}`
      : `📱 Pix — comprovante a enviar`;

    const statusMsg = selectedOrder.status === 'Cancelado' ? '❌ *PEDIDO CANCELADO*' : `🌸 *PEDIDO ATUALIZADO #${selectedOrder.orderNumber}*`;

    const msg = encodeURIComponent(
      `${statusMsg} — Flor de Batom Makeup\n\n` +
      `👤 *Cliente:* ${selectedOrder.customerName}\n` +
      `📱 *Telefone:* ${selectedOrder.customerPhone}\n\n` +
      `🛍️ *PRODUTOS:*\n${linhasProdutos}\n\n` +
      `🚚 *Entrega:* Grátis\n` +
      `💰 *TOTAL: R$ ${selectedOrder.total.toFixed(2).replace('.', ',')}*\n` +
      `💳 *Pagamento:* ${linhaPagamento}\n\n` +
      `_Versão atualizada pelo painel administrativo_`
    );
    
    window.open(`https://wa.me/${NUMERO_LOJA}?text=${msg}`, '_blank');
  };

  const exportToCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Pedido', 'Cliente', 'Telefone', 'Total', 'Pagamento', 'Status', 'Data'];
    const rows = orders.map(o => [
      o.orderNumber || o.id.substr(0, 6),
      o.customerName,
      o.customerPhone,
      o.total.toFixed(2),
      o.paymentMethod,
      o.status,
      new Date(o.createdAt).toLocaleString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedidos_flor_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.orderNumber?.includes(searchTerm) ||
      o.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <p className="text-xs md:text-sm text-muted-foreground">Acompanhe suas vendas.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={exportToCSV}>
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar..." 
            className="pl-10 h-10 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Enviado">Enviado</SelectItem>
              <SelectItem value="Entregue">Entregue</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Pedido</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Total</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">Nenhum pedido.</TableCell></TableRow>
              ) : (
                filteredOrders.slice().reverse().map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/20">
                    <TableCell className="font-bold text-xs whitespace-nowrap">
                      {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.substr(0, 4)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-[80px]">
                        <span className="font-medium text-xs truncate max-w-[100px]">{order.customerName}</span>
                        <span className="text-[9px] text-muted-foreground sm:hidden">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary text-xs hidden sm:table-cell">R$ {order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <div className="hidden sm:block">
                          <Select value={order.status} onValueChange={(v: OrderStatus) => initiateStatusChange(order.id, v)}>
                            <SelectTrigger className="h-8 w-[110px] text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pendente" className="text-[10px]">Pendente</SelectItem>
                              <SelectItem value="Pago" className="text-[10px]">Pago</SelectItem>
                              <SelectItem value="Enviado" className="text-[10px]">Enviado</SelectItem>
                              <SelectItem value="Entregue" className="text-[10px]">Entregue</SelectItem>
                              <SelectItem value="Cancelado" className="text-[10px]">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent className="font-poppins rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Alterar Status</AlertDialogTitle>
            <AlertDialogDescription>
              Você deseja enviar uma mensagem automática via WhatsApp para o cliente notificando a alteração para <strong>{statusToUpdate?.status}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-11" onClick={() => { setStatusToUpdate(null); setIsStatusConfirmOpen(false); }}>Cancelar</AlertDialogCancel>
            <Button variant="outline" className="rounded-xl h-11 border-primary/20 text-primary hover:bg-primary/5" onClick={() => handleStatusChangeExecution(false)}>
              Não, apenas alterar
            </Button>
            <AlertDialogAction className="rounded-xl h-11 bg-primary hover:bg-primary/90 font-bold" onClick={() => handleStatusChangeExecution(true)}>
              Sim, notificar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto font-poppins rounded-2xl p-4 md:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold flex flex-wrap items-center gap-2">
              Pedido {selectedOrder?.orderNumber ? `#${selectedOrder.orderNumber}` : ''}
              {selectedOrder?.status === 'Pendente' && <Badge className="text-[9px] h-5 bg-primary/10 text-primary border-primary/20">Editável</Badge>}
            </DialogTitle>
            <DialogDescription className="text-xs">Resumo detalhado da venda.</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-4 rounded-xl text-xs">
                <div>
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70">Cliente</Label>
                  <p className="font-medium truncate">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70">Telefone</Label>
                  <p className="font-medium">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70">Pagamento</Label>
                  <p className="font-medium">{selectedOrder.paymentMethod} {selectedOrder.change ? `(Troco p/ R$ ${selectedOrder.change})` : ''}</p>
                </div>
                <div>
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70">Status Atual</Label>
                  <div className="mt-1">
                    <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                      <SelectTrigger className="h-8 w-full text-[10px] bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Enviado">Enviado</SelectItem>
                        <SelectItem value="Entregue">Entregue</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Itens</Label>
                <div className="border rounded-xl divide-y bg-white overflow-hidden">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate leading-tight">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground">R$ {item.price.toFixed(2)} unid.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedOrder.status === 'Pendente' ? (
                          <>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-lg" onClick={() => handleUpdateItemQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="text-[11px] font-bold w-4 text-center">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-lg" onClick={() => handleUpdateItemQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive h-6 w-6" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold whitespace-nowrap">{item.quantity}x R$ {item.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedOrder.items.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-[10px] italic">Vazio.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                <span className="font-bold text-primary uppercase text-[10px] tracking-widest">Total</span>
                <span className="text-xl font-bold text-primary">R$ {selectedOrder.total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="lg" className="gap-2 border-green-200 text-green-700 hover:bg-green-50 text-xs font-bold rounded-xl h-12" onClick={resendToWhatsApp}>
                  <MessageCircle className="h-4 w-4" /> Notificar WhatsApp
                </Button>
                {selectedOrder.status === 'Pendente' && (
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-xs font-bold rounded-xl h-12" onClick={saveOrderChanges}>
                    <Save className="h-4 w-4" /> Salvar Alterações
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
