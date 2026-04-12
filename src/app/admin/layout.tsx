"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  ChevronRight,
  Menu,
  X
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
    const token = sessionStorage.getItem('flor_admin_token');
    
    if (!token && !isLogin) {
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
    sessionStorage.removeItem('flor_admin_token');
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r">
        <div className="p-6 h-16 flex items-center">
          <h2 className="text-xl font-headline font-bold text-primary">Flor de Batom</h2>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} href={item.path}>
              <Button 
                variant={pathname === item.path ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 h-11 transition-all ${pathname === item.path ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4">
          <h2 className="text-lg font-headline font-bold text-primary">Flor de Batom Admin</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute top-0 right-0 w-64 h-full bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-headline font-bold text-primary">Painel</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="space-y-4">
                {navItems.map(item => (
                  <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${pathname === item.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                  </Link>
                ))}
              </nav>
              <div className="mt-8 pt-8 border-t">
                 <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" /> Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}