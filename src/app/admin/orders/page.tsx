
"use client"

import React, { useState, useEffect } from 'react';
import { Download, Search, CheckCircle2, Package, Truck, Clock, Eye, MessageCircle, Save, Trash2, Plus, Minus, XCircle, ShoppingPlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus, Product, CartItem } from '@/lib/types';
import { getStoredOrders, updateOrderStatus, updateOrder, getStoredProducts } from '@/lib/storage-utils';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
  
  const { toast } = useToast();

  const loadData = () => {
    setOrders(getStoredOrders());
    setProducts(getStoredProducts().filter(p => p.isActive !== false));
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
    statusToUpdate && setStatusToUpdate(null);
    
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
    setIsAddingProduct(false);
  };

  const handleUpdateItemQuantity = (id: string, delta: number, color?: string) => {
    if (!selectedOrder || selectedOrder.status !== 'Pendente') return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    // Verificação de estoque da variação específica
    if (delta > 0) {
      let availableStock = product.stock;
      if (product.variations && color) {
        const variation = product.variations.find(v => v.name === color);
        availableStock = variation?.stock || 0;
      }

      const itemInOrder = selectedOrder.items.find(item => item.id === id && item.selectedColor === color);
      const currentQty = itemInOrder?.quantity || 0;

      if (currentQty + delta > availableStock) {
        toast({ 
          variant: "destructive", 
          title: "Estoque Insuficiente", 
          description: `Este produto possui apenas ${availableStock} unidades disponíveis desta cor.` 
        });
        return;
      }
    }

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
    
    const hasVariations = selectedProductToAdd.variations && selectedProductToAdd.variations.length > 0;
    if (hasVariations && !selectedColorToAdd) {
      toast({ variant: "destructive", title: "Escolha uma cor" });
      return;
    }

    // Verifica estoque disponível
    let availableStock = selectedProductToAdd.stock;
    if (hasVariations && selectedColorToAdd) {
      const v = selectedProductToAdd.variations?.find(v => v.name === selectedColorToAdd);
      availableStock = v?.stock || 0;
    }

    const existingInOrder = selectedOrder.items.find(i => i.id === selectedProductToAdd.id && i.selectedColor === selectedColorToAdd);
    const qtyInOrder = existingInOrder?.quantity || 0;

    if (qtyInOrder + quantityToAdd > availableStock) {
      toast({ variant: "destructive", title: "Sem estoque suficiente" });
      return;
    }

    let updatedItems: CartItem[];
    if (existingInOrder) {
      updatedItems = selectedOrder.items.map(i => 
        (i.id === selectedProductToAdd.id && i.selectedColor === selectedColorToAdd) 
        ? { ...i, quantity: i.quantity + quantityToAdd } 
        : i
      );
    } else {
      updatedItems = [
        ...selectedOrder.items,
        { ...selectedProductToAdd, quantity: quantityToAdd, selectedColor: selectedColorToAdd }
      ];
    }

    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setSelectedOrder({ ...selectedOrder, items: updatedItems, total: newTotal });
    
    // Reset form
    setIsAddingProduct(false);
    setSelectedProductToAdd(null);
    setSelectedColorToAdd('');
    setQuantityToAdd(1);
    toast({ title: "Produto Adicionado" });
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
      `• ${i.name}${i.selectedColor ? ` [${i.selectedColor}]` : ''} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`
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

  const filteredProductsToAdd = products.filter(p => 
    p.name.toLowerCase().includes(addingProductSearch.toLowerCase()) && p.stock > 0
  );

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pedidos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Acompanhe suas vendas.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto rounded-xl" onClick={exportToCSV}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar cliente ou pedido..." 
            className="pl-10 h-12 text-sm rounded-xl border-none bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 text-sm rounded-xl border-none bg-white shadow-sm"><SelectValue placeholder="Filtrar Status" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Enviado">Enviado</SelectItem>
              <SelectItem value="Entregue">Entregue</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[10px] uppercase font-bold tracking-widest">Pedido</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest">Cliente</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest hidden sm:table-cell">Total</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm italic">Nenhum pedido encontrado.</TableCell></TableRow>
              ) : (
                filteredOrders.slice().reverse().map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/10 h-20">
                    <TableCell className="font-bold text-xs text-primary">
                      {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.substr(0, 4)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-[80px]">
                        <span className="font-bold text-xs truncate max-w-[120px]">{order.customerName}</span>
                        <span className="text-[9px] text-muted-foreground sm:hidden font-bold">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary text-xs hidden sm:table-cell">R$ {order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10" onClick={() => openDetails(order)}>
                          <Eye className="h-5 w-5 text-primary" />
                        </Button>
                        <div className="hidden md:block">
                          <Select value={order.status} onValueChange={(v: OrderStatus) => initiateStatusChange(order.id, v)}>
                            <SelectTrigger className="h-9 w-[110px] text-[10px] rounded-xl font-bold uppercase tracking-wider"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Pendente" className="text-[10px] font-bold">PENDENTE</SelectItem>
                              <SelectItem value="Pago" className="text-[10px] font-bold">PAGO</SelectItem>
                              <SelectItem value="Enviado" className="text-[10px] font-bold">ENVIADO</SelectItem>
                              <SelectItem value="Entregue" className="text-[10px] font-bold">ENTREGUE</SelectItem>
                              <SelectItem value="Cancelado" className="text-[10px] font-bold">CANCELADO</SelectItem>
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
        <AlertDialogContent className="font-poppins rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-primary">Alterar Status do Pedido</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Você deseja enviar uma notificação via WhatsApp para a cliente avisando que o status mudou para <strong>{statusToUpdate?.status}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl h-12 font-bold" onClick={() => { setStatusToUpdate(null); setIsStatusConfirmOpen(false); }}>Voltar</AlertDialogCancel>
            <Button variant="outline" className="rounded-xl h-12 border-primary/20 text-primary hover:bg-primary/5 font-bold" onClick={() => handleStatusChangeExecution(false)}>
              Apenas Alterar
            </Button>
            <AlertDialogAction className="rounded-xl h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20" onClick={() => handleStatusChangeExecution(true)}>
              Alterar e Notificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto font-poppins rounded-[2.5rem] p-6 md:p-10 border-none shadow-2xl">
          <DialogHeader className="text-left">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                  Pedido {selectedOrder?.orderNumber ? `#${selectedOrder.orderNumber}` : ''}
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-60">Resumo completo da venda</DialogDescription>
              </div>
              {selectedOrder?.status === 'Pendente' && (
                <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full py-1 px-3 text-[9px] font-bold uppercase tracking-widest">Modo Edição</Badge>
              )}
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-6 rounded-2xl text-xs">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70 tracking-widest">Cliente</Label>
                  <p className="font-bold text-sm">{selectedOrder.customerName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70 tracking-widest">Telefone</Label>
                  <p className="font-bold text-sm">{selectedOrder.customerPhone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70 tracking-widest">Pagamento</Label>
                  <p className="font-bold text-sm">{selectedOrder.paymentMethod} {selectedOrder.change ? `(Troco p/ R$ ${selectedOrder.change})` : ''}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground opacity-70 tracking-widest">Status do Pedido</Label>
                  <div className="mt-1">
                    <Select value={selectedOrder.status} onValueChange={(v: OrderStatus) => initiateStatusChange(selectedOrder.id, v)}>
                      <SelectTrigger className="h-10 w-full text-[10px] bg-white rounded-xl border-none shadow-sm font-bold uppercase tracking-widest"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Pendente" className="text-[10px] font-bold">PENDENTE</SelectItem>
                        <SelectItem value="Pago" className="text-[10px] font-bold">PAGO</SelectItem>
                        <SelectItem value="Enviado" className="text-[10px] font-bold">ENVIADO</SelectItem>
                        <SelectItem value="Entregue" className="text-[10px] font-bold">ENTREGUE</SelectItem>
                        <SelectItem value="Cancelado" className="text-[10px] font-bold">CANCELADO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">Itens Selecionados</Label>
                  {selectedOrder.status === 'Pendente' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsAddingProduct(!isAddingProduct)}
                      className="rounded-full h-8 px-4 text-[10px] font-bold uppercase border-primary/20 text-primary"
                    >
                      {isAddingProduct ? 'Fechar Busca' : '+ Adicionar Produto'}
                    </Button>
                  )}
                </div>

                {isAddingProduct && (
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar produto para adicionar..." 
                        value={addingProductSearch}
                        onChange={(e) => setAddingProductSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-white text-xs border-none"
                      />
                    </div>
                    
                    {selectedProductToAdd ? (
                      <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-primary">{selectedProductToAdd.name}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedProductToAdd(null)}>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {selectedProductToAdd.variations && selectedProductToAdd.variations.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase">Cor</Label>
                              <Select value={selectedColorToAdd} onValueChange={setSelectedColorToAdd}>
                                <SelectTrigger className="h-9 text-[10px] rounded-lg border-muted-foreground/10">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {selectedProductToAdd.variations.map(v => (
                                    <SelectItem key={v.name} value={v.name} disabled={v.stock <= 0} className="text-[10px]">
                                      {v.name} ({v.stock})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase">Quantidade</Label>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}><Minus className="h-3 w-3" /></Button>
                              <span className="text-xs font-bold w-4 text-center">{quantityToAdd}</span>
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setQuantityToAdd(quantityToAdd + 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                        
                        <Button className="w-full h-10 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90" onClick={handleAddProductToOrder}>
                          Confirmar Adição
                        </Button>
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredProductsToAdd.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedProductToAdd(p)}
                            className="p-3 bg-white hover:bg-primary/5 cursor-pointer rounded-xl flex justify-between items-center transition-colors border border-transparent hover:border-primary/10"
                          >
                            <span className="text-[11px] font-bold truncate pr-2">{p.name}</span>
                            <span className="text-[10px] font-bold text-primary shrink-0">R$ {p.price.toFixed(2)}</span>
                          </div>
                        ))}
                        {filteredProductsToAdd.length === 0 && (
                          <p className="text-center py-4 text-[10px] text-muted-foreground italic">Nenhum produto com estoque encontrado.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="border rounded-2xl divide-y bg-white overflow-hidden shadow-sm">
                  {selectedOrder.items.map(item => (
                    <div key={item.id + (item.selectedColor || '')} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate leading-tight text-primary">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                          {item.selectedColor ? `COR: ${item.selectedColor} • ` : ''}R$ {item.price.toFixed(2)} un.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedOrder.status === 'Pendente' ? (
                          <>
                            <div className="flex items-center border rounded-lg px-2 bg-muted/20">
                              <button onClick={() => handleUpdateItemQuantity(item.id, -1, item.selectedColor)} className="p-1 hover:text-primary transition-colors"><Minus className="h-3 w-3" /></button>
                              <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                              <button onClick={() => handleUpdateItemQuantity(item.id, 1, item.selectedColor)} className="p-1 hover:text-primary transition-colors"><Plus className="h-3 w-3" /></button>
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-red-50" onClick={() => handleRemoveItem(item.id, item.selectedColor)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-bold whitespace-nowrap text-primary">{item.quantity}x</span>
                            <p className="text-[10px] font-bold text-muted-foreground">R$ {(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedOrder.items.length === 0 && (
                    <div className="p-10 text-center text-muted-foreground text-[11px] italic">O pedido está vazio no momento.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-primary p-6 rounded-[1.5rem] shadow-xl shadow-primary/20">
                <span className="font-bold text-white/80 uppercase text-[10px] tracking-[0.2em]">Total do Pedido</span>
                <span className="text-3xl font-bold text-white">R$ {selectedOrder.total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pb-4">
                <Button variant="outline" size="lg" className="gap-2 border-green-200 text-green-700 hover:bg-green-50 text-xs font-bold rounded-2xl h-14 transition-all shadow-sm" onClick={resendToWhatsApp}>
                  <MessageCircle className="h-5 w-5" /> Notificar Cliente (WhatsApp)
                </Button>
                {selectedOrder.status === 'Pendente' && (
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-xs font-bold rounded-2xl h-14 transition-all shadow-xl shadow-primary/20" onClick={saveOrderChanges}>
                    <Save className="h-5 w-5" /> Salvar Alterações
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
