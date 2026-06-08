
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
  const [isFinalizing, setIsProcessing] = useState(false);

  const LOGO_URL = "https://i.ibb.co/6J4J1LMd/florlogo.jpg";
  const WHATSAPP_LOJA = "5591987199039";
  const PIX_KEY = "91987199039";

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
      
      if (paymentMethod === 'Dinheiro') orderData.change = parseFloat(changeAmount.replace(',', '.')) || 0;
      
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
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar pedido." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-foreground font-poppins">
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
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b h-24">
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
                <SheetHeader className="p-6 border-b text-left"><SheetTitle className="text-2xl text-primary font-bold">Carrinho</SheetTitle></SheetHeader>
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
                          <p className="text-primary font-semibold">R$ {item.price.toFixed(2)}</p>
                          <div className="flex items-center gap-3 mt-2"><button onClick={() => updateQuantity(item.id, -1, item.selectedColor)}><Minus className="h-3 w-3" /></button><span className="text-xs font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1, item.selectedColor)}><Plus className="h-3 w-3" /></button></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {cart.length > 0 && (
                  <SheetFooter className="p-6 border-t bg-white">
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-end"><span className="text-muted-foreground">Subtotal</span><span className="text-2xl font-semibold text-primary">R$ {cartTotal.toFixed(2)}</span></div>
                      <Button className="w-full bg-primary h-14 rounded-2xl text-lg font-bold" onClick={() => setIsCheckoutOpen(true)}>Finalizar</Button>
                    </div>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1">
          <div className="container mx-auto px-4 mt-8 pb-10">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group relative border-none bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <Link href={`/produto/${product.id}`} className="block w-full h-full">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    </Link>
                    <button 
                      onClick={(e) => shareOnWhatsApp(e, product)}
                      className="absolute top-3 right-3 z-20 h-9 w-9 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 border-2 border-white/20"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                  <CardContent className="p-3 md:p-5 flex flex-col relative">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-primary/60 uppercase">{product.category}</p>
                      <Link href={`/produto/${product.id}`}>
                        <h4 className="font-poppins text-xs leading-tight line-clamp-2 min-h-[2.5em] text-primary">{product.name}</h4>
                      </Link>
                      <p className="text-base font-semibold text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <Link href={`/produto/${product.id}`} className="absolute bottom-3 right-3 h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95">
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
        <DialogContent className="w-[95%] max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-2"><DialogTitle className="text-xl font-bold text-primary">Finalizar Pedido</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 no-scrollbar">
            <div className="space-y-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-primary/60 ml-1">Seu Nome *</Label><Input className="h-11 rounded-2xl bg-muted/30 border-none" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-primary/60 ml-1">WhatsApp *</Label><Input className="h-11 rounded-2xl bg-muted/30 border-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-primary/60 ml-1">Endereço *</Label><Textarea className="min-h-[70px] rounded-2xl bg-muted/30 border-none" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /></div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-primary/60 ml-1">Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-3">
                  {['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito'].map(m => (
                    <div key={m} className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === m ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod(m as any)}>
                      <RadioGroupItem value={m} id={m} className="sr-only" />
                      <Label htmlFor={m} className="font-bold text-xs cursor-pointer">{m.toUpperCase()}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {paymentMethod === 'Dinheiro' && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5 animate-in fade-in">
                  <Label className="text-[10px] font-bold uppercase text-primary/60 ml-1">Troco para quanto?</Label>
                  <Input placeholder="Ex: 50,00" className="h-11 rounded-2xl bg-white border-none text-sm" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} />
                </div>
              )}
            </div>
            <Button className="w-full h-14 rounded-2xl bg-primary text-base font-bold shadow-xl shadow-primary/20" onClick={handleCheckout} disabled={isFinalizing}>{isFinalizing ? 'Enviando...' : 'Pedir no WhatsApp'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
