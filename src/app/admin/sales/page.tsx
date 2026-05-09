
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
  Tag,
  ChevronRight
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
import { recordStockMovement } from '@/lib/storage-utils';

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
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito'>('Pix');
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
          description: `Apenas ${availableStock} unidades.` 
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

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleConfirmSale = async () => {
    if (cart.length === 0 || !db) return;
    setIsProcessing(true);

    try {
      await runTransaction(db, async (transaction) => {
        const uniqueProductIds = Array.from(new Set(cart.map(i => i.id)));
        const productSnapshots = new Map<string, Product>();

        for (const pid of uniqueProductIds) {
          const productRef = doc(db, 'products', pid);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) throw new Error(`Produto não encontrado.`);
          productSnapshots.set(pid, productSnap.data() as Product);
        }

        const localUpdates = new Map<string, Product>();
        productSnapshots.forEach((data, id) => localUpdates.set(id, { ...data }));

        for (const item of cart) {
          const productData = localUpdates.get(item.id)!;
          
          if (item.selectedColor && productData.variations && productData.variations.length > 0) {
            const varIndex = productData.variations.findIndex(v => v.name === item.selectedColor);
            if (varIndex === -1 || productData.variations[varIndex].stock < item.quantity) {
              throw new Error(`Estoque insuficiente: ${item.name}`);
            }
            productData.variations[varIndex].stock -= item.quantity;
            productData.stock = productData.variations.reduce((sum, v) => sum + v.stock, 0);
          } else {
            if (productData.stock < item.quantity) {
              throw new Error(`Estoque insuficiente: ${item.name}`);
            }
            productData.stock -= item.quantity;
          }
        }

        localUpdates.forEach((data, id) => {
          const productRef = doc(db, 'products', id);
          transaction.update(productRef, { 
            stock: data.stock, 
            variations: data.variations || [],
            updatedAt: serverTimestamp()
          });
          
          // Record individual movements for each item in transaction (via recordStockMovement non-blocking)
          // Note: In production we'd want this inside the transaction too, but for simplicity we call our non-blocking util
          const itemsOfThisProduct = cart.filter(i => i.id === id);
          itemsOfThisProduct.forEach(item => {
            recordStockMovement(db, {
              productId: id,
              productName: data.name,
              variationName: item.selectedColor,
              quantity: -item.quantity,
              type: 'Sale',
              reason: `Venda Manual PDV para ${customerName || 'Cliente Balcão'}`
            });
          });
        });

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
          status: 'Entregue',
          createdAt: new Date().toISOString(),
          source: 'manual',
          discount: discount
        };

        const orderRef = doc(db, 'orders', orderId);
        transaction.set(orderRef, orderData);
      });

      toast({ title: "Venda registrada com sucesso!" });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setPaymentMethod('Pix');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Falha ao registrar venda", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || productsLoading) return <div className="p-8 text-center animate-pulse font-poppins">Iniciando PDV...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-poppins h-full lg:h-[calc(100vh-140px)]">
      {/* Coluna Esquerda: Produtos */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto ou categoria..." 
              className="pl-10 h-11 rounded-xl border-none shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ScrollArea className="w-full sm:w-auto whitespace-nowrap">
            <div className="flex gap-1.5 pb-2">
              <button 
                className={`rounded-xl h-11 px-4 text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedCategory === 'Todos' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-muted-foreground border-muted-foreground/10 hover:border-primary/50'}`}
                onClick={() => setSelectedCategory('Todos')}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  className={`rounded-xl h-11 px-4 text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedCategory === cat.name ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-muted-foreground border-muted-foreground/10 hover:border-primary/50'}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-4">
            {filteredProducts.map(product => {
              const hasVars = product.variations && product.variations.length > 0;
              const currentVarName = selectedVariations[product.id] || (hasVars ? product.variations![0].name : null);
              const currentVar = hasVars ? product.variations!.find(v => v.name === currentVarName) : null;
              const stock = hasVars ? (currentVar?.stock || 0) : product.stock;
              const isOutOfStock = stock <= 0;

              return (
                <Card 
                  key={product.id} 
                  className={`border-none shadow-sm overflow-hidden flex flex-col transition-all h-full ${isOutOfStock ? 'opacity-40 grayscale' : 'hover:shadow-md'}`}
                >
                  <div className="relative aspect-square">
                    <Image src={currentVar?.imageUrl || product.imageUrl} alt={product.name} fill className="object-cover" />
                    {isOutOfStock && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold uppercase">Sem estoque</div>}
                  </div>
                  <CardContent className="p-2.5 flex flex-col flex-1 gap-2">
                    <div className="flex-1 min-h-[5.5rem]">
                      <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">{product.category}</p>
                      <h4 className="text-[10px] font-bold line-clamp-2 leading-tight text-primary mt-0.5">{product.name}</h4>
                      <p className="text-xs font-bold text-primary mt-1">R$ {product.price.toFixed(2)}</p>
                      <p className={`text-[8px] font-bold mt-0.5 ${stock <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>Estoque: {stock}</p>
                    </div>

                    {hasVars && (
                      <div className="flex flex-wrap gap-1">
                        {product.variations!.map(v => (
                          <button
                            key={v.name}
                            className={`px-1.5 py-0.5 rounded-md text-[7px] font-bold border transition-all ${currentVarName === v.name ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-transparent hover:border-primary/30'}`}
                            onClick={() => setSelectedVariations(prev => ({ ...prev, [product.id]: v.name }))}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <Button 
                      className="w-full h-8 rounded-lg mt-auto font-bold text-[9px] uppercase gap-1"
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                    >
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Coluna Direita: Carrinho */}
      <div className="w-full lg:w-[320px] shrink-0 h-full lg:h-auto flex flex-col">
        <Card className="border-none shadow-xl flex flex-col rounded-[1.5rem] overflow-hidden flex-1">
          <CardHeader className="bg-primary text-white p-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Carrinho
            </CardTitle>
            <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px]">
              {cart.reduce((a, b) => a + b.quantity, 0)} itens
            </Badge>
          </CardHeader>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center opacity-30 gap-2">
                    <ShoppingCart className="h-8 w-8" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={`${item.id}-${item.selectedColor || 'default'}`} className="flex gap-2 items-center group">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden border shrink-0">
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[9px] font-bold leading-tight truncate">{item.name}</h5>
                          {item.selectedColor && <p className="text-[7px] font-bold text-muted-foreground uppercase">{item.selectedColor}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] font-bold text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            <div className="flex items-center gap-1.5">
                              <button className="h-5 w-5 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10" onClick={() => updateCartQuantity(item.id, -1, item.selectedColor)}><Minus className="h-2 w-2" /></button>
                              <span className="text-[9px] font-bold">{item.quantity}</span>
                              <button className="h-5 w-5 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10" onClick={() => updateCartQuantity(item.id, 1, item.selectedColor)}><Plus className="h-2 w-2" /></button>
                            </div>
                          </div>
                        </div>
                        <button className="h-6 w-6 text-muted-foreground hover:text-red-500 transition-colors" onClick={() => updateCartQuantity(item.id, -item.quantity, item.selectedColor)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className="p-5 space-y-4 bg-muted/5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Cliente</Label>
                  <Input 
                    placeholder="Nome" 
                    className="h-8 text-[9px] rounded-lg border-muted-foreground/10"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase text-muted-foreground ml-1">WhatsApp</Label>
                  <Input 
                    placeholder="Telefone" 
                    className="h-8 text-[9px] rounded-lg border-muted-foreground/10"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Pagamento</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'Pix', label: 'Pix' },
                    { id: 'Dinheiro', label: 'Dinheiro' },
                    { id: 'Cartão Débito', label: 'C. Débito' },
                    { id: 'Cartão Crédito', label: 'C. Crédito' }
                  ].map(m => (
                    <button
                      key={m.id}
                      className={`h-9 rounded-xl border-2 transition-all text-[8px] font-bold uppercase ${paymentMethod === m.id ? 'border-primary bg-primary text-white shadow-md' : 'border-muted text-muted-foreground hover:border-primary/20'}`}
                      onClick={() => setPaymentMethod(m.id as any)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-1.5 border-t">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground">SUBTOTAL</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-red-500">
                  <span className="flex items-center gap-1 uppercase tracking-tighter">Desconto</span>
                  <div className="flex items-center gap-1">
                    <span>R$</span>
                    <input 
                      type="number" 
                      className="w-12 bg-transparent text-right outline-none font-bold" 
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-lg font-bold text-primary pt-1">
                  <span>TOTAL</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold shadow-xl shadow-primary/20 gap-2 mt-1"
                disabled={cart.length === 0 || isProcessing}
                onClick={handleConfirmSale}
              >
                {isProcessing ? 'Gravando...' : <><CheckCircle2 className="h-4 w-4" /> CONFIRMAR VENDA</>}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
