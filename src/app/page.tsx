
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Instagram, 
  MessageCircle, 
  X,
  Star,
  Info,
  Copy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem, Order, Category } from '@/lib/types';
import { getStoredProducts, getStoredCart, saveCart, saveOrder, seedInitialData, getStoredCategories } from '@/lib/storage-utils';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'relevance' | 'price-asc' | 'price-desc' | 'az'>('relevance');
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

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      toast({ variant: "destructive", title: "Esgotado", description: "Infelizmente este item está sem estoque." });
      return;
    }
    const existing = cart.find(item => item.id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    saveCart(newCart);
    toast({ title: "Adicionado!", description: `${product.name} foi adicionado à sacola.` });
  };

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
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

    const order: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
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
      `• ${i.name} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`
    ).join('\n');

    const linhaPagamento = paymentMethod === 'Dinheiro'
      ? `💵 Dinheiro${changeAmount ? ` (troco para R$ ${changeAmount})` : ' (sem troco)'}`
      : `📱 Pix — comprovante a enviar`;

    const msg = encodeURIComponent(
      `🌸 *NOVO PEDIDO — Flor de Batom Makeup*\n\n` +
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
    toast({ title: "Pedido Enviado!", description: "Siga para o WhatsApp para confirmar." });
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText("(91) 98719-9039");
    toast({ title: "Chave Pix Copiada", description: "O número do celular foi copiado para sua área de transferência." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b shadow-sm h-14 md:h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center text-white font-headline text-base md:text-lg font-bold">FB</div>
            <h1 className="text-base md:text-xl font-headline font-bold text-primary truncate max-w-[150px] sm:max-w-none">Flor de Batom Makeup</h1>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-primary hover:bg-primary/5 h-10 w-10">
                  <ShoppingBag className="h-5 w-5 md:h-6 md:h-6" />
                  {cart.length > 0 && (
                    <Badge className="absolute top-1 right-1 px-1 py-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-primary text-white text-[9px] rounded-full border-2 border-white">
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 z-[100]">
                <SheetHeader className="p-4 md:p-6 border-b flex flex-row items-center justify-between">
                  <SheetTitle className="font-headline text-xl md:text-2xl text-primary">Minha Sacola</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <ShoppingBag className="h-12 w-12 mb-4 opacity-10 text-primary" />
                      <p className="text-base font-headline">Sua sacola está vazia 🌸</p>
                      <SheetFooter className="mt-4">
                        <Button variant="outline" className="rounded-full" onClick={() => {}}>Continuar Comprando</Button>
                      </SheetFooter>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 p-3 rounded-lg flex items-start gap-3 border border-green-100">
                        <Info className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-xs md:text-sm font-medium text-green-700 leading-tight">🚚 Entrega Grátis em todos os pedidos!</p>
                      </div>
                      <div className="space-y-4">
                        {cart.map(item => (
                          <div key={item.id} className="flex gap-3 md:gap-4 items-center">
                            <div className="relative h-14 w-14 md:h-16 md:w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs md:text-sm truncate leading-tight">{item.name}</h4>
                              <p className="text-xs md:text-sm text-primary font-bold">R$ {item.price.toFixed(2)}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full shadow-sm" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full shadow-sm" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => updateQuantity(item.id, -item.quantity)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {cart.length > 0 && (
                  <SheetFooter className="p-4 md:p-6 border-t bg-white flex flex-col gap-3">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground font-medium text-sm">Subtotal</span>
                      <span className="text-xl md:text-2xl font-headline font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 py-5 md:py-6 text-base md:text-lg rounded-full" onClick={() => setIsCheckoutOpen(true)}>
                      Finalizar Pedido
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="hero-pattern py-6 md:py-10 flex flex-col items-center justify-center text-white text-center px-4">
        <h2 className="text-xl md:text-3xl font-headline font-bold mb-1">Flor de Batom Makeup</h2>
        <p className="text-[10px] md:text-sm italic opacity-90 font-light tracking-wide uppercase">Maquiagem que transforma — produtos para sua beleza</p>
      </section>

      {/* Categories Bar */}
      <div className="sticky top-14 md:top-16 z-30 bg-white border-b overflow-x-auto no-scrollbar py-2.5 md:py-3">
        <div className="container mx-auto px-4 flex items-center gap-2">
          <Button 
            variant="ghost" 
            className={`rounded-full px-4 md:px-5 h-8 md:h-9 text-[11px] md:text-xs font-medium shrink-0 transition-all ${selectedCategory === 'Todos' ? 'pill-active shadow-sm' : 'pill-inactive'}`}
            onClick={() => setSelectedCategory('Todos')}
          >
            Todos
          </Button>
          {categories.map(cat => (
            <Button 
              key={cat.id} 
              variant="ghost" 
              className={`rounded-full px-4 md:px-5 h-8 md:h-9 text-[11px] md:text-xs font-medium shrink-0 transition-all ${selectedCategory === cat.name ? 'pill-active shadow-sm' : 'pill-inactive'}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="container mx-auto px-4 py-4 md:py-6" id="catalogo">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="O que você procura?" 
              className="pl-10 h-10 md:h-11 border-border/60 rounded-full focus-visible:ring-primary/20 bg-muted/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between w-full md:w-auto gap-4 px-1">
            <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{filteredProducts.length} itens</span>
            <select 
              className="text-[11px] md:text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-primary appearance-none pr-4"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
            >
              <option value="relevance">RELEVÂNCIA</option>
              <option value="price-asc">MENOR PREÇO</option>
              <option value="price-desc">MAIOR PREÇO</option>
              <option value="az">A – Z</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 mt-6 md:mt-10">
          {filteredProducts.map((product, idx) => (
            <Card 
              key={product.id} 
              className="group overflow-hidden border-none shadow-none bg-white flex flex-col h-full product-card-hover fade-in-up"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div 
                className="relative aspect-square overflow-hidden cursor-pointer rounded-xl bg-muted"
                onClick={() => setSelectedProduct(product)}
              >
                <Image 
                  src={product.imageUrl} 
                  alt={product.name} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <Badge className="absolute top-2 left-2 bg-primary/90 text-white text-[9px] font-bold border-none uppercase tracking-tighter px-1.5 py-0.5">
                  {product.category}
                </Badge>
                {product.isFeatured && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-black p-1 rounded-full shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-current" />
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                    <Badge variant="outline" className="bg-white text-carbon border-carbon font-bold uppercase text-[9px]">Esgotado</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-2 md:p-3 flex flex-col flex-1">
                <div className="flex-1">
                  <h3 className="font-medium text-[12px] md:text-sm line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    {product.name}
                  </h3>
                  <p className="text-sm md:text-base font-bold text-primary font-body">R$ {product.price.toFixed(2)}</p>
                </div>
                <Button 
                  className="w-full mt-2 bg-primary hover:bg-primary/90 gap-1.5 h-8 md:h-9 text-[10px] md:text-xs rounded-lg transition-all"
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  disabled={product.stock === 0}
                >
                  <Plus className="h-3 w-3" /> {product.stock === 0 ? 'Indisponível' : 'Adicionar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
            <Info className="h-10 w-10 mb-4 opacity-10 text-primary" />
            <p className="text-base font-headline">Nenhum produto encontrado.</p>
            <Button variant="link" className="text-primary mt-2" onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }}>Limpar Filtros</Button>
          </div>
        )}
      </div>

      {/* Contact Section */}
      <section className="bg-muted/40 py-12 md:py-20 mt-12" id="contato">
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
          <p className="text-[10px] md:text-xs text-muted-foreground mt-8 uppercase tracking-[0.2em] font-bold">Atendimento: Segunda a Sábado, 9h às 18h</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-carbon text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-headline text-sm font-bold">FB</div>
                <h2 className="text-xl font-headline font-bold text-white">Flor de Batom Makeup</h2>
              </div>
              <p className="text-gray-400 text-xs md:text-sm max-w-xs leading-relaxed">O melhor do mundo da beleza com curadoria exclusiva. Maquiagem premium que transforma.</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-6">
              <div className="flex gap-6 text-sm font-medium">
                <a href="#" className="hover:text-primary transition-colors">Início</a>
                <a href="#catalogo" className="hover:text-primary transition-colors">Catálogo</a>
                <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
              </div>
              <div className="flex gap-4">
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => window.open('https://www.instagram.com/flordebatom.makeup', '_blank')}><Instagram className="h-5 w-5" /></Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => window.open('https://wa.me/5591987199039', '_blank')}><MessageCircle className="h-5 w-5" /></Button>
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">© 2026 Flor de Batom Makeup — CNPJ 00.000.000/0001-00</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Product Details Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl z-[100] max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="relative aspect-[1/1] md:aspect-square md:w-1/2 bg-muted border-b md:border-b-0 md:border-r">
                <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} fill className="object-cover" />
                <Badge className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  {selectedProduct.category}
                </Badge>
              </div>
              <div className="p-6 md:p-10 md:w-1/2 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl md:text-4xl font-headline font-bold text-primary mb-2 leading-tight">{selectedProduct.name}</h3>
                  <p className="text-xl md:text-2xl font-bold text-primary mb-6">R$ {selectedProduct.price.toFixed(2)}</p>
                  <div className="h-px w-full bg-border mb-6" />
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8">
                    {selectedProduct.description}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {selectedProduct.stock > 0 ? (
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Em estoque ({selectedProduct.stock} unidades)
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-destructive font-bold bg-destructive/5 px-3 py-1.5 rounded-full border border-destructive/10">
                        <X className="h-3 w-3" /> Esgotado no momento
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                    disabled={selectedProduct.stock === 0}
                  >
                    Adicionar à Sacola
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg z-[100] p-0 overflow-hidden max-h-[95vh] flex flex-col border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 md:p-10 border-b bg-muted/20">
            <DialogTitle className="text-3xl font-headline text-primary text-center">Finalizar Pedido</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-xs md:text-sm mt-2">
              🌸 Quase lá! Informe seus dados para combinarmos a entrega via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
            <div className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Seu Nome Completo *</Label>
                <Input id="name" placeholder="Ex: Maria Silva" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-14 rounded-2xl border-muted-foreground/10 focus-visible:ring-primary/20 bg-muted/5" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Telefone para Contato *</Label>
                <Input id="phone" placeholder="(91) 99999-9999" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-14 rounded-2xl border-muted-foreground/10 focus-visible:ring-primary/20 bg-muted/5" />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Forma de Pagamento *</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v: 'Pix' | 'Dinheiro') => setPaymentMethod(v)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Label 
                  htmlFor="pix"
                  className={`flex items-center space-x-4 border-2 p-4 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'Pix' ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}
                >
                  <RadioGroupItem value="Pix" id="pix" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📱</span>
                      <span className="font-bold text-sm">Pix</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">Transferência instantânea</span>
                  </div>
                </Label>
                <Label 
                  htmlFor="cash"
                  className={`flex items-center space-x-4 border-2 p-4 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'Dinheiro' ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}
                >
                  <RadioGroupItem value="Dinheiro" id="cash" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💵</span>
                      <span className="font-bold text-sm">Dinheiro</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">Pagar na entrega</span>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {paymentMethod === 'Dinheiro' && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="change" className="text-[10px] font-bold text-muted-foreground ml-1">Precisa de troco? Informe para quanto:</Label>
                <Input id="change" type="number" placeholder="Ex: 50" value={changeAmount} onChange={(e) => setChangeAmount(e.target.value)} className="h-12 rounded-xl" />
              </div>
            )}
            
            {paymentMethod === 'Pix' && (
              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-bold text-primary uppercase tracking-widest text-[10px]">Chave Pix (Celular)</p>
                </div>
                <button 
                  onClick={copyPixKey}
                  className="bg-white p-5 rounded-2xl border border-primary/20 shadow-sm flex flex-col items-center gap-2 hover:bg-muted/5 transition-colors group relative overflow-hidden"
                >
                  <span className="font-mono text-lg md:text-xl font-bold tracking-wider text-primary leading-none">(91) 98719-9039</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                    <Copy className="h-3 w-3" />
                    <span className="text-[9px] uppercase font-bold tracking-tighter group-hover:text-primary transition-colors">Toque para copiar</span>
                  </div>
                </button>
                <p className="text-muted-foreground text-[11px] leading-relaxed text-center px-2 italic">
                  ✨ Realize o Pix e anexe o comprovante na conversa que abriremos no seu WhatsApp.
                </p>
              </div>
            )}
            
            <div className="bg-primary p-5 rounded-3xl flex items-center justify-between text-white shadow-xl shadow-primary/20">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total do Pedido</span>
              <span className="text-3xl font-headline font-bold">R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter className="p-6 md:p-10 bg-muted/20 border-t">
            <Button className="w-full bg-[#25D366] hover:bg-[#1fb355] gap-3 h-16 text-lg font-bold rounded-2xl shadow-xl shadow-[#25D366]/20 transition-all active:scale-[0.98]" onClick={handleCheckout}>
              <MessageCircle className="h-6 w-6" /> Confirmar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
