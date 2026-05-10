
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
  Share2
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
import { saveOrderToFirestore, seedInitialDataToFirestore } from '@/lib/storage-utils';

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
    return [...categoriesRaw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
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
    if (!mounted) return;
    const anyOverlayOpen = isCartOpen || isCheckoutOpen || isMobileMenuOpen;
    if (anyOverlayOpen) {
      window.history.pushState({ overlay: true }, '');
    }
    const handlePopState = (event: PopStateEvent) => {
      if (isCartOpen) setIsCartOpen(false);
      if (isCheckoutOpen) setIsCheckoutOpen(false);
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCartOpen, isCheckoutOpen, isMobileMenuOpen, mounted]);

  useEffect(() => {
    if (!mounted || isUserLoading || !auth || !db) return;
    if (!user) {
      initiateAnonymousSignIn(auth);
    } else {
      seedInitialDataToFirestore(db);
    }
  }, [user, isUserLoading, auth, db, mounted]);

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

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!customerName || !customerPhone || !customerAddress || !db) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome, telefone e endereço." });
      return;
    }
    const orderNum = Math.floor(10000 + Math.random() * 90000).toString();
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
    const NUMERO_LOJA_MSG = "5591987199039";
    
    const linhasProdutos = cart.map(i => {
      const temVariacoes = i.variations && i.variations.length > 0;
      const labelCor = (temVariacoes && i.selectedColor) ? ` [${i.selectedColor}]` : '';
      return `• ${i.name}${labelCor} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`;
    }).join('\n');

    let linhaPagamento = "";
    if (paymentMethod === 'Dinheiro') {
      linhaPagamento = `💵 Dinheiro${changeAmount ? ` (troco para R$ ${changeAmount})` : ' (sem troco)'}`;
    } else if (paymentMethod === 'Pix') {
      linhaPagamento = `📱 Pix — comprovante a enviar`;
    } else if (paymentMethod === 'Cartão Débito') {
      linhaPagamento = `💳 Cartão de Débito`;
    } else {
      linhaPagamento = `💳 Cartão de Crédito`;
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
    window.open(`https://wa.me/${NUMERO_LOJA_MSG}?text=${msg}`, '_blank');
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPaymentMethod('Pix');
    setChangeAmount('');
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(PIX_KEY);
    toast({ title: "Chave Copiada!", description: "A chave Pix foi copiada com sucesso." });
  };

  const handleShareProduct = (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://flordebatommakeup.netlify.app/produto/${p.id}`;
    const msg = encodeURIComponent(
      `🌸 *Flor de Batom Makeup*\n\n` +
      `🛍️ *${p.name}*\n` +
      `💰 R$ ${p.price.toFixed(2).replace('.', ',')}\n\n` +
      `🔗 Veja os detalhes:\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
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
            <div className="mb-6 md:mb-10 relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#7B1C2A] to-[#A02C3D] p-6 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-4 md:max-w-[60%] z-10 text-center md:text-left">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">Coleção Exclusiva</div>
                <h2 className="text-2xl md:text-5xl font-bold text-white leading-tight font-poppins">Realce sua beleza todos os dias <span className="inline-block animate-pulse">💓</span></h2>
                <p className="text-white/80 text-xs md:text-base leading-relaxed max-w-md mx-auto md:mx-0 font-poppins">Maquiagens selecionadas para valorizar sua autoestima com delicadeza <Sparkles className="h-4 w-4 inline text-yellow-300" /></p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 pt-2 text-white/90">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium"><Truck className="h-4 w-4" /> Entrega grátis</div>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium"><ShoppingBag className="h-4 w-4" /> Loja 100% online</div>
                </div>
              </div>
              <div className="relative shrink-0 z-10">
                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <div className="relative w-32 h-32 md:w-56 md:h-56 rounded-full overflow-hidden border-[6px] md:border-[8px] border-white/20 shadow-2xl"><Image src={LOGO_URL} alt="Flor de Batom Logo" fill className="object-cover" /></div>
              </div>
              <div className="absolute top-[-20px] right-[-20px] w-48 h-48 md:w-64 md:h-64 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-[-40px] left-[-40px] w-64 h-64 md:w-80 md:h-80 bg-black/10 rounded-full blur-3xl"></div>
            </div>

            <div className="lg:hidden mb-8 overflow-x-auto no-scrollbar -mx-4 px-4 flex gap-3">
              <button className={`flex-none px-5 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border text-muted-foreground'}`} onClick={() => setSelectedCategory('Todos')}>TODOS</button>
              {categories.map(cat => (
                <button key={cat.id} className={`flex-none px-5 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedCategory === cat.name ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border text-muted-foreground'}`} onClick={() => setSelectedCategory(cat.name)}>{cat.name.toUpperCase()}</button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-primary">{selectedCategory.toUpperCase()}</h3>
              <select className="bg-transparent text-[10px] md:text-xs font-bold text-primary cursor-pointer appearance-none border-none pr-4" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}>
                <option value="relevance">ORDEM PERSONALIZADA</option>
                <option value="price-asc">MENOR PREÇO</option>
                <option value="price-desc">MAIOR PREÇO</option>
                <option value="az">A - Z</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group relative border-none bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full">
                  <Link href={`/produto/${product.id}`} className="relative aspect-square cursor-pointer overflow-hidden bg-muted">
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  </Link>
                  <button 
                    onClick={(e) => handleShareProduct(e, product)}
                    className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm text-primary flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10 active:scale-90 hover:bg-[#25D366] hover:text-white"
                    title="Compartilhar no WhatsApp"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <CardContent className="p-3 md:p-5 flex flex-col flex-1">
                    <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{product.category}</p>
                      <Link href={`/produto/${product.id}`} className="block">
                        <h4 className="font-poppins font-normal text-xs leading-tight line-clamp-2 min-h-[2.5em] text-primary hover:text-primary/70 transition-colors">{product.name}</h4>
                      </Link>
                      <p className="text-base font-semibold text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <Link 
                      href={`/produto/${product.id}`}
                      className="absolute bottom-3 right-3 h-10 w-10 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg active:scale-90 transition-transform"
                      title="Ver Detalhes"
                    >
                      <Plus className="h-5 w-5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-20 py-16 px-4 md:px-8 bg-primary/5 rounded-[3rem] border border-primary/10 relative overflow-hidden">
               <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4"><MessageCircle className="h-8 w-8 text-primary" /></div>
                  <h3 className="text-3xl md:text-5xl font-bold text-primary font-poppins">Atendimento Exclusivo</h3>
                  <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto leading-relaxed font-poppins">Dúvidas sobre tons, texturas ou seu pedido? Estamos prontos para te atender com todo o carinho que você merece 💖</p>
                  <div className="pt-4"><Button className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-bold shadow-xl shadow-primary/20 gap-3" onClick={() => window.open(`https://wa.me/${WHATSAPP_LOJA}?text=Olá! Gostaria de um atendimento personalizado.`, '_blank')}><MessageCircle className="h-6 w-6" /> Falar no WhatsApp</Button></div>
               </div>
               <div className="absolute top-[-50px] left-[-50px] w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
               <div className="absolute bottom-[-50px] right-[-50px] w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
            </div>
          </div>

          <footer className="bg-white border-t pt-16 pb-8 px-4 md:px-8">
            <div className="container mx-auto">
              <div className="flex flex-col items-center justify-center text-center space-y-6 mb-16">
                <div className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-primary font-poppins">Contato & Endereço</h4>
                  <ul className="space-y-4">
                    <li className="flex items-center justify-center gap-3"><MapPin className="h-5 w-5 text-primary shrink-0" /><span className="text-muted-foreground text-sm font-poppins">Capanema, Pará - Brasil</span></li>
                    <li className="flex items-center justify-center gap-3"><MessageCircle className="h-5 w-5 text-primary shrink-0" /><span className="text-muted-foreground text-sm font-poppins">(91) 98719-9039</span></li>
                  </ul>
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"><Instagram className="h-5 w-5" /></a>
                    <a href={`https://wa.me/${WHATSAPP_LOJA}`} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"><MessageCircle className="h-5 w-5" /></a>
                  </div>
                </div>
              </div>
              <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[10px] text-muted-foreground font-medium font-poppins">© {currentYear || '...'} Flor de Batom Makeup. Todos os direitos reservados.</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-poppins">Feito com <Heart className="h-3 w-3 text-red-400 fill-red-400" /> para realçar sua beleza.</div>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[85%] p-0 border-none shadow-2xl z-[110]">
          <div className="h-full flex flex-col bg-white">
            <SheetHeader className="p-8 border-b flex flex-row items-center gap-3 bg-primary/5 text-left"><SheetTitle className="text-2xl font-bold text-primary font-poppins">Categorias</SheetTitle></SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <button className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-between font-poppins ${selectedCategory === 'Todos' ? 'bg-primary text-white' : 'text-muted-foreground'}`} onClick={() => { setSelectedCategory('Todos'); setIsMobileMenuOpen(false); }}>TODOS {selectedCategory === 'Todos' && <ChevronRight className="h-5 w-5" />}</button>
              {categories.map(cat => (
                <button key={cat.id} className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-between font-poppins ${selectedCategory === cat.name ? 'bg-primary text-white' : 'text-muted-foreground'}`} onClick={() => { setSelectedCategory(cat.name); setIsMobileMenuOpen(false); }}>{cat.name.toUpperCase()} {selectedCategory === cat.name && <ChevronRight className="h-5 w-5" />}</button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
                  <div className="flex flex-col gap-1 items-center"><span className="text-[10px] font-bold uppercase text-primary/60">Chave Pix (Celular)</span><button onClick={copyPixKey} className="group relative flex items-center gap-2 text-sm font-bold text-primary bg-white px-5 py-2.5 rounded-xl border border-primary/20 hover:border-primary/40 active:scale-95 transition-all shadow-sm">(91) 98719-9039<Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" /></button><span className="text-[9px] text-primary/40 italic">Clique no número para copiar</span></div>
                  <div className="p-2.5 bg-white/50 border border-primary/10 rounded-xl"><p className="text-[10px] leading-relaxed text-primary">⚠️ <span className="font-bold uppercase tracking-tighter">Aviso:</span> Após o pagamento, envie o comprovante para confirmar seu pedido pelo WhatsApp da loja.</p></div>
                </div>
              )}
              {paymentMethod === 'Dinheiro' && (<div className="space-y-1.5 animate-in slide-in-from-top-2 font-poppins"><Label htmlFor="change" className="text-[10px] font-bold uppercase text-primary/60 ml-1">Precisa de troco para quanto?</Label><Input id="change" type="number" placeholder="Ex: 50" className="h-11 rounded-2xl bg-muted/30 border-none font-poppins text-sm" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} /></div>)}
            </div>
            <Button className="w-full h-14 rounded-2xl bg-primary text-base font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform font-poppins" onClick={handleCheckout}>Enviar para o WhatsApp</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
