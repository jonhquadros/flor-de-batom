
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CheckCircle2, 
  User, 
  Phone, 
  CreditCard, 
  DollarSign, 
  X,
  Zap,
  Tag
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem, Order, Category, ProductVariation } from '@/lib/types';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser 
} from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  getDoc, 
  doc, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';

export default function AdminSales() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Firestore Queries
  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'products'), where('isActive', '==', true));
  }, [db, user]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'categories');
  }, [db, user]);

  const { data: productsRaw, isLoading: productsLoading } = useCollection<Product>(productsQuery as any);
  const { data: categoriesRaw } = useCollection<Category>(categoriesQuery as any);

  // States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Cartão'>('Pix');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Memoized Data
  const categories = useMemo(() => {
    if (!categoriesRaw) return [];
    return [...categoriesRaw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categoriesRaw]);

  const filteredProducts = useMemo(() => {
    if (!productsRaw) return [];
    return productsRaw.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [productsRaw, searchTerm, selectedCategory]);

  const handleAddToCart = async (product: Product) => {
    if (!db) return;

    const variationName = selectedVariations[product.id] || (product.variations?.[0]?.name);
    const hasVariations = product.variations && product.variations.length > 0;
    
    // Verificação de estoque em tempo real antes de colocar no carrinho (UX rápida)
    try {
      const productDoc = await getDoc(doc(db, 'products', product.id));
      if (!productDoc.exists()) throw new Error("Produto não encontrado.");
      
      const currentProduct = productDoc.data() as Product;
      let availableStock = currentProduct.stock;
      let variationImage = currentProduct.imageUrl;

      if (hasVariations) {
        const variation = currentProduct.variations?.find(v => v.name === variationName);
        if (!variation) throw new Error("Variação não encontrada.");
        availableStock = variation.stock;
        if (variation.imageUrl) variationImage = variation.imageUrl;
      }

      const cartItem = cart.find(item => item.id === product.id && item.selectedColor === variationName);
      const quantityInCart = cartItem?.quantity || 0;

      if (availableStock <= quantityInCart) {
        toast({ 
          variant: "destructive", 
          title: "Sem estoque disponível", 
          description: `Apenas ${availableStock} unidades no sistema.` 
        });
        return;
      }

      const cartId = `${product.id}-${variationName || 'default'}`;
      let newCart;
      
      if (cartItem) {
        newCart = cart.map(item => {
          const itemKey = `${item.id}-${item.selectedColor || 'default'}`;
          return itemKey === cartId ? { ...item, quantity: item.quantity + 1 } : item;
        });
      } else {
        newCart = [...cart, { 
          ...product, 
          imageUrl: variationImage, 
          quantity: 1, 
          selectedColor: variationName 
        }];
      }

      setCart(newCart);
      toast({ title: "Adicionado ao carrinho" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const updateCartQuantity = (productId: string, delta: number, variation?: string) => {
    const cartId = `${productId}-${variation || 'default'}`;
    const product = productsRaw?.find(p => p.id === productId);
    if (!product) return;

    const newCart = cart.map(item => {
      const itemKey = `${item.id}-${item.selectedColor || 'default'}`;
      if (itemKey === cartId) {
        const newQty = Math.max(0, item.quantity + delta);
        if (delta > 0) {
          let stockLimit = product.stock;
          if (variation && product.variations) {
            stockLimit = product.variations.find(v => v.name === variation)?.stock || 0;
          }
          if (newQty > stockLimit) return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setCart(newCart);
  };

  const handleClearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleConfirmSale = async () => {
    if (cart.length === 0 || !db) return;
    setIsProcessing(true);

    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. PRIMEIRO: TODAS AS LEITURAS (READS) ---
        const uniqueProductIds = Array.from(new Set(cart.map(i => i.id)));
        const productSnapshots = new Map<string, Product>();

        for (const pid of uniqueProductIds) {
          const productRef = doc(db, 'products', pid);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) throw new Error(`Produto não encontrado.`);
          productSnapshots.set(pid, productSnap.data() as Product);
        }

        // --- 2. SEGUNDO: TODAS AS VALIDAÇÕES E ESCRITAS (WRITES) ---
        const localUpdates = new Map<string, Product>();
        productSnapshots.forEach((data, id) => localUpdates.set(id, { ...data }));

        for (const item of cart) {
          const productData = localUpdates.get(item.id)!;
          
          if (item.selectedColor && productData.variations && productData.variations.length > 0) {
            const varIndex = productData.variations.findIndex(v => v.name === item.selectedColor);
            if (varIndex === -1 || productData.variations[varIndex].stock < item.quantity) {
              throw new Error(`Estoque insuficiente para ${item.name} (${item.selectedColor})`);
            }
            productData.variations[varIndex].stock -= item.quantity;
            productData.stock = productData.variations.reduce((sum, v) => sum + v.stock, 0);
          } else {
            if (productData.stock < item.quantity) {
              throw new Error(`Estoque insuficiente para ${item.name}`);
            }
            productData.stock -= item.quantity;
          }
        }

        // Atualizar estoque no Firestore
        localUpdates.forEach((data, id) => {
          const productRef = doc(db, 'products', id);
          transaction.update(productRef, { 
            stock: data.stock, 
            variations: data.variations || [],
            updatedAt: serverTimestamp()
          });
        });

        // Criar o objeto do pedido com status 'Entregue' para fins de faturamento imediato
        const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
        const orderId = `ORD-${Date.now()}-${orderNumber}`;
        
        const orderData: Order = {
          id: orderId,
          orderNumber,
          customerName: customerName || 'Venda Manual',
          customerPhone: customerPhone || '',
          customerAddress: '',
          items: cart,
          total: total,
          paymentMethod: paymentMethod,
          status: 'Entregue', // Alterado de 'Confirmado' para 'Entregue'
          createdAt: new Date().toISOString(),
          source: 'manual',
          discount: discount
        };

        const orderRef = doc(db, 'orders', orderId);
        transaction.set(orderRef, orderData);
      });

      toast({ title: "Venda registrada com sucesso!", className: "bg-green-600 text-white shadow-xl" });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setPaymentMethod('Pix');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Falha ao registrar venda", 
        description: error.message 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || productsLoading) return <div className="p-8 text-center animate-pulse">Iniciando PDV...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-poppins min-h-[calc(100vh-140px)]">
      {/* Coluna Esquerda: Produtos */}
      <div className="flex-1 space-y-6 flex flex-col">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto ou categoria..." 
              className="pl-10 h-12 rounded-xl border-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <button 
              className={`rounded-full h-9 px-6 text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedCategory === 'Todos' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-muted-foreground border-muted-foreground/20 hover:border-primary/50'}`}
              onClick={() => setSelectedCategory('Todos')}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                className={`rounded-full h-9 px-6 text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedCategory === cat.name ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-muted-foreground border-muted-foreground/20 hover:border-primary/50'}`}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 flex-1">
          {filteredProducts.map(product => {
            const hasVars = product.variations && product.variations.length > 0;
            const currentVarName = selectedVariations[product.id] || (hasVars ? product.variations![0].name : null);
            const currentVar = hasVars ? product.variations!.find(v => v.name === currentVarName) : null;
            const stock = hasVars ? (currentVar?.stock || 0) : product.stock;
            const isOutOfStock = stock <= 0;

            return (
              <Card 
                key={product.id} 
                className={`border-none shadow-sm overflow-hidden flex flex-col transition-all ${isOutOfStock ? 'opacity-40 grayscale' : 'hover:shadow-md'}`}
              >
                <div className="relative aspect-square">
                  <Image src={currentVar?.imageUrl || product.imageUrl} alt={product.name} fill className="object-cover" />
                  {isOutOfStock && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold uppercase">Esgotado</div>}
                </div>
                <CardContent className="p-3 flex flex-col flex-1 gap-2">
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{product.category}</p>
                    <h4 className="text-[11px] font-bold line-clamp-2 leading-tight text-primary min-h-[2.4em]">{product.name}</h4>
                    <p className="text-sm font-bold text-primary mt-1">R$ {product.price.toFixed(2)}</p>
                    <p className={`text-[9px] font-bold mt-0.5 ${stock <= 12 ? 'text-red-500' : 'text-muted-foreground'}`}>Estoque: {stock} un.</p>
                  </div>

                  {hasVars && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.variations!.map(v => (
                        <button
                          key={v.name}
                          className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold border transition-all ${currentVarName === v.name ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-transparent hover:border-primary/30'}`}
                          onClick={() => setSelectedVariations(prev => ({ ...prev, [product.id]: v.name }))}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button 
                    className="w-full h-8 rounded-lg mt-2 font-bold text-[10px] uppercase gap-1"
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock}
                  >
                    <Zap className="h-3 w-3" /> Vender
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Coluna Direita: Carrinho */}
      <div className="w-full lg:w-[320px] shrink-0">
        <Card className="border-none shadow-xl h-full flex flex-col rounded-[2rem] overflow-hidden sticky top-6">
          <CardHeader className="bg-primary text-white p-6 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> PDV Manual
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-6">
              {cart.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center opacity-30 gap-2">
                  <ShoppingCart className="h-10 w-10" />
                  <p className="text-xs font-bold uppercase tracking-widest">Aguardando Produtos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Itens ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
                    <Button variant="ghost" className="h-6 text-[9px] font-bold text-destructive hover:bg-destructive/10" onClick={handleClearCart}>LIMPAR</Button>
                  </div>
                  {cart.map(item => (
                    <div key={`${item.id}-${item.selectedColor || 'default'}`} className="flex gap-3 items-start group">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden border shrink-0">
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[10px] font-bold leading-tight truncate">{item.name}</h5>
                        {item.selectedColor && <p className="text-[8px] font-bold text-muted-foreground uppercase">{item.selectedColor}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-bold text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <button className="h-5 w-5 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10" onClick={() => updateCartQuantity(item.id, -1, item.selectedColor)}><Minus className="h-3 w-3" /></button>
                            <span className="text-[10px] font-bold">{item.quantity}</span>
                            <button className="h-5 w-5 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10" onClick={() => updateCartQuantity(item.id, 1, item.selectedColor)}><Plus className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator />

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <Input 
                    placeholder="Nome do Cliente (Opcional)" 
                    className="h-8 text-[10px] border-none bg-muted/30 rounded-lg"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <Input 
                    placeholder="WhatsApp (Opcional)" 
                    className="h-8 text-[10px] border-none bg-muted/30 rounded-lg"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Pagamento</p>
                <div className="flex gap-1">
                  {[
                    { id: 'Pix', icon: Zap, label: 'Pix' },
                    { id: 'Dinheiro', icon: DollarSign, label: 'Dinheiro' },
                    { id: 'Cartão', icon: CreditCard, label: 'Cartão' }
                  ].map(m => (
                    <button
                      key={m.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-primary bg-primary text-white shadow-md' : 'border-muted text-muted-foreground'}`}
                      onClick={() => setPaymentMethod(m.id as any)}
                    >
                      <m.icon className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">SUBTOTAL</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-red-500">
                  <span className="flex items-center gap-1 uppercase"><Tag className="h-3 w-3" /> Desconto</span>
                  <div className="flex items-center gap-1">
                    <span>R$</span>
                    <input 
                      type="number" 
                      className="w-16 bg-transparent text-right outline-none font-bold border-b border-red-500/30" 
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xl font-bold text-primary pt-1">
                  <span>TOTAL</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-sm font-bold shadow-xl shadow-primary/20 gap-2 mt-2"
                disabled={cart.length === 0 || isProcessing}
                onClick={handleConfirmSale}
              >
                {isProcessing ? 'Sincronizando...' : <><CheckCircle2 className="h-5 w-5" /> CONCLUIR E ENTREGAR</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
