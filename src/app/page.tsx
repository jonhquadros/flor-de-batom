
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Menu,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    return [...categoriesRaw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [categoriesRaw, mounted]);

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
    if (!mounted) return;
    const savedCart = localStorage.getItem('flordebatom_carrinho_v2');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        setCart([]);
      }
    }
  }, [mounted]);

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
      localStorage.setItem('flordebatom_carrinho_v2', JSON.stringify(cart));
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
      toast({ variant: "destructive", title: "💔 Item esgotado", description: "Essa opção está esgotada no momento." });
      return;
    }

    const currentInCart = cart.find(item => item.id === product.id && item.selectedColor === colorName);
    const quantityInCart = currentInCart?.quantity || 0;

    if (quantityInCart + 1 > availableStock) {
      toast({ variant: "destructive", title: "Limite de Estoque", description: `Apenas ${availableStock} disponíveis.` });
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
    toast({ title: "Adicionado!", description: `${product.name} ${colorName ? `(${colorName})` : ''}` });
  };

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
    if (!customerName || !customerPhone || !db) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome e telefone." });
      return;
    }

    const orderNum = Math.floor(10000 + Math.random() * 90000).toString();
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
    if (paymentMethod === 'Dinheiro') orderData.change = parseFloat(changeAmount) || 0;

    await saveOrderToFirestore(db, orderData as Order);

    const NUMERO_LOJA = "5591987199039";
    const msg = encodeURIComponent(`🌸 *NOVO PEDIDO #${orderNum}*\n\n👤 *Cliente:* ${customerName}\n💰 *TOTAL: R$ ${cartTotal.toFixed(2)}*`);
    window.open(`https://wa.me/${NUMERO_LOJA}?text=${msg}`, '_blank');
    
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const displayedProductImage = useMemo(() => {
    if (!selectedProduct) return "";
    if (selectedColor && selectedProduct.variations) {
      const variation = selectedProduct.variations.find(v => v.name === selectedColor);
      if (variation?.imageUrl) return variation.imageUrl;
    }
    return selectedProduct.imageUrl;
  }, [selectedProduct, selectedColor]);

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
          <button 
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === 'Todos' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
            onClick={() => setSelectedCategory('Todos')}
          >
            TODOS OS PRODUTOS
          </button>
          {categories.map(cat => (
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
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b h-24 transition-all">
          <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <Button variant="ghost" size="icon" className="text-primary" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar..." 
                className="pl-11 h-11 bg-muted/40 border-none rounded-2xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-primary h-12 w-12 hover:bg-primary/5 rounded-2xl">
                    <ShoppingCart className="h-8 w-8" />
                    {cart.length > 0 && (
                      <span className="absolute top-0 right-0 min-w-[20px] h-[20px] bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[100] border-none shadow-2xl">
                  <SheetHeader className="p-6 border-b text-left">
                    <SheetTitle className="text-2xl text-primary font-bold">Carrinho</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <ShoppingCart className="h-16 w-16 mb-4" />
                        <p className="font-medium">Seu carrinho está vazio.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {cart.map(item => (
                          <div key={`${item.id}-${item.selectedColor || 'no-color'}`} className="flex gap-4 items-center">
                            <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border">
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-normal text-sm truncate text-primary">{item.name}</h4>
                              <p className="text-primary font-semibold mt-1">R$ {item.price.toFixed(2)}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <button onClick={() => updateQuantity(item.id, -1, item.selectedColor)} className="p-1"><Minus className="h-3 w-3" /></button>
                                <span className="text-xs font-bold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1, item.selectedColor)} className="p-1"><Plus className="h-3 w-3" /></button>
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
                          <span className="text-2xl font-semibold text-primary">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <Button className="w-full bg-primary hover:bg-primary/90 h-14 rounded-2xl text-lg font-bold" onClick={() => setIsCheckoutOpen(true)}>
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
          <div className="container mx-auto px-4 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-primary">
                {selectedCategory.toUpperCase()}
              </h3>
              <select 
                className="bg-transparent text-[10px] md:text-xs font-bold text-primary cursor-pointer appearance-none border-none pr-4"
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
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="group relative border-none bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full"
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
                  </div>
                  <CardContent className="p-3 md:p-5 flex flex-col flex-1">
                    <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{product.category}</p>
                      <h4 className="font-normal text-sm leading-tight line-clamp-2 min-h-[2.5em] text-primary cursor-pointer" onClick={() => setSelectedProduct(product)}>
                        {product.name}
                      </h4>
                      <p className="text-base font-semibold text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <button 
                      className="absolute bottom-3 right-3 h-10 w-10 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg active:scale-90"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[85%] p-0 border-none shadow-2xl z-[110]">
          <div className="h-full flex flex-col bg-white">
            <SheetHeader className="p-8 border-b flex flex-row items-center gap-3 bg-primary/5 text-left">
              <SheetTitle className="text-2xl font-bold text-primary">Categorias</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <button 
                className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-between ${selectedCategory === 'Todos' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
                onClick={() => { setSelectedCategory('Todos'); setIsMobileMenuOpen(false); }}
              >
                TODOS {selectedCategory === 'Todos' && <ChevronRight className="h-5 w-5" />}
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  className={`w-full text-left px-6 py-4 rounded-2xl text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-between ${selectedCategory === cat.name ? 'bg-primary text-white' : 'text-muted-foreground'}`}
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
        <DialogContent className="w-[95%] sm:max-w-[800px] p-0 border-none shadow-2xl z-[120] rounded-[2.5rem] max-h-[92vh] flex flex-col overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>Detalhes do produto {selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="flex flex-col md:flex-row h-full">
                <div className="relative aspect-[4/3] md:aspect-square md:w-1/2 bg-muted shrink-0">
                  <Image src={displayedProductImage} alt={selectedProduct.name} fill className="object-cover" />
                </div>
                <div className="p-5 md:p-10 flex-1 flex flex-col bg-white">
                  <div className="space-y-5 md:space-y-6 flex-1">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{selectedProduct.category}</p>
                      <h2 className="text-lg md:text-3xl font-bold text-primary leading-tight">{selectedProduct.name}</h2>
                      <p className="text-xl md:text-2xl font-semibold text-primary">R$ {selectedProduct.price.toFixed(2)}</p>
                    </div>

                    <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{selectedProduct.description}</p>

                    {selectedProduct.variations && selectedProduct.variations.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Escolha a Cor</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variations.map((v) => (
                            <button
                              key={v.name}
                              onClick={() => setSelectedColor(v.name)}
                              disabled={v.stock === 0}
                              className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${
                                selectedColor === v.name 
                                  ? 'border-primary bg-primary text-white shadow-md' 
                                  : 'border-muted bg-white text-muted-foreground hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed'
                              }`}
                            >
                              {v.name.toUpperCase()}
                              {v.stock <= 5 && v.stock > 0 && <span className="ml-2 opacity-70">(ÚLTIMAS)</span>}
                              {v.stock === 0 && <span className="ml-2 opacity-70">(ESGOTADO)</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full h-14 mt-6 md:mt-10 font-bold rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-transform" 
                    onClick={() => { addToCart(selectedProduct, selectedColor); setSelectedProduct(null); }}
                  >
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[95%] max-w-md p-0 overflow-hidden border-none shadow-2xl z-[130] rounded-[2.5rem]">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-bold text-primary">Finalizar Pedido</DialogTitle>
            <DialogDescription>Preencha os dados para entrega via WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="p-8 pt-4 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase text-primary/60 ml-1">Seu Nome</Label>
                <Input id="name" placeholder="Ex: Maria Silva" className="h-12 rounded-2xl bg-muted/30 border-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase text-primary/60 ml-1">WhatsApp</Label>
                <Input id="phone" placeholder="(91) 98888-8888" className="h-12 rounded-2xl bg-muted/30 border-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-primary/60 ml-1">Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'Pix' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod('Pix')}>
                    <RadioGroupItem value="Pix" id="pix" className="text-primary border-primary" />
                    <Label htmlFor="pix" className="font-bold text-xs cursor-pointer">PIX</Label>
                  </div>
                  <div className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'Dinheiro' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setPaymentMethod('Dinheiro')}>
                    <RadioGroupItem value="Dinheiro" id="cash" className="text-primary border-primary" />
                    <Label htmlFor="cash" className="font-bold text-xs cursor-pointer">DINHEIRO</Label>
                  </div>
                </RadioGroup>
              </div>
              {paymentMethod === 'Dinheiro' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                  <Label htmlFor="change" className="text-[10px] font-bold uppercase text-primary/60 ml-1">Precisa de troco para quanto?</Label>
                  <Input id="change" type="number" placeholder="Ex: 50" className="h-12 rounded-2xl bg-muted/30 border-none" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} />
                </div>
              )}
            </div>
            <Button className="w-full h-16 rounded-[1.5rem] bg-primary text-lg font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform" onClick={handleCheckout}>
              Enviar para o WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
