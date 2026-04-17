
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, DollarSign, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { Order, Product } from '@/lib/types';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  
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

  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
  }, []);

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

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Cancelado'), [orders]);
  
  const filteredOrdersForChart = useMemo(() => activeOrders.filter(order => {
    if (!order.createdAt || !selectedMonth) return false;
    const orderDate = new Date(order.createdAt);
    const orderMonth = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return orderMonth === selectedMonth;
  }), [activeOrders, selectedMonth]);

  const totalRevenue = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrdersCount = activeOrders.length;
  const totalProductsCount = products.length;
  
  const salesByProduct = useMemo(() => filteredOrdersForChart.reduce((acc, order) => {
    if (order.items) {
      order.items.forEach(item => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
      });
    }
    return acc;
  }, {} as Record<string, number>), [filteredOrdersForChart]);

  const chartData = useMemo(() => Object.entries(salesByProduct)
    .map(([name, count]) => ({
      name,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10), [salesByProduct]);

  const chartConfig = {
    count: {
      label: "Itens Vendidos",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const stats = [
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Vendas Ativas', value: totalOrdersCount.toString(), icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Produtos Ativos', value: totalProductsCount.toString(), icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Ticket Médio', value: `R$ ${(totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0).toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  if (!mounted || ordersLoading || productsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-poppins">Carregando dados sincronizados...</div>;

  return (
    <div className="space-y-6 md:space-y-8 font-poppins">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Visão geral em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 md:p-6 flex flex-col items-center gap-2 md:gap-4 text-center">
              <div className={`p-2 md:p-3 rounded-xl ${stat.bg} shrink-0`}>
                <stat.icon className={`h-4 w-4 md:h-6 md:w-6 ${stat.color}`} />
              </div>
              <div className="min-w-0 w-full space-y-1">
                <p className="text-[10px] md:text-xs font-normal text-muted-foreground uppercase tracking-wider truncate">{stat.label}</p>
                <h3 className="text-sm md:text-xl font-bold font-poppins truncate">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 p-4 md:p-6">
            <div>
              <CardTitle className="text-lg md:text-xl font-bold">Mais Vendidos</CardTitle>
              <p className="text-[10px] md:text-xs text-muted-foreground">Volume de saída por produto.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto bg-muted/30 p-1 rounded-lg">
              <CalendarIcon className="h-3 w-3 text-muted-foreground ml-2" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-[10px] border-none bg-transparent shadow-none">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option} value={option} className="text-xs">
                      {new Date(parseInt(option.split('-')[0]), parseInt(option.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px] pb-4 px-2">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                  <XAxis 
                    dataKey="name" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs opacity-50 italic">
                <ShoppingBag className="h-8 w-8 mb-2" />
                Sem vendas neste mês.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl font-bold">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhum pedido ainda.</div>
            ) : (
              <div className="divide-y">
                {orders.slice(-5).reverse().map((order) => (
                  <div key={order.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-primary text-xs md:text-sm">
                        {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.substr(0, 6)}`}
                      </p>
                      <p className="font-medium text-xs truncate">{order.customerName}</p>
                      <p className="text-[9px] text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Data Indisponível'}</p>
                    </div>
                    <div className="text-right space-y-1 shrink-0 ml-2">
                      <p className="font-bold text-primary text-xs md:text-sm">R$ {(order.total || 0).toFixed(2)}</p>
                      <div className={`text-[8px] md:text-[9px] uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                        order.status === 'Entregue' ? 'bg-green-100 text-green-700' : 
                        order.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 
                        order.status === 'Pendente' ? 'bg-orange-100 text-orange-700' : 
                        order.status === 'Pago' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
