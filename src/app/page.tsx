
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
  ChevronDown,
  Sparkles,
  Flower2,
  Truck,
  ShoppingBag,
  Heart
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
import { Product, CartItem, Order, Category, ProductVariation } from '@/lib/types';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useAuth,
  useUser
} from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { saveOrderToFirestore, seedInitialDataToFirestore } from '@/lib/storage-utils';

export default function Storefront() {
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // Queries Memoizadas
  const productsQuery = useMemoFirebase(() => query(collection(db, 'products'), where('isActive', '==', true)), [db]);
  const categoriesQuery = useMemoFirebase(() => collection(db, 'categories'), [db]);

  // Hooks de Dados Real-time
  const { data: productsRaw = [] } = useCollection<Product>(productsQuery);
  const { data: categoriesRaw = [] } = useCollection<Category>(categoriesQuery);

  const categories = useMemo(() => {
    const raw = categoriesRaw || [];
    return [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [categoriesRaw]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'relevance' | 'price-asc' | 'price-desc' | 'az'>('relevance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro'>('Pix');
  const [changeAmount, setChangeAmount] = useState('');

  const LOGO_URL = "https://i.ibb.co/6J4J1LMd/florlogo.jpg";

  useEffect(() => {
    // Carregar carrinho local
    const savedCart = localStorage.getItem('flordebatom_carrinho_v2');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      initiateAnonymousSignIn(auth);
    } else {
      seedInitialDataToFirestore(db);
    }
  }, [user, isUserLoading, auth, db]);

  useEffect(() => {
    localStorage.setItem('flordebatom_carrinho_v2', JSON.stringify(cart));
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const raw = productsRaw || [];
    let result = raw.filter(p => {
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
  }, [productsRaw, searchTerm, selectedCategory, sortOrder]);

  const addToCart = (product: Product, colorName?: string) => {
    const hasVariations = product.variations && product.variations.length > 0;
    
    if (hasVariations && !colorName) {
      toast({ variant: "destructive", title: "Escolha uma cor", description: "Por favor, selecione uma opção antes de adicionar." });
      return;
    }

    let availableStock = product.stock;
    if (hasVariations && colorName) {
      const variation = product.variations?.find(v => v.name === colorName);
      availableStock = variation?.stock || 0;
    }

    if (availableStock <= 0) {
      toast({ 
        variant: "destructive", 
        title: "💔 Poxa! Item esgotado", 
        description: "Essa opção está esgotada no momento. Mas logo ela volta!" 
      });
      return;
    }

    const currentInCart = cart.find(item => item.id === product.id && item.selectedColor === colorName);
    const quantityInCart = currentInCart?.quantity || 0;

    if (quantityInCart + 1 > availableStock) {
      toast({ 
        variant: "destructive", 
        title: "Limite de Estoque", 
        description: `Temos apenas ${availableStock} unidades disponíveis desta cor.` 
      });
      return;
    }

    const cartId = colorName ? `${product.id}-${colorName}` : product.id;
    let newCart;
    if (currentInCart) {
      newCart = cart.map(item => {
          const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
          return itemKey === cartId ? { ...item, quantity: item.quantity + 1 } : item;
      });
    } else {
      newCart = [...cart, { ...product, quantity: 1, selectedColor: colorName }];
    }

    setCart(newCart);
    toast({ title: "Adicionado!", description: `${product.name} ${colorName ? `(${colorName})` : ''} no carrinho.` });
  };

  const updateQuantity = (id: string, delta: number, color?: string) => {
    const product = (productsRaw || []).find(p => p.id === id);
    if (!product) return;

    if (delta > 0) {
      let availableStock = product.stock;
      if (product.variations && color) {
        const variation = product.variations.find(v => v.name === color);
        availableStock = variation?.stock || 0;
      }

      const itemInCart = cart.find(item => item.id === id && item.selectedColor === color);
      const currentQty = itemInCart?.quantity || 0;

      if (currentQty + delta > availableStock) {
        toast({ 
          variant: "destructive", 
          title: "Estoque Máximo", 
          description: `Temos apenas ${availableStock} unidades disponíveis desta opção.` 
        });
        return;
      }
    }

    const cartId = color ? `${id}-${color}` : id;
    const newCart = cart.map(item => {
      const itemKey = item.selectedColor ? `${item.id}-${item.selectedColor}` : item.id;
      if (itemKey === cartId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setCart(newCart);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, preencha seu nome e telefone." });
      return;
    }

    const orderNum = Math.floor(10000 + Math.random() * 90000).toString();

    // Criar o objeto de pedido sem campos undefined para o Firestore
    const orderData: any = {
      id: `ORD-${Date.now()}-${orderNum}`,
      orderNumber: orderNum,
      customerName,
      customerPhone,
      items: cart,
      total: cartTotal,
      paymentMethod,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
    };

    if (paymentMethod === 'Dinheiro') {
      orderData.change = parseFloat(changeAmount) || 0;
    }

    // Salvar no Firestore
    await saveOrderToFirestore(db, orderData as Order);

    const NUMERO_LOJA = "5591987199039";
    const linhasProdutos = cart.map(i =>
      `• ${i.name}${i.selectedColor ? ` [${i.selectedColor}]` : ''} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`
    ).join('\n');

    const linhaPagamento = paymentMethod === 'Dinheiro'
      ? `💵 Dinheiro${changeAmount ? ` (troco para R$ ${changeAmount})` : ' (sem troco)'}`
      : `📱 Pix — comprovante a enviar`;

    const msg = encodeURIComponent(
      `🌸 *PEDIDO #${orderNum} — Flor de Batom Makeup*\n\n` +
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
    setIsCheckoutOpen(false);
    toast({ title: "Pedido Enviado!", description: `Pedido #${orderNum} realizado com sucesso.` });
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText("(91) 98719-9039");
    toast({ title: "Chave Pix Copiada", description: "O número do celular foi copiado para sua área de transferência." });
  };

  const displayedProductImage = useMemo(() => {
    if (!selectedProduct) return "";
    if (selectedColor && selectedProduct.variations) {
      const variation = selectedProduct.variations.find(v => v.name === selectedColor);
      if (variation?.imageUrl) return variation.imageUrl;
    }
    return selectedProduct.imageUrl;
  }, [selectedProduct, selectedColor]);

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-foreground font-poppins">
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r sticky top-0 h-screen overflow-y-auto z-40 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md border-2 border-primary/20">
            <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
          </div>
          <h1 className="text-xl font-poppins font-bold text-primary leading-tight">Flor de Batom</h1>
        </div>
        
        <nav className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Categorias</p>
          <button 
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
            onClick={() => setSelectedCategory('Todos')}
          >
            TODOS OS PRODUTOS
          </button>
          {categories?.map(cat => (
            <button 
              key={cat.id} 
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === cat.name ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name.toUpperCase()}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b h-24 md:h-32 transition-all">
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
                  <Button variant="ghost" size="icon" className="relative text-primary h-16 w-16 md:h-24 md:w-24 hover:bg-primary/5 rounded-2xl transition-all shadow-sm border border-primary/5">
                    <ShoppingCart className="h-10 w-10 md:h-14 md:w-14" />
                    {cart.length > 0 && (
                      <span className="absolute top-0 right-0 min-w-[24px] h-[24px] md:min-w-[32px] md:h-[32px] bg-primary text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white shadow-md animate-in zoom-in duration-300">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[100] border-none shadow-2xl">
                  <SheetHeader className="p-6 border-b text-left">
                    <SheetTitle className="font-poppins text-2xl text-primary font-bold">Carrinho</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <ShoppingCart className="h-20 w-20 mb-4" />
                        <p className="font-medium">Seu carrinho está vazio.</p>
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
                              <h4 className="font-poppins font-normal text-sm truncate text-primary">{item.name}</h4>
                              {item.selectedColor && (
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Cor: {item.selectedColor}</p>
                              )}
                              <p className="text-primary font-poppins font-semibold text-xl mt-1">R$ {item.price.toFixed(2)}</p>
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
                          <span className="text-3xl font-poppins font-semibold text-primary">R$ {cartTotal.toFixed(2)}</span>
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
          <div className="px-4 pt-4 md:pt-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="container mx-auto">
              <div className="relative bg-gradient-to-br from-primary via-[#9E3D4D] to-[#F8C8DC] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden min-h-[200px] md:min-h-[260px] flex flex-col justify-center items-center shadow-xl shadow-primary/10 transition-all">
                <div className="relative flex flex-col md:flex-row w-full p-6 md:p-10 items-center justify-between gap-6 md:gap-10 z-10 text-center md:text-left">
                  <div className="space-y-3 md:space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/25 mb-1 mx-auto md:mx-0">
                      <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.15em]">Coleção Exclusiva</span>
                    </div>
                    
                    <h2 className="text-2xl md:text-5xl font-poppins font-bold text-white leading-[1.2] drop-shadow-lg">
                      Realce sua beleza todos os dias 💓
                    </h2>
                    
                    <p className="text-white/85 text-[10px] md:text-base font-body max-w-sm md:max-w-md leading-relaxed mx-auto md:mx-0">
                      Maquiagens selecionadas para valorizar sua autoestima com delicadeza ✨
                    </p>

                    <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-white/90 text-[10px] md:text-sm font-medium">
                        <Truck className="h-3 w-3 md:h-4 md:w-4" /> Entrega grátis
                      </div>
                      <div className="flex items-center gap-1.5 text-white/90 text-[10px] md:text-sm font-medium">
                        <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" /> Loja 100% online
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative h-24 w-24 md:h-40 md:w-40 shrink-0">
                    <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl rounded-full scale-110 border border-white/30 shadow-xl" />
                    <div className="relative h-full w-full rounded-full overflow-hidden border-2 md:border-4 border-white/20 shadow-lg">
                      <Image 
                        src={LOGO_URL} 
                        alt="Logo Flor de Batom" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:hidden mt-8 px-4 overflow-x-auto no-scrollbar pb-2">
            <div className="flex gap-2 min-w-max">
              <Button 
                variant="ghost" 
                className={`rounded-full px-6 h-10 font-bold uppercase tracking-wider transition-all ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-lg' : 'bg-white border text-muted-foreground'}`}
                onClick={() => setSelectedCategory('Todos')}
              >
                Todos
              </Button>
              {categories?.map(cat => (
                <Button 
                  key={cat.id} 
                  variant="ghost" 
                  className={`rounded-full px-6 h-10 font-bold uppercase tracking-wider transition-all ${selectedCategory === cat.name ? 'bg-primary text-white shadow-lg' : 'bg-white border text-muted-foreground'}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  {cat.name.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div className="container mx-auto px-4 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-poppins font-bold text-primary flex items-center gap-2">
                {selectedCategory.toUpperCase()} <span className="text-[10px] md:text-sm font-poppins text-muted-foreground font-medium">({filteredProducts.length} itens)</span>
              </h3>
              <select 
                className="bg-transparent text-[10px] md:text-xs font-bold text-primary focus:ring-0 cursor-pointer appearance-none border-none pr-4 tracking-widest"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="relevance">ORDEM PERSONALIZADA</option>
                <option value="price-asc">MENOR PREÇO</option>
                <option value="price-desc">MAIOR PREÇO</option>
                <option value="az">A - Z</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map((product, idx) => (
                <Card 
                  key={product.id} 
                  className="group relative border-none bg-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 fade-in-up flex flex-col h-full"
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
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-carbon text-white px-3 py-1.5 rounded-full shadow-lg">Esgotado</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 md:p-5 flex flex-col flex-1">
                    <div className="flex-1 space-y-1">
                      <p className="text-[9px] md:text-[10px] font-bold text-primary/60 uppercase tracking-widest">{product.category}</p>
                      <h4 className="font-poppins font-normal text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5em] text-primary group-hover:text-primary/80 transition-colors cursor-pointer" onClick={() => setSelectedProduct(product)}>
                        {product.name}
                      </h4>
                      <p className="text-base md:text-xl font-poppins font-semibold text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>
                    
                    <button 
                      className={`absolute bottom-3 right-3 h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 ${product.stock <= 0 ? 'bg-[#E0E0E0] text-gray-400 shadow-none cursor-not-allowed' : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'}`}
                      onClick={() => setSelectedProduct(product)}
                      disabled={product.stock <= 0}
                    >
                      <Plus className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <section className="bg-transparent py-20 mt-16 relative overflow-hidden" id="contato">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="container mx-auto px-4 text-center max-w-3xl">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 mb-6 text-primary">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h2 className="text-3xl md:text-5xl font-poppins font-bold text-primary mb-6">Atendimento Exclusivo</h2>
              <p className="text-sm md:text-lg text-muted-foreground mb-12 leading-relaxed max-w-xl mx-auto">
                Dúvidas sobre tons, texturas ou seu pedido?<br />Estamos prontos para te atender com todo o carinho que você merece 💖
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4">
                <Button 
                  variant="outline"
                  className="h-20 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary font-bold gap-4 rounded-3xl transition-all group bg-white/50 backdrop-blur-sm"
                  onClick={() => window.open('https://wa.me/5591987199039', '_blank')}
                >
                  <div className="bg-[#25D366] text-white p-2 rounded-xl group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-widest opacity-60">Fale no</p>
                    <p className="text-lg">WhatsApp</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline"
                  className="h-20 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary font-bold gap-4 rounded-3xl transition-all group bg-white/50 backdrop-blur-sm"
                  onClick={() => window.open('https://www.instagram.com/flordebatom.makeup', '_blank')}
                >
                  <div className="bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white p-2 rounded-xl group-hover:scale-110 transition-transform">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-widest opacity-60">Siga nosso</p>
                    <p className="text-lg">Instagram</p>
                  </div>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-transparent py-12">
          <div className="container mx-auto px-4 text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/10">
                <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
              </div>
              <h2 className="text-xl font-poppins font-bold text-primary">Flor de Batom Makeup</h2>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">© 2026 Flor de Batom Makeup</p>
          </div>
        </footer>
      </div>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[85%] p-0 border-none shadow-2xl z-[110]">
          <div className="h-full flex flex-col bg-white">
            <SheetHeader className="p-8 border-b flex flex-row items-center gap-3 bg-primary/5 text-left">
              <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md">
                <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
              </div>
              <SheetTitle className="text-2xl font-poppins font-bold text-primary">Categorias</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <button 
                className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-between ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground border border-transparent'}`}
                onClick={() => { setSelectedCategory('Todos'); setIsMobileMenuOpen(false); }}
              >
                TODOS {selectedCategory === 'Todos' && <ChevronRight className="h-5 w-5" />}
              </button>
              {categories?.map(cat => (
                <button 
                  key={cat.id} 
                  className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-between ${selectedCategory === cat.name ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground border border-transparent'}`}
                  onClick={() => { setSelectedCategory(cat.name); setIsMobileMenuOpen(false); }}
                >
                  {cat.name.toUpperCase()} {selectedCategory === cat.name && <ChevronRight className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if(!open) { setSelectedProduct(null); setSelectedColor(''); } }}>
        <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden border-none shadow-2xl z-[120] max-h-[95vh] md:max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedProduct?.name || 'Detalhes do Produto'}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="relative aspect-square md:w-1/2 bg-muted transition-all duration-500">
                <Image src={displayedProductImage} alt={selectedProduct.name} fill className="object-cover" />
                <Badge className="absolute top-6 left-6 bg-white/90 backdrop-blur text-primary font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-full shadow-lg border-none">
                  {selectedCategory === 'Todos' ? selectedProduct.category : selectedCategory}
                </Badge>
                {(selectedColor ? (selectedProduct.variations?.find(v => v.name === selectedColor)?.stock ?? 0) <= 0 : selectedProduct.stock <= 0) && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-xs font-bold uppercase tracking-widest bg-carbon text-white px-6 py-3 rounded-full shadow-2xl">Indisponível</span>
                  </div>
                )}
              </div>
              <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-between bg-white">
                <div className="space-y-8">
                  <div className="text-left space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60">{selectedProduct.category}</p>
                    <h2 className="text-3xl md:text-4xl font-poppins font-bold text-primary leading-tight">{selectedProduct.name}</h2>
                    <DialogDescription className="text-sm text-muted-foreground">Visualize detalhes e escolha sua cor favorita.</DialogDescription>
                  </div>

                  <div className="space-y-6">
                    {((selectedProduct.variations && selectedProduct.variations.length > 0)) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-bold text-foreground">Cor</Label>
                          <span className="text-[10px] text-primary italic font-medium">Escolha uma opção</span>
                        </div>
                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                          <SelectTrigger className="h-14 rounded-2xl border-muted bg-muted/10 text-sm font-medium focus:ring-primary/20">
                            <SelectValue placeholder="Escolha uma opção" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl z-[130]">
                            {selectedProduct.variations?.map(v => (
                              <SelectItem key={v.name} value={v.name} className="rounded-xl py-3 cursor-pointer" disabled={v.stock <= 0}>
                                {v.name} {v.stock <= 0 ? '(Esgotado)' : `(${v.stock} disponíveis)`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-3xl md:text-4xl font-poppins font-semibold text-primary">R$ {selectedProduct.price.toFixed(2)}</p>
                    </div>

                    <p className="text-muted-foreground text-sm font-poppins font-normal leading-relaxed border-t pt-6">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                  <Button 
                    className={`w-full h-16 text-lg font-poppins font-bold rounded-3xl shadow-xl transition-all active:scale-[0.98] ${selectedProduct.stock <= 0 ? 'bg-[#E0E0E0] text-gray-400 cursor-not-allowed shadow-none hover:bg-[#E0E0E0]' : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'}`} 
                    onClick={() => { addToCart(selectedProduct, selectedColor); setSelectedProduct(null); setSelectedColor(''); }}
                    disabled={selectedProduct.stock <= 0}
                  >
                    {selectedProduct.stock <= 0 ? 'Indisponível' : 'Adicionar ao Carrinho'}
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

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg z-[120] p-0 overflow-hidden max-h-[95vh] flex flex-col border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader className="p-8 md:p-12 border-b bg-muted/20 text-center">
            <DialogTitle className="text-3xl font-poppins font-bold text-primary">Finalizar Pedido</DialogTitle>
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
              <span className="text-3xl font-poppins font-semibold">R$ {cartTotal.toFixed(2)}</span>
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
