
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
  Gift
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { saveOrderToFirestore, seedInitialDataToFirestore, getNextOrderNumber } from '@/lib/storage-utils';

export default function Storefront() {
  const firebaseCtx = React.useContext(FirebaseContext);
  const db = firebaseCtx?.firestore;
  const auth = firebaseCtx?.auth;
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear());
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
  const [sortOrder, setSortOrder] = useState<'relevance' | 'price-asc' | 'price-desc' | 'az'>('relevance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito'>('Pix');
  const [changeAmount, setChangeAmount] = useState('');
  const [isFinalizing, setIsProcessing] = useState(false);

  const LOGO_URL = "https://i.ibb.co/6J4J1LMd/florlogo.jpg";
  const WHATSAPP_LOJA = "5591987199039";
  const PIX_KEY = "91987199039";
  const INSTAGRAM_URL = "https://www.instagram.com/flordebatom.makeup?igsh=MTI0NTk3MWwwdnltNg==";

  useEffect(() => {
    if (!mounted) return;
    const savedCart = localStorage.getItem('flordebatom_carrinho_v3');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        setCart([]);
      }
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('flordebatom_carrinho_v3', JSON.stringify(cart));
    }
  }, [cart, mounted]);

  const filteredProducts = useMemo(() => {
    if (!mounted || !productsRaw) return [];
    let result = [...productsRaw].filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortOrder === 'relevance') {
      result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    } else if (sortOrder === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOrder === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [productsRaw, searchTerm, selectedCategory, sortOrder, mounted]);

  const updateQuantity = (id: string, delta: number, color?: string) => {
    if (!productsRaw) return;
    const product = productsRaw.find(p => p.id === id);
    if (!product) return;
    if (delta > 0) {
      let availableStock = product.stock;
      if (product.variations && color) {
        const variation = product.variations.find(v => v.name === color);
        availableStock = variation?.stock || 0;
      }
      const itemInCart = cart.find(item => item.id === id && item.selectedColor === color);
      const currentQty = itemInCart?.quantity || 0;
      if (currentQty + delta > availableStock) return;
    }
    const cartId = color ? `${id}-${color}` : id;
    const newCart = cart.map(item => {
      const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
      if (itemKey === cartId) return { ...item, quantity: Math.max(0, item.quantity + delta) };
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

  const handleCheckout = async () => {
    if (!customerName || !customerPhone || !customerAddress || !db) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome, telefone e endereço." });
      return;
    }

    setIsProcessing(true);
    try {
      const orderNum = await getNextOrderNumber(db);
      
      const orderData: any = {
        id: `ORD-${Date.now()}-${orderNum}`,
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
      
      if (paymentMethod === 'Dinheiro') orderData.change = parseFloat(changeAmount) || 0;
      
      await saveOrderToFirestore(db, orderData as Order);
      
      const linhasProdutos = cart.map(i => {
        const labelCor = i.selectedColor ? ` [${i.selectedColor}]` : '';
        return `• ${i.name}${labelCor} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`;
      }).join('\n');

      let linhaPagamento = "";
      if (paymentMethod === 'Dinheiro') {
        linhaPagamento = `💵 Dinheiro${changeAmount ? ` (troco para R$ ${changeAmount})` : ' (sem troco)'}`;
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
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setPaymentMethod('Pix');
      setChangeAmount('');
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar pedido." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-foreground font-poppins">
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r sticky top-0 h-screen overflow-y-auto z-40 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md border-2 border-primary/20">
            <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
          </div>
          <h1 className="text-xl font-bold text-primary leading-tight">Flor de Batom</h1>
        </div>

        <Link href="/presente">
          <Button className="w-full h-12 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
            <Gift className="h-4 w-4" /> Monte seu Presente
          </Button>
        </Link>

        <nav className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Categorias</p>
          <button className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`} onClick={() => setSelectedCategory('Todos')}>TODOS OS PRODUTOS</button>
          {categories.map(cat => (
            <button key={cat.id} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === cat.name ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`} onClick={() => setSelectedCategory(cat.name)}>{cat.name.toUpperCase()}</button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b h-24 transition-all">
          <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <Button variant="ghost" size="icon" className="text-primary" onClick={() => setIsMobileMenuOpen(true)}><Menu className="h-6 w-6" /></Button>
            </div>
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." className="pl-11 h-11 bg-muted/40 border-none rounded-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              <Link href="/presente" className="hidden sm:flex">
                <Button variant="ghost" size="icon" className="text-primary h-12 w-12 hover:bg-primary/5 rounded-2xl" title="Monte seu Presente">
                  <Gift className="h-7 w-7" />
                </Button>
              </Link>
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-primary h-12 w-12 hover:bg-primary/5 rounded-2xl">
                    <ShoppingCart className="h-8 w-8" />
                    {cart.length > 0 && <span className="absolute top-0 right-0 min-w-[20px] h-[20px] bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[100] border-none shadow-2xl">
                  <SheetHeader className="p-6 border-b text-left"><SheetTitle className="text-2xl text-primary font-bold">Carrinho</SheetTitle></SheetHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center opacity-40"><ShoppingCart className="h-16 w-16 mb-4" /><p className="font-medium">Seu carrinho está vazio.</p></div>
                    ) : (
                      <div className="space-y-5">
                        {cart.map(item => (
                          <div key={`${item.id}-${item.selectedColor || 'no-color'}`} className="flex gap-4 items-center">
                            <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border"><Image src={item.imageUrl} alt={item.name} fill className="object-cover" /></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-poppins font-normal text-sm truncate text-primary">{item.name}</h4>
                              {item.selectedColor && <p className="text-[10px] font-bold uppercase text-muted-foreground mt-0.5 tracking-tight">Cor: {item.selectedColor}</p>}
                              <p className="text-primary font-semibold mt-1">R$ {item.price.toFixed(2)}</p>
                              <div className="flex items-center gap-3 mt-2"><button onClick={() => updateQuantity(item.id, -1, item.selectedColor)} className="p-1"><Minus className="h-3 w-3" /></button><span className="text-xs font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1, item.selectedColor)} className="p-1"><Plus className="h-3 w-3" /></button></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {cart.length > 0 && (
                    <SheetFooter className="p-6 border-t bg-white">
                      <div className="w-full space-y-4">
                        <div className="flex justify-between items-end"><span className="text-muted-foreground font-medium">Subtotal</span><span className="text-2xl font-semibold text-primary">R$ {cartTotal.toFixed(2)}</span></div>
                        <Button className="w-full bg-primary hover:bg-primary/90 h-14 rounded-2xl text-lg font-bold" onClick={() => setIsCheckoutOpen(true)}>Finalizar Pedido</Button>
                      </div>
                    </SheetFooter>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="container mx-auto px-4 mt-8 pb-10">
            <Link href="/presente">
              <div className="mb-6 group bg-white border border-primary/10 rounded-[2rem] p-4 flex items-center justify-between shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-500 cursor-pointer overflow-hidden relative">
                <div className="flex items-center gap-4 z-10">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-poppins font-semibold text-primary text-sm sm:text-base">Monte seu Presente Personalizado 🎀</h4>
                    <p className="text-muted-foreground text-[10px] sm:text-xs">Escolha a embalagem e seus produtinhos favoritos.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-black text-[10px] text-primary uppercase tracking-widest z-10 bg-primary/5 px-4 py-2 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                  Começar <ChevronRight className="h-3 w-3" />
                </div>
                <Gift className="absolute -bottom-6 -right-6 h-24 w-24 text-primary/5 rotate-12 group-hover:rotate-0 transition-transform" />
              </div>
            </Link>

            <div className="mb-6 md:mb-10 relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#7B1C2A] to-[#A02C3D] p-6 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-4 md:max-w-[60%] z-10 text-center md:text-left">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">Coleção Exclusiva</div>
                <h2 className="text-2xl md:text-5xl font-bold text-white leading-tight font-poppins">Realce sua beleza todos os dias <span className="inline-block animate-pulse">💓</span></h2>
                <p className="text-white/80 text-xs md:text-base leading-relaxed max-w-md mx-auto md:mx-0 font-poppins">Maquiagens selecionadas para valorizar sua autoestima com delicadeza <Sparkles className="h-4 w-4 inline text-yellow-300" /></p>
              </div>
              <div className="relative shrink-0 z-10">
                <div className="relative w-32 h-32 md:w-56 md:h-56 rounded-full overflow-hidden border-[6px] md:border-[8px] border-white/20 shadow-2xl"><Image src={LOGO_URL} alt="Flor de Batom Logo" fill className="object-cover" /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group relative border-none bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <Link href={`/produto/${product.id}`} className="block w-full h-full cursor-pointer">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    </Link>
                    
                    {/* Botão de Compartilhamento WhatsApp (como solicitado) */}
                    <button 
                      onClick={(e) => shareOnWhatsApp(e, product)}
                      className="absolute top-3 right-3 z-20 h-9 w-9 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 border-2 border-white/20"
                      title="Compartilhar no WhatsApp"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                  <CardContent className="p-3 md:p-5 flex flex-col flex-1 relative">
                    <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{product.category}</p>
                      <Link href={`/produto/${product.id}`} className="block">
                        <h4 className="font-poppins font-normal text-xs leading-tight line-clamp-2 min-h-[2.5em] text-primary hover:text-primary/70 transition-colors">{product.name}</h4>
                      </Link>
                      <p className="text-base font-semibold text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>

                    {/* Botão + Adicionar no canto inferior direito */}
                    <Link href={`/produto/${product.id}`} className="absolute bottom-3 right-3 h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all active:scale-95">
                      <Plus className="h-6 w-6" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[95%] max-w-[400px] p-0 overflow-hidden border-none shadow-2xl z-[130] rounded-[2rem] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-2"><DialogTitle className="text-xl font-bold text-primary font-poppins">Finalizar Pedido</DialogTitle><DialogDescription className="text-xs font-poppins">Preencha os dados para entrega via WhatsApp.</DialogDescription></DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 no-scrollbar">
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="name" className="text-[10px] font-bold uppercase text-primary/60 ml-1 font-poppins">Seu Nome</Label><Input id="name" placeholder="Ex: Maria Silva" className="h-11 rounded-2xl bg-muted/30 border-none font-poppins text-sm" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="phone" className="text-[10px] font-bold uppercase text-primary/60 ml-1 font-poppins">WhatsApp</Label><Input id="phone" placeholder="(91) 98888-8888" className="h-11 rounded-2xl bg-muted/30 border-none font-poppins text-sm" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="address" className="text-[10px] font-bold uppercase text-primary/60 ml-1 font-poppins">Endereço de Entrega</Label><Textarea id="address" placeholder="Rua, Número, Bairro, Ponto de Referência" className="min-h-[70px] rounded-2xl bg-muted/30 border-none font-poppins resize-none text-sm" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /></div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-primary/60 ml-1 font-poppins">Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'Pix' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod('Pix')}><RadioGroupItem value="Pix" id="pix" className="text-primary border-primary" /><Label htmlFor="pix" className="font-bold text-xs cursor-pointer font-poppins">PIX</Label></div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'Dinheiro' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod('Dinheiro')}><RadioGroupItem value="Dinheiro" id="cash" className="text-primary border-primary" /><Label htmlFor="cash" className="font-bold text-xs cursor-pointer font-poppins">DINHEIRO</Label></div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'Cartão Débito' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod('Cartão Débito')}><RadioGroupItem value="Cartão Débito" id="card-debit" className="text-primary border-primary" /><Label htmlFor="card-debit" className="font-bold text-[10px] cursor-pointer font-poppins">CARTÃO DÉBITO</Label></div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'Cartão Crédito' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod('Cartão Crédito')}><RadioGroupItem value="Cartão Crédito" id="card-credit" className="text-primary border-primary" /><Label htmlFor="card-credit" className="font-bold text-[10px] cursor-pointer font-poppins">CARTÃO CRÉDITO</Label></div>
                </RadioGroup>
              </div>
              {paymentMethod === 'Pix' && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 font-poppins text-center">
                  <div className="flex flex-col gap-1 items-center"><span className="text-[10px] font-bold uppercase text-primary/60">Chave Pix (Celular)</span><button onClick={() => { navigator.clipboard.writeText(PIX_KEY); toast({ title: "Copiado!" }); }} className="text-sm font-bold text-primary bg-white px-5 py-2.5 rounded-xl border border-primary/20 shadow-sm">(91) 98719-9039</button></div>
                </div>
              )}
            </div>
            <Button 
              className="w-full h-14 rounded-2xl bg-primary text-base font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform font-poppins" 
              onClick={handleCheckout}
              disabled={isFinalizing}
            >
              {isFinalizing ? 'Processando...' : 'Enviar para o WhatsApp'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
