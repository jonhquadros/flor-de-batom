"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  LogOut, 
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Tags
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const LOGO_URL = "https://i.ibb.co/6J4J1LMd/florlogo.jpg";

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
    { name: 'Categorias', path: '/admin/categories', icon: Tags },
    { name: 'Pedidos', path: '/admin/orders', icon: ShoppingBag },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('adminLogado');
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-muted/30 font-poppins">
      {/* Sidebar Carbon - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-carbon text-white shadow-xl fixed inset-y-0 left-0 z-50">
        <div className="p-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-lg border border-white/20">
              <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
            </div>
            <h2 className="text-lg font-bold">Gestão Flor de Batom</h2>
          </div>
        </div>
        <Separator className="bg-white/10 mx-6 w-auto" />
        <nav className="flex-1 p-6 space-y-2 mt-4">
          {navItems.map(item => (
            <Link key={item.path} href={item.path}>
              <Button 
                variant="ghost" 
                className={`w-full justify-start gap-3 h-12 rounded-xl transition-all border-none ${pathname === item.path ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {pathname === item.path && <ChevronRight className="ml-auto h-4 w-4" />}
              </Button>
            </Link>
          ))}
          <div className="pt-6">
            <Separator className="bg-white/10 mb-6" />
            <Link href="/" target="_blank">
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-gray-400 hover:text-white hover:bg-white/5">
                <ExternalLink className="h-5 w-5" /> Ver Loja Online
              </Button>
            </Link>
          </div>
        </nav>
        <div className="p-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl" onClick={handleLogout}>
            <LogOut className="h-5 w-5" /> Sair do Sistema
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-carbon text-white flex items-center justify-between px-6 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20">
              <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
            </div>
            <h2 className="text-base font-bold">Painel Flor</h2>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 lg:hidden backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute top-0 right-0 w-[80%] max-w-sm h-full bg-carbon p-8 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-md">
                    <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="space-y-4 flex-1">
                {navItems.map(item => (
                  <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${pathname === item.path ? 'bg-primary text-white' : 'text-gray-400 border border-white/5'}`}>
                      <item.icon className="h-6 w-6" />
                      <span className="font-bold text-lg">{item.name}</span>
                    </div>
                  </Link>
                ))}
                <Separator className="bg-white/10 my-4" />
                <Link href="/" target="_blank" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="flex items-center gap-4 p-4 rounded-2xl text-gray-400">
                    <ExternalLink className="h-6 w-6" />
                    <span className="font-bold text-lg">Visitar Loja</span>
                  </div>
                </Link>
              </nav>
              <div className="pt-8 mt-auto">
                 <Button variant="destructive" className="w-full justify-center gap-3 h-14 rounded-2xl font-bold" onClick={handleLogout}>
                  <LogOut className="h-6 w-6" /> Sair Agora
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
