
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Menu,
  ChevronRight,
  ShoppingBag,
  Truck,
  Sparkles,
  MessageCircle,
  Instagram,
  MapPin,
  Heart,
  Copy,
  Share2,
  Gift,
  X,
  PlayCircle,
  Store
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem, Order, Category } from '@/lib/types';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser,
  FirebaseContext
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { saveOrderToFirestore, getNextOrderNumber } from '@/lib/storage-utils';

export default function Storefront() {
  const firebaseCtx = React.useContext(FirebaseContext);
  const db = firebaseCtx?.firestore;
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), where('isActive', '==', true));
  }, [db]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'categories');
  }, [db]);

  const { data: productsRaw } = useCollection<Product>(productsQuery as any);
  const { data: categoriesRaw } = useCollection<Category>(categoriesQuery as any);

  const categories = useMemo(() => {
    if (!mounted || !categoriesRaw) return [];
    return [...categoriesRaw]
      .filter(cat => cat.name.toLowerCase().trim() !== 'monte seu presente')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [categoriesRaw, mounted]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito'>('Pix');
  const [changeAmount, setChangeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const LOGO_URL = "https://i.ibb.co/6J4J1LMd/florlogo.jpg";
  const WHATSAPP_LOJA = "5591987199039";

  useEffect(() => {
    if (!mounted) return;
    const savedCart = localStorage.getItem('flordebatom_carrinho_v3');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) { setCart([]); }
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('flordebatom_carrinho_v3', JSON.stringify(cart));
  }, [cart, mounted]);

  const filteredProducts = useMemo(() => {
    if (!mounted || !productsRaw) return [];
    return [...productsRaw].filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [productsRaw, searchTerm, selectedCategory, mounted]);

  const updateQuantity = (id: string, delta: number, color?: string) => {
    const cartId = color ? `${id}-${color}` : id;
    
    const originalProduct = productsRaw?.find(p => p.id === id);
    if (!originalProduct) return;

    let availableStock = originalProduct.stock;
    if (color && originalProduct.variations) {
      const v = originalProduct.variations.find(v => v.name === color);
      availableStock = v ? v.stock : 0;
    }

    const newCart = cart.map(item => {
      const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
      if (itemKey === cartId) {
        const nextQty = item.quantity + delta;
        if (delta > 0 && nextQty > availableStock) {
          toast({
            variant: "destructive",
            title: "Limite atingido",
            description: `Apenas disponível ${availableStock} unidades deste item.`
          });
          return item;
        }
        return { ...item, quantity: Math.max(0, nextQty) };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
  };

  const shareOnWhatsApp = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/produto/${product.id}`;
    const msg = encodeURIComponent(
      `🌸 *Flor de Batom Makeup*\n\n` +
      `Olha que lindo esse produto! 😍\n\n` +
      `🛍️ *${product.name}*\n` +
      `💰 R$ ${product.price.toFixed(2).replace('.', ',')}\n\n` +
      `🔗 Ver no catálogo:\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setTimeout(() => {
      setIsCheckoutOpen(true);
    }, 300);
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone || !customerAddress || !db) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome, telefone e endereço." });
      return;
    }

    setIsProcessing(true);
    try {
      const orderNum = await getNextOrderNumber(db);
      const orderId = `ORD-${Date.now()}-${orderNum}`;
      const orderData: any = {
        id: orderId,
        orderNumber: orderNum,
        customerName,
        customerPhone,
        customerAddress,
        items: cart,
        total: cartTotal,
        paymentMethod,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
      };
      
      if (paymentMethod === 'Dinheiro') orderData.change = parseFloat(changeAmount.replace(',', '.')) || 0;
      
      await saveOrderToFirestore(db, orderData as Order);
      
      const linhasProdutos = cart.map(i => {
        const labelCor = i.selectedColor ? ` [${i.selectedColor}]` : '';
        return `• ${i.name}${labelCor} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`;
      }).join('\n');

      let linhaPagamento = "";
      if (paymentMethod === 'Dinheiro') {
        linhaPagamento = `💵 Dinheiro${changeAmount ? ` (troco para R$ ${changeAmount.replace('.', ',')})` : ' (sem troco)'}`;
      } else if (paymentMethod === 'Pix') {
        linhaPagamento = `📱 Pix — comprovante a enviar`;
      } else {
        linhaPagamento = `💳 ${paymentMethod}`;
      }

      const totalFormatado = cartTotal.toFixed(2).replace('.', ',');
      const msg = encodeURIComponent(
        `🌸 *NOVO PEDIDO #${orderNum} - Flor de Batom Makeup*\n\n` +
        `👤 *Cliente:* ${customerName}\n` +
        `📱 *Telefone:* ${customerPhone}\n` +
        `📍 *Endereço:* ${customerAddress}\n\n` +
        `🛍️ *PRODUTOS:*\n${linhasProdutos}\n\n` +
        `💰 *TOTAL: R$ ${totalFormatado}*\n` +
        `💳 *Pagamento:* ${linhaPagamento}\n\n` +
        `_Pedido enviado pelo catálogo online_`
      );
      
      window.open(`https://wa.me/${WHATSAPP_LOJA}?text=${msg}`, '_blank');
      
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      toast({ title: "Pedido Finalizado!", description: "Sua reserva foi garantida e o estoque atualizado." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar pedido." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-foreground font-poppins">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r sticky top-0 h-screen z-40 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md border-2 border-primary/20">
            <Image src={LOGO_URL} alt="Logo" fill className="object-cover" />
          </div>
          <h1 className="text-xl font-bold text-primary leading-tight">Flor de Batom</h1>
        </div>
        <Link href="/presente">
          <Button className="w-full h-12 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20">
            <Gift className="h-4 w-4" /> Monte seu Presente
          </Button>
        </Link>
        <nav className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Categorias</p>
          <button className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`} onClick={() => setSelectedCategory('Todos')}>TODOS</button>
          {categories.map(cat => (
            <button key={cat.id} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === cat.name ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`} onClick={() => setSelectedCategory(cat.name)}>{cat.name.toUpperCase()}</button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b h-20 md:h-24">
          <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-primary" onClick={() => setIsMobileMenuOpen(true)}><Menu className="h-6 w-6" /></Button>
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." className="pl-11 h-11 bg-muted/40 border-none rounded-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-primary h-12 w-12 rounded-2xl">
                  <ShoppingCart className="h-8 w-8" />
                  {cart.length > 0 && <span className="absolute top-0 right-0 min-w-[20px] h-[20px] bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[100]">
                <SheetHeader className="p-6 border-b text-left">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-2xl text-primary font-bold">Carrinho</SheetTitle>
                    <SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><X className="h-6 w-6" /></Button></SheetTrigger>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40"><ShoppingCart className="h-16 w-16 mb-4" /><p>Carrinho vazio</p></div>
                  ) : (
                    cart.map(item => (
                      <div key={`${item.id}-${item.selectedColor || 'no'}`} className="flex gap-4 items-center">
                        <div className="relative h-16 w-16 rounded-2xl overflow-hidden border"><Image src={item.imageUrl} alt={item.name} fill className="object-cover" /></div>
                        <div className="flex-1">
                          <h4 className="font-poppins text-sm truncate text-primary">{item.name}</h4>
                          {item.selectedColor && <p className="text-[10px] font-bold uppercase text-muted-foreground">Cor: {item.selectedColor}</p>}
                          <p className="text-primary font-semibold">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => updateQuantity(item.id, -1, item.selectedColor)}><Minus className="h-3 w-3" /></button>
                            <span className="text-xs font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1, item.selectedColor)}><Plus className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {cart.length > 0 && (
                  <SheetFooter className="p-6 border-t bg-white">
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-end"><span className="text-muted-foreground">Subtotal</span><span className="text-2xl font-semibold text-primary">R$ {cartTotal.toFixed(2).replace('.', ',')}</span></div>
                      <Button className="w-full bg-primary h-14 rounded-2xl text-lg font-bold" onClick={handleOpenCheckout}>Finalizar</Button>
                    </div>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 pb-20">
          {/* Banner Monte seu Presente (Igual à Imagem) */}
          <div className="container mx-auto px-4 mt-6">
            <Link href="/presente">
              <div className="bg-white rounded-[2.5rem] p-5 md:p-8 shadow-sm border border-primary/5 flex items-center justify-between gap-4 group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                    <Gift className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-sm md:text-xl leading-tight">
                      Monte seu Presente <br className="sm:hidden" /> Personalizado 🎀
                    </h3>
                    <p className="text-[10px] md:text-sm text-muted-foreground mt-1 leading-tight max-w-[200px] md:max-w-none">
                      Escolha a embalagem e seus produtinhos favoritos.
                    </p>
                  </div>
                </div>
                <Button variant="ghost" className="bg-primary/5 hover:bg-primary hover:text-white rounded-full px-4 md:px-6 h-10 md:h-12 text-[10px] md:text-xs font-black uppercase tracking-widest gap-2 shrink-0 transition-all">
                  Começar <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </Link>
          </div>

          {/* Hero Card Burgundy (Igual à Imagem) */}
          <div className="container mx-auto px-4 mt-6">
            <div className="relative rounded-[2.5rem] overflow-hidden bg-primary text-white p-8 md:p-16 min-h-[400px] flex flex-col items-center justify-center text-center space-y-6">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
              
              <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px] md:text-xs font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] animate-pulse">
                Coleção Exclusiva
              </Badge>
              
              <div className="relative">
                <h2 className="font-headline text-4xl md:text-7xl leading-[1.1] mb-2 drop-shadow-lg">
                  Realce sua beleza todos os dias 💖
                </h2>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/20 rounded-full blur-2xl"></div>
              </div>

              <p className="max-w-md text-sm md:text-lg opacity-90 leading-relaxed font-medium">
                Maquiagens selecionadas para valorizar sua autoestima com delicadeza ✨
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                  <Truck className="h-4 w-4" /> Entrega grátis
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                  <Store className="h-4 w-4" /> Loja 100% online
                </div>
              </div>

              <div className="relative mt-8 group">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl transition-transform group-hover:scale-105 duration-500">
                  <Image src={LOGO_URL} alt="Logo" fill className="object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white text-primary p-2 rounded-full shadow-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>

              {/* Botão Play Simulado (Igual na Imagem) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80 pointer-events-none">
                <PlayCircle className="w-20 h-20 md:w-32 md:h-32 text-white/40 fill-white/10" />
              </div>
            </div>
          </div>

          {/* Categorias Pills (Igual na Imagem) */}
          <div className="container mx-auto px-4 mt-8">
            <div className="w-full overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
              <div className="flex gap-3 min-w-max">
                <button 
                  className={`px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${selectedCategory === 'Todos' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-muted-foreground border-muted hover:border-primary/30'}`}
                  onClick={() => setSelectedCategory('Todos')}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    className={`px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${selectedCategory === cat.name ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-muted-foreground border-muted hover:border-primary/30'}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de Produtos */}
          <div className="container mx-auto px-4 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-8">
              {filteredProducts.map((product) => {
                const esgotado = (product.stock ?? 0) <= 0;
                return (
                  <Card key={product.id} className={`group relative border-none bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 ${esgotado ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <Link href={`/produto/${product.id}`} className="block w-full h-full">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        {esgotado && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-white text-primary text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl">ESGOTADO</span>
                          </div>
                        )}
                      </Link>
                      <button 
                        onClick={(e) => shareOnWhatsApp(e, product)}
                        className="absolute top-4 right-4 z-20 h-10 w-10 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 border-2 border-white/20"
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                    <CardContent className="p-4 md:p-6 flex flex-col relative">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{product.category}</p>
                        <Link href={`/produto/${product.id}`}>
                          <h4 className="font-poppins text-xs md:text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5em] text-primary group-hover:text-primary/70 transition-colors">{product.name}</h4>
                        </Link>
                        <p className="text-base md:text-lg font-bold text-primary">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <Link href={`/produto/${product.id}`} className={`absolute bottom-4 right-4 h-11 w-11 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all ${esgotado ? 'bg-muted cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}>
                        <Plus className="h-6 w-6" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[95%] max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] max-h-[90vh] flex flex-col z-[110]">
          <DialogHeader className="p-8 pb-2"><DialogTitle className="text-2xl font-bold text-primary">Finalizar Pedido</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-6 no-scrollbar">
            <div className="space-y-5">
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-primary/40 ml-1">Seu Nome *</Label><Input className="h-12 rounded-2xl bg-muted/30 border-none" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-primary/40 ml-1">WhatsApp *</Label><Input className="h-12 rounded-2xl bg-muted/30 border-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-primary/40 ml-1">Endereço *</Label><Textarea className="min-h-[90px] rounded-2xl bg-muted/30 border-none resize-none" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /></div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-primary/40 ml-1">Forma de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-3">
                  {['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito'].map(m => (
                    <div key={m} className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === m ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod(m as any)}>
                      <RadioGroupItem value={m} id={m} className="sr-only" />
                      <Label htmlFor={m} className="font-bold text-[10px] uppercase cursor-pointer">{m}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {paymentMethod === 'Dinheiro' && (
                <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/20 space-y-1.5 animate-in fade-in">
                  <Label className="text-[10px] font-black uppercase text-primary/40 ml-1">Troco para quanto?</Label>
                  <Input placeholder="Ex: 50,00" className="h-11 rounded-xl bg-white border-none text-sm" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} />
                </div>
              )}
            </div>
            <Button className="w-full h-16 rounded-[1.5rem] bg-primary text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleCheckout} disabled={isProcessing}>{isProcessing ? 'Enviando...' : 'Pedir no WhatsApp'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 lg:hidden backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute top-0 left-0 w-[85%] max-w-xs h-full bg-white p-8 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md">
                  <Image src={LOGO_URL} alt="Logo" fill className="object-cover" />
                </div>
                <h2 className="text-xl font-bold text-primary">Menu</h2>
              </div>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-muted" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-7 w-7" />
              </Button>
            </div>
            <Link href="/presente" className="mb-8">
              <Button className="w-full h-14 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3">
                <Gift className="h-5 w-5" /> Monte seu Presente
              </Button>
            </Link>
            <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Explorar Categorias</p>
              <button className={`w-full text-left p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground border'}`} onClick={() => { setSelectedCategory('Todos'); setIsMobileMenuOpen(false); }}>TODOS</button>
              {categories.map(cat => (
                <button key={cat.id} className={`w-full text-left p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat.name ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground border'}`} onClick={() => { setSelectedCategory(cat.name); setIsMobileMenuOpen(false); }}>{cat.name}</button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
