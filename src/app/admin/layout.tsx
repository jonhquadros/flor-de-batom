"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  LogOut, 
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isLogin = pathname === '/admin/login';
    const authorized = sessionStorage.getItem('adminLogado') === 'true';
    
    if (!authorized && !isLogin) {
      router.push('/admin/login');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;
  if (!authorized) return null;

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Produtos', path: '/admin/products', icon: Package },
    { name: 'Pedidos', path: '/admin/orders', icon: ShoppingBag },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('adminLogado');
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar Carbon */}
      <aside className="hidden md:flex w-72 flex-col bg-carbon text-white shadow-xl">
        <div className="p-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold">FB</div>
            <h2 className="text-lg font-headline font-bold">Flor de Batom</h2>
          </div>
        </div>
        <Separator className="bg-white/10" />
        <nav className="flex-1 p-6 space-y-2">
          {navItems.map(item => (
            <Link key={item.path} href={item.path}>
              <Button 
                variant="ghost" 
                className={`w-full justify-start gap-3 h-12 rounded-xl transition-all ${pathname === item.path ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          ))}
          <Separator className="bg-white/10 my-4" />
          <Link href="/" target="_blank">
            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-gray-400 hover:text-white hover:bg-white/5">
              <ExternalLink className="h-5 w-5" /> Ver Loja
            </Button>
          </Link>
        </nav>
        <div className="p-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl" onClick={handleLogout}>
            <LogOut className="h-5 w-5" /> Sair do Painel
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-carbon text-white flex items-center justify-between px-6">
          <h2 className="text-lg font-headline font-bold">Admin FB</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute top-0 left-0 w-72 h-full bg-carbon p-8 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-headline font-bold text-white">Gestão</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="space-y-4 flex-1">
                {navItems.map(item => (
                  <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${pathname === item.path ? 'bg-primary text-white' : 'text-gray-400'}`}>
                      <item.icon className="h-6 w-6" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </Link>
                ))}
              </nav>
              <div className="pt-10 border-t border-white/10">
                 <Button variant="ghost" className="w-full justify-start gap-3 text-red-400" onClick={handleLogout}>
                  <LogOut className="h-6 w-6" /> Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
