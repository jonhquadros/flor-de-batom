"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, ShoppingBag, Filter, ShoppingCart, Info, Check, Plus, Minus, Trash2, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, Product, CartItem, Order, ProductCategory } from '@/lib/types';
import { getStoredProducts, getStoredCart, saveCart, saveOrder, seedInitialData } from '@/lib/storage-utils';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Todos'>('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { toast } = useToast();

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro'>('Pix');
  const [changeAmount, setChangeAmount] = useState('');

  useEffect(() => {
    seedInitialData();
    setProducts(getStoredProducts());
    setCart(getStoredCart());
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    saveCart(newCart);
    toast({ title: "Adicionado!", description: `${product.name} foi adicionado ao carrinho.` });
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
  const freeShippingLimit = 150;
  const isFreeShipping = cartTotal >= freeShippingLimit;

  const handleCheckout = () => {
    if (!customerName || !customerPhone || !address) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, preencha todos os campos obrigatórios." });
      return;
    }

    const order: Order = {
      id: Math.random().toString(36).substr(2, 9),
      customerName,
      customerPhone,
      address,
      items: cart,
      total: cartTotal,
      paymentMethod,
      change: paymentMethod === 'Dinheiro' ? parseFloat(changeAmount) || 0 : undefined,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
    };

    saveOrder(order);

    // Format WhatsApp Message
    const itemsText = cart.map(i => `${i.quantity}x ${i.name} - R$ ${(i.price * i.quantity).toFixed(2)}`).join('%0A');
    const paymentText = paymentMethod === 'Pix' ? 'Pix (Chave: CNPJ 00.000.000/0001-00)' : `Dinheiro (Troco para R$ ${changeAmount || cartTotal})`;
    const message = `*Novo Pedido Flor de Batom*%0A%0A*Cliente:* ${customerName}%0A*Telefone:* ${customerPhone}%0A*Endereço:* ${address}%0A%0A*Itens:*%0A${itemsText}%0A%0A*Total:* R$ ${cartTotal.toFixed(2)}%0A*Pagamento:* ${paymentText}`;
    
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
    
    setCart([]);
    saveCart([]);
    setIsCheckoutOpen(false);
    toast({ title: "Pedido Enviado!", description: "Você será redirecionado para o WhatsApp." });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">Flor de Batom</h1>
          </div>
          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar produtos..." 
                className="pl-10 bg-muted/50 border-none focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-primary">
                  <ShoppingBag className="h-6 w-6" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center bg-primary text-white text-[10px]">
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="flex items-center gap-2 font-headline text-2xl">
                    <ShoppingCart className="h-5 w-5" /> Meu Carrinho
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mb-4 opacity-20" />
                      <p>Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-accent/30 p-4 rounded-lg flex items-center gap-3">
                        <Info className="h-5 w-5 text-primary" />
                        <div className="text-sm">
                          {isFreeShipping ? (
                            <span className="font-medium text-primary">Parabéns! Você ganhou Frete Grátis!</span>
                          ) : (
                            <span>Faltam <span className="font-bold text-primary">R$ {(freeShippingLimit - cartTotal).toFixed(2)}</span> para ganhar **Frete Grátis**!</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        {cart.map(item => (
                          <div key={item.id} className="flex gap-4 items-center">
                            <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => updateQuantity(item.id, -item.quantity)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {cart.length > 0 && (
                  <SheetFooter className="p-6 border-t flex flex-col gap-4 bg-muted/20">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-xl font-bold">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 py-6 text-lg" onClick={() => setIsCheckoutOpen(true)}>
                      Finalizar Pedido
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Category Navigation Bar */}
      <div className="bg-background border-b sticky top-16 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <Button 
              variant={selectedCategory === 'Todos' ? 'default' : 'outline'} 
              size="sm" 
              className="rounded-full px-5"
              onClick={() => setSelectedCategory('Todos')}
            >
              Todos
            </Button>
            {CATEGORIES.map(cat => (
              <Button 
                key={cat} 
                variant={selectedCategory === cat ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full px-5"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="group overflow-hidden border-none shadow-sm product-card-hover bg-white flex flex-col h-full">
              <div 
                className="relative aspect-square overflow-hidden cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <Image 
                  src={product.imageUrl} 
                  alt={product.name} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  data-ai-hint="beauty makeup product"
                />
                {product.isFeatured && (
                  <Badge className="absolute top-2 left-2 bg-primary text-white">Destaque</Badge>
                )}
              </div>
              <CardContent className="p-3 md:p-4 flex flex-col flex-1">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{product.category}</p>
                  <h3 className="font-medium text-sm md:text-base line-clamp-2 leading-tight mb-2 h-10 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                </div>
                <Button 
                  className="w-full mt-4 bg-primary hover:bg-primary/90 gap-2 h-9 text-sm"
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                >
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Info className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">Nenhum produto encontrado.</p>
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          {selectedProduct && (
            <div className="flex flex-col md:flex-row">
              <div className="relative aspect-square md:w-1/2 bg-muted">
                <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} fill className="object-cover" />
              </div>
              <div className="p-6 md:w-1/2 flex flex-col">
                <DialogHeader className="mb-4">
                  <p className="text-xs text-primary font-bold uppercase tracking-widest">{selectedProduct.category}</p>
                  <DialogTitle className="text-2xl font-headline mt-1">{selectedProduct.name}</DialogTitle>
                </DialogHeader>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-primary mb-4">R$ {selectedProduct.price.toFixed(2)}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {selectedProduct.description}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <Check className="h-3 w-3" /> Em estoque ({selectedProduct.stock} unidades)
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 h-12" onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">Finalizar Pedido</DialogTitle>
            <DialogDescription>
              Preencha seus dados para enviarmos o pedido via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" placeholder="Como devemos te chamar?" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input id="phone" placeholder="(00) 00000-0000" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input id="address" placeholder="Rua, Número, Bairro, Cidade" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Forma de Pagamento</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v: 'Pix' | 'Dinheiro') => setPaymentMethod(v)} className="flex gap-4">
                <div className="flex items-center space-x-2 border p-3 rounded-lg flex-1 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="Pix" id="pix" />
                  <Label htmlFor="pix" className="cursor-pointer">Pix</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg flex-1 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="Dinheiro" id="cash" />
                  <Label htmlFor="cash" className="cursor-pointer">Dinheiro</Label>
                </div>
              </RadioGroup>
            </div>
            {paymentMethod === 'Dinheiro' && (
              <div className="grid gap-2 fade-in">
                <Label htmlFor="change">Troco para quanto?</Label>
                <Input id="change" type="number" placeholder="Ex: 100" value={changeAmount} onChange={(e) => setChangeAmount(e.target.value)} />
              </div>
            )}
            {paymentMethod === 'Pix' && (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex gap-3 items-start fade-in">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-primary">Instruções Pix</p>
                  <p>A chave será enviada no WhatsApp. O pedido só será processado após a confirmação do pagamento.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancelar</Button>
            <Button className="bg-primary hover:bg-primary/90 gap-2 px-8" onClick={handleCheckout}>
              <Send className="h-4 w-4" /> Confirmar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Sticky Footer (only search on mobile) */}
      <div className="md:hidden sticky bottom-0 z-50 p-4 bg-background/80 backdrop-blur border-t flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="pl-10 h-12 rounded-full border-none bg-muted shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}