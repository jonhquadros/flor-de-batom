
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Calendar as CalendarIcon,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  PlusCircle,
  Eye,
  Boxes,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Order, Product } from '@/lib/types';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
  }, []);

  // Firestore Queries
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'orders');
  }, [db, user]);

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'products');
  }, [db, user]);

  const { data: ordersData, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const orders = ordersData || [];
  const products = productsData || [];

  // Month navigation logic
  const monthOptions = useMemo(() => {
    if (!mounted) return [];
    const months = new Set<string>();
    const now = new Date();
    months.add(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
    
    orders.forEach(order => {
      if (order.createdAt) {
        const date = new Date(order.createdAt);
        if (!isNaN(date.getTime())) {
          months.add(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
        }
      }
    });

    return Array.from(months).sort().reverse();
  }, [orders, mounted]);

  // Data Processing & Insights
  const stats = useMemo(() => {
    if (!mounted || !selectedMonth) return null;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const prevMonthDate = new Date(year, month - 2, 1);
    const prevMonthEnd = new Date(year, month - 1, 0);

    const currentOrders = orders.filter(o => {
      if (!o.createdAt || o.status === 'Cancelado') return false;
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });

    const prevOrders = orders.filter(o => {
      if (!o.createdAt || o.status === 'Cancelado') return false;
      const d = new Date(o.createdAt);
      return d >= prevMonthDate && d <= prevMonthEnd;
    });

    const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const revenueGrowth = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : 0;

    // Today stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter(o => {
      if (!o.createdAt || o.status === 'Cancelado') return false;
      const d = new Date(o.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const itemsSoldToday = ordersToday.reduce((sum, o) => 
      sum + (o.items?.reduce((iSum, i) => iSum + i.quantity, 0) || 0), 0
    );

    // Stock Alerts
    const outOfStock = products.filter(p => p.stock === 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5);

    // Best Sellers for insights
    const productPerformance = currentOrders.reduce((acc, o) => {
      o.items?.forEach(item => {
        if (!acc[item.id]) acc[item.id] = { name: item.name, qty: 0, revenue: 0 };
        acc[item.id].qty += item.quantity;
        acc[item.id].revenue += (item.price * item.quantity);
      });
      return acc;
    }, {} as Record<string, { name: string, qty: number, revenue: number }>);

    const sortedPerformance = Object.values(productPerformance).sort((a, b) => b.qty - a.qty);
    const topSeller = sortedPerformance[0] || null;
    const topEarner = Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue)[0] || null;

    // Daily Revenue Chart Data
    const dailyData: Record<string, number> = {};
    for (let i = 1; i <= endDate.getDate(); i++) {
      dailyData[i.toString().padStart(2, '0')] = 0;
    }

    currentOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const day = d.getDate().toString().padStart(2, '0');
      if (dailyData[day] !== undefined) {
        dailyData[day] += (o.total || 0);
      }
    });

    const chartData = Object.entries(dailyData).map(([day, revenue]) => ({ day, revenue }));

    return {
      currentRevenue,
      revenueGrowth,
      orderCount: currentOrders.length,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      ordersToday: ordersToday.length,
      itemsSoldToday,
      topSeller,
      topEarner,
      chartData
    };
  }, [orders, products, selectedMonth, mounted]);

  const chartConfig = {
    revenue: {
      label: "Receita (R$)",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const handleWhatsAppAction = (order: Order) => {
    const phone = order.customerPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${order.customerName}! Sou da Flor de Batom Makeup sobre seu pedido #${order.orderNumber}.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  if (!mounted || ordersLoading || productsLoading) {
    return (
      <div className="space-y-6 animate-pulse p-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 font-poppins pb-10">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Estratégico</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Análise de performance e saúde da loja.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto bg-white p-1 rounded-xl shadow-sm border">
          <CalendarIcon className="h-4 w-4 text-primary ml-3" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 border-none bg-transparent shadow-none font-bold text-xs uppercase tracking-wider">
              <SelectValue placeholder="Mês de análise" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {monthOptions.map(option => (
                <SelectItem key={option} value={option} className="text-xs font-medium">
                  {new Date(parseInt(option.split('-')[0]), parseInt(option.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. ALERTAS CRÍTICOS (🚨 Topo) */}
      {(stats?.outOfStockCount! > 0 || stats?.lowStockCount! > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {stats?.outOfStockCount! > 0 && (
            <div className="flex items-center gap-4 bg-red-50 border border-red-100 p-4 rounded-2xl shadow-sm">
              <div className="p-3 bg-red-500 rounded-xl">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-900">Estoque Crítico</h4>
                <p className="text-xs text-red-700">Você tem <span className="font-black">{stats?.outOfStockCount} produtos</span> totalmente esgotados.</p>
                <Link href="/admin/inventory" className="text-[10px] font-black uppercase text-red-600 mt-1 flex items-center hover:underline">
                  Repor agora <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
          {stats?.lowStockCount! > 0 && (
            <div className="flex items-center gap-4 bg-orange-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
              <div className="p-3 bg-orange-500 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-orange-900">Atenção ao Estoque</h4>
                <p className="text-xs text-orange-700"><span className="font-black">{stats?.lowStockCount} produtos</span> estão com menos de 5 unidades.</p>
                <Link href="/admin/inventory" className="text-[10px] font-black uppercase text-orange-600 mt-1 flex items-center hover:underline">
                  Ver detalhes <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MÉTRICAS PRINCIPAIS (💰 Contexto) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-xl bg-green-100 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${stats?.revenueGrowth! >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stats?.revenueGrowth! >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats?.revenueGrowth!).toFixed(1)}%
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Receita Mensal</p>
              <h3 className="text-xl md:text-2xl font-black text-foreground">R$ {stats?.currentRevenue.toFixed(2)}</h3>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50/20 rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-6">
            <div className="p-2.5 rounded-xl bg-primary/10 w-fit group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Vendas Concluídas</p>
              <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.orderCount} <span className="text-[10px] font-normal text-muted-foreground ml-1">pedidos</span></h3>
              <p className="text-[10px] text-primary font-bold">Hoje: {stats?.ordersToday} novos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-6">
            <div className="p-2.5 rounded-xl bg-purple-100 w-fit group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Saída de Itens</p>
              <h3 className="text-xl md:text-2xl font-black text-foreground">{stats?.itemsSoldToday} <span className="text-[10px] font-normal text-muted-foreground ml-1">hoje</span></h3>
              <p className="text-[10px] text-purple-600 font-bold">Volume total: {orders.reduce((acc, o) => acc + (o.items?.length || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-6">
            <div className="p-2.5 rounded-xl bg-blue-100 w-fit group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ticket Médio</p>
              <h3 className="text-xl md:text-2xl font-black text-foreground">R$ {(stats?.orderCount! > 0 ? stats?.currentRevenue! / stats?.orderCount! : 0).toFixed(2)}</h3>
              <p className="text-[10px] text-blue-600 font-bold">Fidelidade alta</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 4. GRÁFICO DE RECEITA (📈 Performance) */}
        <Card className="lg:col-span-2 border-none shadow-sm p-6 overflow-hidden">
          <CardHeader className="p-0 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold">Receita Diária</CardTitle>
                <p className="text-xs text-muted-foreground">Distribuição de vendas ao longo do mês.</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-muted/30 border-none">
                Mês Atual
              </Badge>
            </div>
          </CardHeader>
          <div className="h-[350px] w-full">
            <ChartContainer config={chartConfig}>
              <BarChart data={stats?.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis 
                  dataKey="day" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="revenue" 
                  fill="var(--color-revenue)" 
                  radius={[6, 6, 0, 0]} 
                  animationDuration={1500}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </Card>

        {/* 5. CARDS ESTRATÉGICOS & AÇÕES (🧠 Inteligência) */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary text-white p-6 relative overflow-hidden group">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Insight do Mês
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 relative z-10">
              {stats?.topSeller ? (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black opacity-70">Campeão de Vendas</p>
                  <p className="text-lg font-black leading-tight">{stats.topSeller.name}</p>
                  <p className="text-xs opacity-90">{stats.topSeller.qty} unidades vendidas</p>
                </div>
              ) : (
                <p className="text-xs opacity-70 italic">Aguardando primeiras vendas do mês...</p>
              )}

              {stats?.topEarner && stats.topEarner.id !== stats.topSeller?.id && (
                <div className="space-y-1 pt-2 border-t border-white/10">
                  <p className="text-[10px] uppercase font-black opacity-70">Maior Faturamento</p>
                  <p className="text-sm font-bold">{stats.topEarner.name}</p>
                  <p className="text-xs opacity-90">R$ {stats.topEarner.revenue.toFixed(2)}</p>
                </div>
              )}
              
              <div className="pt-4">
                <p className="text-[10px] italic leading-relaxed opacity-80">
                  {stats?.outOfStockCount! > 0 
                    ? `⚠️ Atenção: Você está perdendo vendas potenciais com ${stats?.outOfStockCount} itens esgotados.`
                    : "✨ Ótimo! Seu catálogo está com boa disponibilidade de estoque."}
                </p>
              </div>
            </div>
            <Sparkles className="absolute -bottom-4 -right-4 h-32 w-32 opacity-10 group-hover:scale-125 transition-transform" />
          </Card>

          <Card className="border-none shadow-sm p-6">
            <CardTitle className="text-base font-bold mb-4">Ações Rápidas</CardTitle>
            <div className="grid grid-cols-1 gap-3">
              <Button asChild variant="outline" className="justify-between h-12 rounded-xl border-primary/10 hover:bg-primary/5 hover:text-primary transition-all">
                <Link href="/admin/products">
                  <div className="flex items-center gap-3">
                    <PlusCircle className="h-4 w-4" />
                    <span className="text-xs font-bold">Novo Produto</span>
                  </div>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between h-12 rounded-xl border-primary/10 hover:bg-primary/5 hover:text-primary transition-all">
                <Link href="/admin/inventory">
                  <div className="flex items-center gap-3">
                    <Boxes className="h-4 w-4" />
                    <span className="text-xs font-bold">Gestão de Estoque</span>
                  </div>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between h-12 rounded-xl border-primary/10 hover:bg-primary/5 hover:text-primary transition-all">
                <Link href="/admin/orders">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="text-xs font-bold">Ver Pedidos</span>
                  </div>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* 6. PEDIDOS RECENTES MELHORADOS (📦 Logística) */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Pedidos Recentes</CardTitle>
            <p className="text-xs text-muted-foreground">Últimas movimentações da loja.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs font-black uppercase text-primary">
            <Link href="/admin/orders">Ver Tudo</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground italic text-sm">Nenhum pedido registrado ainda.</div>
          ) : (
            <div className="divide-y">
              {orders.slice(-6).reverse().map((order) => (
                <div key={order.id} className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-muted/10 transition-colors gap-4">
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-full shrink-0 ${
                      order.status === 'Entregue' ? 'bg-green-100' : 
                      order.status === 'Cancelado' ? 'bg-red-100' : 
                      'bg-orange-100'
                    }`}>
                      {order.status === 'Entregue' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : 
                       order.status === 'Cancelado' ? <XCircle className="h-5 w-5 text-red-600" /> : 
                       <Clock className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-black text-primary text-sm">
                        {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.substr(0, 6)}`}
                      </p>
                      <p className="font-bold text-xs truncate max-w-[200px]">{order.customerName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                        <Badge className={`text-[8px] font-black uppercase tracking-tighter h-4 px-1.5 ${
                          order.status === 'Entregue' ? 'bg-green-500 hover:bg-green-600' : 
                          order.status === 'Cancelado' ? 'bg-red-500 hover:bg-red-600' : 
                          'bg-orange-500 hover:bg-orange-600'
                        }`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-10">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Valor</p>
                      <p className="font-black text-primary text-sm md:text-base">R$ {(order.total || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-10 w-10 rounded-xl bg-green-50 text-green-600 hover:bg-green-100"
                        onClick={() => handleWhatsAppAction(order)}
                        title="Falar no WhatsApp"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                      <Button 
                        asChild 
                        size="icon" 
                        variant="ghost" 
                        className="h-10 w-10 rounded-xl bg-muted/50 text-primary hover:bg-muted"
                        title="Ver Pedido"
                      >
                        <Link href={`/admin/orders`}>
                          <Eye className="h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
