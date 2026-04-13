"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { getStoredOrders, getStoredProducts } from '@/lib/storage-utils';
import { Order, Product } from '@/lib/types';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = () => {
    setOrders(getStoredOrders());
    setProducts(getStoredProducts());
  };

  useEffect(() => {
    loadData();
    // Ouvinte para mudanças no localStorage
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Filtramos pedidos cancelados das métricas financeiras e gráficos de vendas
  const activeOrders = orders.filter(o => o.status !== 'Cancelado');
  
  const totalRevenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrdersCount = activeOrders.length;
  const totalProductsCount = products.length;
  
  // Cálculo de Vendas por Produto (apenas pedidos ativos)
  const salesByProduct = activeOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  // Preparamos os dados para o gráfico (Top 10 produtos mais vendidos para não poluir o visual)
  const chartData = Object.entries(salesByProduct)
    .map(([name, count]) => ({
      name,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Mostramos apenas os top 10

  const chartConfig = {
    count: {
      label: "Itens Vendidos",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const stats = [
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Vendas Ativas', value: totalOrdersCount, icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Produtos Ativos', value: totalProductsCount, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Ticket Médio', value: `R$ ${(totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0).toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline">Produtos Mais Vendidos</CardTitle>
            <p className="text-xs text-muted-foreground">Top 10 itens com maior volume de saída.</p>
          </CardHeader>
          <CardContent className="h-[350px] pb-10">
            <ChartContainer config={chartConfig}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`} 
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum pedido ainda.</div>
            ) : (
              <div className="divide-y">
                {orders.slice(-5).reverse().map((order) => (
                  <div key={order.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <p className="font-bold text-primary">
                        {order.orderNumber ? `#${order.orderNumber}` : `#${order.id.substr(0, 6)}`}
                      </p>
                      <p className="font-medium text-sm leading-none">{order.customerName}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-bold text-primary leading-none">R$ {order.total.toFixed(2)}</p>
                      <div className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                        order.status === 'Entregue' ? 'bg-green-100 text-green-700' : 
                        order.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 
                        order.status === 'Pendente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
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
