
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Instagram, 
  MessageCircle, 
  X,
  Star,
  Info,
  Copy,
  Menu,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem, Order, Category } from '@/lib/types';
import { getStoredProducts, getStoredCart, saveCart, saveOrder, seedInitialData, getStoredCategories, getStoredOrders } from '@/lib/storage-utils';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'relevance' | 'price-asc' | 'price-desc' | 'az'>('relevance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro'>('Pix');
  const [changeAmount, setChangeAmount] = useState('');

  useEffect(() => {
    seedInitialData();
    setProducts(getStoredProducts());
    setCategories(getStoredCategories());
    setCart(getStoredCart());
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortOrder === 'price-asc') result.sort((a, b) => a.price - b.price);
    if (sortOrder === 'price-desc') result.sort((a, b) => b.price - a.price);
    if (sortOrder === 'az') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, searchTerm, selectedCategory, sortOrder]);

  const addToCart = (product: Product, color?: string) => {
    if (product.stock === 0) {
      toast({ variant: "destructive", title: "Esgotado", description: "Infelizmente este item está sem estoque." });
      return;
    }

    if (product.colors && product.colors.length > 0 && !color) {
      toast({ variant: "destructive", title: "Escolha uma cor", description: "Por favor, selecione uma opção antes de adicionar." });
      return;
    }

    const cartId = color ? `${product.id}-${color}` : product.id;
    const existing = cart.find(item => {
        const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
        return itemKey === cartId;
    });

    let newCart;
    if (existing) {
      newCart = cart.map(item => {
          const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
          return itemKey === cartId ? { ...item, quantity: item.quantity + 1 } : item;
      });
    } else {
      newCart = [...cart, { ...product, quantity: 1, selectedColor: color }];
    }

    setCart(newCart);
    saveCart(newCart);
    toast({ title: "Adicionado!", description: `${product.name} ${color ? `(${color})` : ''} foi adicionado à sacola.` });
  };

  const updateQuantity = (id: string, delta: number, color?: string) => {
    const cartId = color ? `${id}-${color}` : id;
    const newCart = cart.map(item => {
      const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
      if (itemKey === cartId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
    saveCart(newCart);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (!customerName || !customerPhone) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, preencha seu nome e telefone." });
      return;
    }

    const currentOrders = getStoredOrders();
    const nextOrderNumber = (currentOrders.length + 1).toString().padStart(5, '0');

    const order: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      orderNumber: nextOrderNumber,
      customerName,
      customerPhone,
      items: cart,
      total: cartTotal,
      paymentMethod,
      change: paymentMethod === 'Dinheiro' ? parseFloat(changeAmount) || 0 : undefined,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
    };

    saveOrder(order);

    const NUMERO_LOJA = "5591987199039";
    const linhasProdutos = cart.map(i =>
      `• ${i.name}${i.selectedColor ? ` [${i.selectedColor}]` : ''} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`
    ).join('\n');

    const linhaPagamento = paymentMethod === 'Dinheiro'
      ? `💵 Dinheiro${changeAmount ? ` (troco para R$ ${changeAmount})` : ' (sem troco)'}`
      : `📱 Pix — comprovante a enviar`;

    const msg = encodeURIComponent(
      `🌸 *PEDIDO #${nextOrderNumber} — Flor de Batom Makeup*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n\n` +
      `🛍️ *PRODUTOS:*\n${linhasProdutos}\n\n` +
      `🚚 *Entrega:* Grátis\n` +
      `💰 *TOTAL: R$ ${cartTotal.toFixed(2).replace('.', ',')}*\n` +
      `💳 *Pagamento:* ${linhaPagamento}\n\n` +
      `_Pedido enviado pelo catálogo online_`
    );
    
    window.open(`https://wa.me/${NUMERO_LOJA}?text=${msg}`, '_blank');
    
    setCart([]);
    saveCart([]);
    setIsCheckoutOpen(false);
    toast({ title: "Pedido Enviado!", description: `Pedido #${nextOrderNumber} realizado com sucesso.` });
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText("(91) 98719-9039");
    toast({ title: "Chave Pix Copiada", description: "O número do celular foi copiado para sua área de transferência." });
  };

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-foreground">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r sticky top-0 h-screen overflow-y-auto z-40 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-headline text-lg font-bold">FB</div>
          <h1 className="text-xl font-headline font-bold text-primary leading-tight">Flor de Batom</h1>
        </div>
        
        <nav className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Categorias</p>
          <button 
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
            onClick={() => setSelectedCategory('Todos')}
          >
            Todos os Produtos
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${selectedCategory === cat.name ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Compacto */}
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b h-16 md:h-20">
          <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <Button variant="ghost" size="icon" className="text-primary" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar maquiagem..." 
                className="pl-11 h-11 bg-muted/40 border-none rounded-2xl focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-primary h-12 w-12 md:h-14 md:w-14 hover:bg-primary/5 rounded-2xl transition-all">
                    <ShoppingCart className="h-7 w-7 md:h-9 md:w-9" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] md:min-w-[24px] md:h-[24px] bg-primary text-white text-[10px] md:text-xs font-bold flex items-center justify-center rounded-full border-2 border-white shadow-md">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[100] border-none shadow-2xl">
                  <SheetHeader className="p-6 border-b text-left">
                    <SheetTitle className="font-headline text-2xl text-primary">Sua Sacola</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <ShoppingCart className="h-20 w-20 mb-4" />
                        <p className="font-medium">Sua sacola está vazia.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="bg-green-50 p-4 rounded-2xl text-xs font-bold text-green-700 flex gap-2 items-center">
                          <Info className="h-4 w-4" /> Entrega Grátis em todo o site! 🚚
                        </div>
                        {cart.map(item => (
                          <div key={`${item.id}-${item.selectedColor || 'no-color'}`} className="flex gap-4 items-center">
                            <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border">
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm truncate">{item.name}</h4>
                              {item.selectedColor && (
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Cor: {item.selectedColor}</p>
                              )}
                              <p className="text-primary font-bold text-base">R$ {item.price.toFixed(2)}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center border rounded-full px-2 py-1 bg-muted/30">
                                  <button onClick={() => updateQuantity(item.id, -1, item.selectedColor)} className="p-1 hover:text-primary transition-colors"><Minus className="h-3 w-3" /></button>
                                  <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.id, 1, item.selectedColor)} className="p-1 hover:text-primary transition-colors"><Plus className="h-3 w-3" /></button>
                                </div>
                                <button onClick={() => updateQuantity(item.id, -item.quantity, item.selectedColor)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {cart.length > 0 && (
                    <SheetFooter className="p-6 border-t bg-white">
                      <div className="w-full space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-muted-foreground font-medium">Subtotal</span>
                          <span className="text-3xl font-headline font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <Button className="w-full bg-primary hover:bg-primary/90 h-16 rounded-3xl text-lg font-bold shadow-xl shadow-primary/20" onClick={() => setIsCheckoutOpen(true)}>
                          Finalizar Pedido
                        </Button>
                      </div>
                    </SheetFooter>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20">
          {/* Hero Banner */}
          <div className="px-4 pt-6">
            <div className="container mx-auto">
              <div className="relative bg-primary rounded-[2.5rem] overflow-hidden min-h-[160px] md:min-h-[240px] flex items-center hero-pattern shadow-2xl shadow-primary/10">
                <div className="flex flex-col md:flex-row w-full p-8 md:p-12 items-center justify-between gap-6">
                  <div className="text-center md:text-left space-y-2 max-w-lg">
                    <h2 className="text-2xl md:text-5xl font-headline font-bold text-white leading-tight">Maquiagem que Transforma</h2>
                    <p className="text-white/80 text-xs md:text-lg italic font-light">Sua beleza merece o melhor cuidado premium.</p>
                  </div>
                  <div className="relative h-32 w-32 md:h-56 md:w-56 shrink-0">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-full scale-110" />
                    <Image 
                      src="https://picsum.photos/seed/hero/400/400" 
                      alt="Beleza" 
                      fill 
                      className="object-cover rounded-full border-4 border-white/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categorias Horizontal Mobile */}
          <div className="lg:hidden mt-8 px-4 overflow-x-auto no-scrollbar pb-2">
            <div className="flex gap-2 min-w-max">
              <Button 
                variant="ghost" 
                className={`rounded-full px-6 h-10 font-bold transition-all ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-lg' : 'bg-white border text-muted-foreground'}`}
                onClick={() => setSelectedCategory('Todos')}
              >
                Todos
              </Button>
              {categories.map(cat => (
                <Button 
                  key={cat.id} 
                  variant="ghost" 
                  className={`rounded-full px-6 h-10 font-bold transition-all ${selectedCategory === cat.name ? 'bg-primary text-white shadow-lg' : 'bg-white border text-muted-foreground'}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid de Produtos */}
          <div className="container mx-auto px-4 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-2">
                {selectedCategory} <span className="text-[10px] md:text-sm font-body text-muted-foreground font-medium">({filteredProducts.length} itens)</span>
              </h3>
              <select 
                className="bg-transparent text-xs font-bold text-primary focus:ring-0 cursor-pointer appearance-none border-none pr-4"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="relevance">RELEVÂNCIA</option>
                <option value="price-asc">MENOR PREÇO</option>
                <option value="price-desc">MAIOR PREÇO</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map((product, idx) => (
                <Card 
                  key={product.id} 
                  className="group relative border-none bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 fade-in-up flex flex-col h-full"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div 
                    className="relative aspect-square cursor-pointer overflow-hidden bg-muted"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {product.isFeatured && (
                      <div className="absolute top-3 right-3 bg-yellow-400 text-black p-1.5 rounded-full shadow-lg">
                        <Star className="h-3 w-3 fill-current" />
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-carbon text-white px-3 py-1.5 rounded-full">Esgotado</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 md:p-5 flex flex-col flex-1">
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">{product.category}</p>
                      <h4 className="font-medium text-xs md:text-sm leading-tight line-clamp-2 min-h-[2.5em] group-hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedProduct(product)}>
                        {product.name}
                      </h4>
                      <p className="text-base md:text-xl font-headline font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>
                    
                    <button 
                      className="absolute bottom-3 right-3 h-10 w-10 md:h-12 md:w-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-90 disabled:opacity-20 disabled:scale-100"
                      onClick={() => setSelectedProduct(product)}
                      disabled={product.stock === 0}
                    >
                      <Plus className="h-5 w-5 md:h-6 md:h-6" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sessão Fale Conosco */}
          <section className="bg-muted/40 py-12 md:py-20 mt-16" id="contato">
            <div className="container mx-auto px-4 text-center max-w-2xl">
              <h2 className="text-2xl md:text-4xl font-headline font-bold text-primary mb-3">Fale Conosco</h2>
              <p className="text-xs md:text-base text-muted-foreground mb-10 leading-relaxed px-4">Dúvidas sobre produtos ou pedidos especiais? Estamos prontos para te atender pessoalmente.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                <Button 
                  className="bg-[#25D366] hover:bg-[#1fb355] h-14 md:h-16 text-white font-bold gap-3 rounded-2xl shadow-lg shadow-[#25D366]/20 transition-transform active:scale-95"
                  onClick={() => window.open('https://wa.me/5591987199039', '_blank')}
                >
                  <MessageCircle className="h-6 w-6" /> WhatsApp Loja
                </Button>
                <Button 
                  className="bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] h-14 md:h-16 text-white font-bold gap-3 rounded-2xl shadow-lg shadow-orange-500/20 transition-transform active:scale-95"
                  onClick={() => window.open('https://www.instagram.com/flordebatom.makeup', '_blank')}
                >
                  <Instagram className="h-6 w-6" /> Instagram
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-carbon text-white py-12">
          <div className="container mx-auto px-4 text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-headline text-sm font-bold">FB</div>
              <h2 className="text-xl font-headline font-bold text-white">Flor de Batom Makeup</h2>
            </div>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">© 2026 Flor de Batom Makeup</p>
          </div>
        </footer>
      </div>

      {/* Mobile Sidebar Menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[85%] p-0 border-none shadow-2xl z-[100]">
          <div className="h-full flex flex-col bg-white">
            <SheetHeader className="p-8 border-b flex flex-row items-center gap-3 bg-primary/5 text-left">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-headline text-lg font-bold">FB</div>
              <SheetTitle className="text-2xl font-headline font-bold text-primary">Categorias</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <button 
                className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-between ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground border border-transparent'}`}
                onClick={() => { setSelectedCategory('Todos'); setIsMobileMenuOpen(false); }}
              >
                Todos {selectedCategory === 'Todos' && <ChevronRight className="h-5 w-5" />}
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-between ${selectedCategory === cat.name ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground border border-transparent'}`}
                  onClick={() => { setSelectedCategory(cat.name); setIsMobileMenuOpen(false); }}
                >
                  {cat.name} {selectedCategory === cat.name && <ChevronRight className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Product Details Modal (Refined with Color selection) */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if(!open) { setSelectedProduct(null); setSelectedColor(''); } }}>
        <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden border-none shadow-2xl z-[110] max-h-[95vh] md:max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
          {selectedProduct && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="relative aspect-square md:w-1/2 bg-muted">
                <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} fill className="object-cover" />
                <Badge className="absolute top-6 left-6 bg-white/90 backdrop-blur text-primary font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-full shadow-lg border-none">
                  {selectedProduct.category}
                </Badge>
              </div>
              <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-between bg-white">
                <div className="space-y-8">
                  <DialogHeader className="text-left space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60">{selectedProduct.category}</p>
                    <DialogTitle className="text-3xl md:text-4xl font-headline font-bold text-primary leading-tight">{selectedProduct.name}</DialogTitle>
                    <DialogDescription className="sr-only">Visualizar detalhes de {selectedProduct.name}</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* UI de Seleção de Cor conforme imagem */}
                    {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-bold text-foreground">Cor</Label>
                          <span className="text-[10px] text-primary italic font-medium">Escolha uma opção</span>
                        </div>
                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                          <SelectTrigger className="h-14 rounded-2xl border-muted bg-muted/10 text-sm font-medium focus:ring-primary/20">
                            <SelectValue placeholder="Escolha uma opção" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl z-[120]">
                            {selectedProduct.colors.map(color => (
                              <SelectItem key={color} value={color} className="rounded-xl py-3 cursor-pointer">
                                {color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A partir de</p>
                      <p className="text-3xl md:text-4xl font-headline font-bold text-primary">R$ {selectedProduct.price.toFixed(2)}</p>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed border-t pt-6">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 h-16 text-lg font-bold rounded-3xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                    onClick={() => { addToCart(selectedProduct, selectedColor); setSelectedProduct(null); setSelectedColor(''); }}
                    disabled={selectedProduct.stock === 0}
                  >
                    Adicionar
                  </Button>
                  <button 
                    className="w-full text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
                    onClick={() => window.open(`https://wa.me/5591987199039?text=Olá! Gostaria de tirar uma dúvida sobre o produto: ${selectedProduct.name}`, '_blank')}
                  >
                    <MessageCircle className="h-3 w-3" /> Dúvidas sobre o produto? WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg z-[110] p-0 overflow-hidden max-h-[95vh] flex flex-col border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader className="p-8 md:p-12 border-b bg-muted/20 text-center">
            <DialogTitle className="text-3xl font-headline text-primary">Finalizar Pedido</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs md:text-sm mt-2 font-medium">
              Informe seus dados para combinarmos a entrega via WhatsApp. 🌸
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10">
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Seu Nome Completo *</Label>
                <Input id="name" placeholder="Ex: Maria Silva" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-14 rounded-2xl border-muted-foreground/10 focus-visible:ring-primary/20 bg-muted/5 font-medium" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Telefone para Contato *</Label>
                <Input id="phone" placeholder="(91) 99999-9999" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-14 rounded-2xl border-muted-foreground/10 focus-visible:ring-primary/20 bg-muted/5 font-medium" />
              </div>
            </div>

            <div className="space-y-5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Forma de Pagamento *</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v: 'Pix' | 'Dinheiro') => setPaymentMethod(v)} className="grid grid-cols-1 gap-4">
                <Label 
                  htmlFor="pix"
                  className={`flex items-center space-x-4 border-2 p-5 rounded-3xl cursor-pointer transition-all ${paymentMethod === 'Pix' ? 'border-primary bg-primary/5 shadow-inner' : 'border-border bg-white hover:border-primary/30'}`}
                >
                  <RadioGroupItem value="Pix" id="pix" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📱</span>
                      <span className="font-bold text-base">Pix</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">Transferência instantânea</span>
                  </div>
                </Label>
                <Label 
                  htmlFor="cash"
                  className={`flex items-center space-x-4 border-2 p-5 rounded-3xl cursor-pointer transition-all ${paymentMethod === 'Dinheiro' ? 'border-primary bg-primary/5 shadow-inner' : 'border-border bg-white hover:border-primary/30'}`}
                >
                  <RadioGroupItem value="Dinheiro" id="cash" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💵</span>
                      <span className="font-bold text-base">Dinheiro</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">Pagar na entrega</span>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {paymentMethod === 'Dinheiro' && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="change" className="text-[10px] font-bold text-muted-foreground ml-1 uppercase tracking-widest">Troco para quanto?</Label>
                <Input id="change" type="number" placeholder="Ex: 100" value={changeAmount} onChange={(e) => setChangeAmount(e.target.value)} className="h-14 rounded-2xl bg-muted/5 font-bold" />
              </div>
            )}
            
            {paymentMethod === 'Pix' && (
              <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 space-y-6 animate-in fade-in slide-in-from-top-2 shadow-inner">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Chave Pix Celular</p>
                  <button 
                    onClick={copyPixKey}
                    className="bg-white px-8 py-5 rounded-[1.5rem] border border-primary/20 shadow-md flex flex-col items-center gap-2 hover:bg-muted/5 transition-all group w-full"
                  >
                    <span className="font-mono text-xl md:text-2xl font-bold tracking-wider text-primary">(91) 98719-9039</span>
                    <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <Copy className="h-3 w-3" />
                      <span className="text-[10px] uppercase font-bold tracking-tighter">Copiar Chave</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-primary p-6 rounded-[2rem] flex items-center justify-between text-white shadow-2xl shadow-primary/30">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Final</span>
              <span className="text-3xl font-headline font-bold">R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter className="p-8 md:p-12 bg-muted/20 border-t">
            <Button className="w-full bg-[#25D366] hover:bg-[#1fb355] gap-3 h-18 py-6 text-xl font-bold rounded-3xl shadow-2xl shadow-[#25D366]/20 transition-all active:scale-[0.98]" onClick={handleCheckout}>
              <MessageCircle className="h-7 w-7" /> Confirmar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
