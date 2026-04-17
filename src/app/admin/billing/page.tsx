
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Percent
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order, Product } from '@/lib/types';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminBilling() {
  const db = useFirestore();
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleCurrentMonth = () => setCurrentDate(new Date());

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Data Processing
  const billingData = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const startOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    const filterByDate = (orders: Order[], start: Date, end: Date) => {
      return orders.filter(o => {
        if (!o.createdAt) return false;
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      });
    };

    const currentOrders = filterByDate(orders, startOfMonth, endOfMonth);
    const prevOrders = filterByDate(orders, startOfPrevMonth, endOfPrevMonth);

    const getStats = (monthOrders: Order[]) => {
      const active = monthOrders.filter(o => ['Pago', 'Enviado', 'Entregue'].includes(o.status));
      const cancelled = monthOrders.filter(o => o.status === 'Cancelado');
      const revenue = active.reduce((acc, o) => acc + (o.total || 0), 0);
      const lost = cancelled.reduce((acc, o) => acc + (o.total || 0), 0);
      return { 
        revenue, 
        count: active.length, 
        cancelledCount: cancelled.length,
        lostValue: lost
      };
    };

    const currentStats = getStats(currentOrders);
    const prevStats = getStats(prevOrders);

    const growth = prevStats.revenue > 0 
      ? ((currentStats.revenue - prevStats.revenue) / prevStats.revenue) * 100 
      : 0;

    // Charts: Revenue by day
    const dailyDataMap: Record<string, { date: string, revenue: number, orders: number }> = {};
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      const dayStr = i.toString().padStart(2, '0');
      dailyDataMap[dayStr] = { date: dayStr, revenue: 0, orders: 0 };
    }

    currentOrders.forEach(o => {
      if (!o.createdAt || !['Pago', 'Enviado', 'Entregue'].includes(o.status)) return;
      const d = new Date(o.createdAt);
      const day = d.getDate().toString().padStart(2, '0');
      if (dailyDataMap[day]) {
        dailyDataMap[day].revenue += (o.total || 0);
        dailyDataMap[day].orders += 1;
      }
    });

    const chartData = Object.values(dailyDataMap);

    // Top Products Analysis
    const productStatsMap: Record<string, { name: string, qty: number, revenue: number, cost: number }> = {};
    currentOrders.filter(o => ['Pago', 'Enviado', 'Entregue'].includes(o.status)).forEach(o => {
      o.items?.forEach(item => {
        if (!productStatsMap[item.id]) {
          const originalProduct = products.find(p => p.id === item.id);
          productStatsMap[item.id] = { 
            name: item.name, 
            qty: 0, 
            revenue: 0, 
            cost: originalProduct?.cost || 0 
          };
        }
        productStatsMap[item.id].qty += item.quantity;
        productStatsMap[item.id].revenue += (item.price * item.quantity);
      });
    });

    const topProducts = Object.values(productStatsMap)
      .map(p => {
        const totalCost = p.cost * p.qty;
        const profit = p.revenue - totalCost;
        const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
        return { ...p, margin };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      currentStats,
      growth,
      chartData,
      topProducts
    };
  }, [orders, products, currentDate]);

  const { currentStats, growth, chartData, topProducts } = billingData;

  const chartConfig = {
    revenue: {
      label: "Receita (R$)",
      color: "hsl(var(--primary))",
    },
    orders: {
      label: "Pedidos",
      color: "hsl(var(--secondary))",
    }
  } satisfies ChartConfig;

  if (!mounted || ordersLoading || productsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Processando análise financeira...</div>;

  return (
    <div className="space-y-6 md:space-y-8 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Faturamento</h1>
          <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest">{monthYearLabel}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border w-full sm:w-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" className="text-xs font-bold px-4 h-9" onClick={handleCurrentMonth}>Mês Atual</Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-green-100"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita (Mês)</p>
              <h3 className="text-sm md:text-xl font-poppins font-semibold">R$ {currentStats.revenue.toFixed(2)}</h3>
              <div className={`flex items-center justify-center gap-1 text-[9px] font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(growth).toFixed(1)}% vs anterior
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-primary/10"><ShoppingBag className="h-5 w-5 text-primary" /></div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total de Pedidos</p>
              <h3 className="text-sm md:text-xl font-poppins font-semibold">{currentStats.count}</h3>
              <p className="text-[9px] text-muted-foreground">Vendas finalizadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-purple-100"><Percent className="h-5 w-5 text-purple-600" /></div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
              <h3 className="text-sm md:text-xl font-poppins font-semibold">R$ {(currentStats.count > 0 ? currentStats.revenue / currentStats.count : 0).toFixed(2)}</h3>
              <p className="text-[9px] text-muted-foreground">Valor por cliente</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-xl bg-red-100"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cancelamentos</p>
              <h3 className="text-sm md:text-xl font-poppins font-semibold">{currentStats.cancelledCount}</h3>
              <p className="text-[9px] text-red-500 font-bold">Perda: R$ {currentStats.lostValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm p-4">
          <CardHeader className="p-2">
            <CardTitle className="text-lg font-bold">Receita Diária</CardTitle>
          </CardHeader>
          <div className="h-[300px]">
            <ChartContainer config={chartConfig}>
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </Card>

        <Card className="border-none shadow-sm p-4">
          <CardHeader className="p-2">
            <CardTitle className="text-lg font-bold">Volume de Pedidos</CardTitle>
          </CardHeader>
          <div className="h-[300px]">
            <ChartContainer config={chartConfig}>
              <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-orders)" }} />
              </LineChart>
            </ChartContainer>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white/50 border-b p-6">
          <CardTitle className="text-lg font-bold">Desempenho por Produto (Top 10)</CardTitle>
          <p className="text-xs text-muted-foreground">Análise de vendas e margem de lucro calculada.</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs uppercase font-bold">Produto</TableHead>
                <TableHead className="text-xs uppercase font-bold text-center">Vendidos</TableHead>
                <TableHead className="text-xs uppercase font-bold text-center">Receita</TableHead>
                <TableHead className="text-xs uppercase font-bold text-center">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm italic">
                    Sem movimentação neste período.
                  </TableCell>
                </TableRow>
              ) : (
                topProducts.slice(0, 10).map((p, i) => (
                  <TableRow key={i} className="hover:bg-muted/10 h-16">
                    <TableCell>
                      <span className="font-bold text-xs text-primary">{p.name}</span>
                    </TableCell>
                    <TableCell className="text-center font-medium text-xs">
                      {p.qty} un.
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-primary">
                      R$ {p.revenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-bold ${p.margin > 50 ? 'text-green-600' : p.margin > 20 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {p.margin.toFixed(1)}%
                        </span>
                        {p.cost === 0 && <span className="text-[8px] text-muted-foreground uppercase">S/ Custo cadastrado</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="font-bold text-primary flex items-center gap-2 justify-center md:justify-start">
            <XCircle className="h-4 w-4" /> Detalhes de Cancelamentos
          </h4>
          <p className="text-xs text-muted-foreground">Impacto financeiro direto no faturamento mensal.</p>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor Perdido</p>
            <p className="text-lg font-bold text-red-600">R$ {currentStats.lostValue.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">% do Faturamento</p>
            <p className="text-lg font-bold text-red-600">
              {currentStats.revenue > 0 ? ((currentStats.lostValue / (currentStats.revenue + currentStats.lostValue)) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
