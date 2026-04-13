"use client"

import React, { useState, useEffect } from 'react';
import { Download, Search, CheckCircle2, Package, Truck, Clock, Eye, MessageCircle, Save, Trash2, Plus, Minus, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus } from '@/lib/types';
import { getStoredOrders, updateOrderStatus, updateOrder } from '@/lib/storage-utils';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  const loadOrders = () => {
    setOrders(getStoredOrders());
  };

  useEffect(() => {
    loadOrders();
    window.addEventListener('storage', loadOrders);
    return () => window.removeEventListener('storage', loadOrders);
  }, []);

  const handleStatusChange = (id: string, status: OrderStatus) => {
    updateOrderStatus(id, status);
    loadOrders();
    toast({ 
      title: status === 'Cancelado' ? "Pedido Cancelado" : "Status Atualizado", 
      description: status === 'Cancelado' ? "O pedido foi marcado como cancelado e ignorado nas métricas." : `Pedido marcado como ${status}.` 
    });
  };

  const openDetails = (order: Order) => {
    setSelectedOrder({ ...order }); // Clone to avoid direct mutations
    setIsDetailsOpen(true);
  };

  const handleUpdateItemQuantity = (id: string, delta: number) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;

    const updatedItems = selectedOrder.items.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
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
    loadOrders();
    setIsDetailsOpen(false);
    toast({ title: "Pedido Atualizado", description: "As alterações foram salvas com sucesso." });
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
    const headers = ['ID', 'Num Pedido', 'Cliente', 'Telefone', 'Total', 'Pagamento', 'Status', 'Data'];
    const rows = orders.map(o => [
      o.id,
      o.orderNumber || '---',
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
    link.setAttribute("download", `pedidos_flor_de_batom_${new Date().toISOString().split('T')[0]}.csv`);
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
      case 'Pendente': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 gap-1"><Clock className="h-3 w-3" /> {status}</Badge>;
      case 'Em Separação': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1"><Package className="h-3 w-3" /> {status}</Badge>;
      case 'Em Entrega': return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 gap-1"><Truck className="h-3 w-3" /> {status}</Badge>;
      case 'Entregue': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> {status}</Badge>;
      case 'Cancelado': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1"><XCircle className="h-3 w-3" /> {status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe e atualize as vendas.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportToCSV}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por nome ou nº pedido..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos Status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Em Separação">Em Separação</SelectItem>
              <SelectItem value="Em Entrega">Em Entrega</SelectItem>
              <SelectItem value="Entregue">Entregue</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
            ) : (
              filteredOrders.slice().reverse().map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-bold text-sm">
                    {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.substr(0, 6)}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customerName}</span>
                      <span className="text-[10px] text-muted-foreground">{order.customerPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate text-xs">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-primary">R$ {order.total.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2 h-12">
                    <Button variant="ghost" size="icon" onClick={() => openDetails(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Select value={order.status} onValueChange={(v: OrderStatus) => handleStatusChange(order.id, v)}>
                      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Em Separação">Em Separação</SelectItem>
                        <SelectItem value="Em Entrega">Em Entrega</SelectItem>
                        <SelectItem value="Entregue">Entregue</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details/Edit Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline flex items-center gap-2">
              Detalhes do Pedido {selectedOrder?.orderNumber ? `#${selectedOrder.orderNumber}` : ''}
              {selectedOrder?.status === 'Pendente' && <Badge className="ml-2">Editável</Badge>}
              {selectedOrder?.status === 'Cancelado' && <Badge variant="destructive" className="ml-2">Cancelado</Badge>}
            </DialogTitle>
            <DialogDescription>
              Visualize o resumo ou edite itens (apenas se pendente).
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg text-sm">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pagamento</Label>
                  <p className="font-medium">{selectedOrder.paymentMethod} {selectedOrder.change ? `(Troco para R$ ${selectedOrder.change})` : ''}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data</Label>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold">Itens do Pedido</Label>
                <div className="border rounded-lg divide-y bg-white">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">Preço unitário: R$ {item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedOrder.status === 'Pendente' ? (
                          <>
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleUpdateItemQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleUpdateItemQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                          </>
                        ) : (
                          <span className="text-xs font-bold">{item.quantity}x R$ {item.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedOrder.items.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-xs italic">Nenhum item restante no pedido.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                <span className="font-bold text-primary uppercase text-xs tracking-widest">Total do Pedido</span>
                <span className="text-2xl font-headline font-bold text-primary">R$ {selectedOrder.total.toFixed(2)}</span>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" className="flex-1 gap-2 border-green-200 text-green-700 hover:bg-green-50" onClick={resendToWhatsApp}>
                  <MessageCircle className="h-4 w-4" /> Reenviar no WhatsApp
                </Button>
                {selectedOrder.status === 'Pendente' && (
                  <Button className="flex-1 gap-2 bg-primary hover:bg-primary/90" onClick={saveOrderChanges}>
                    <Save className="h-4 w-4" /> Salvar Alterações
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
