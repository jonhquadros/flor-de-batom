
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
  Tags,
  Boxes,
  BarChart3,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth, useUser, initiateAnonymousSignIn, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');

  const LOGO_URL = "https://i.ibb.co/6J4J1LMd/florlogo.jpg";
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || isLoginPage || !db || !auth) return;

    const checkAuth = async () => {
      try {
        const sessionToken = sessionStorage.getItem('adminLogado') === 'true';
        const sessionUser = sessionStorage.getItem('adminUser');

        if (!sessionToken || !sessionUser) {
          router.push('/admin/login');
          return;
        }

        // Garante que o Firebase Auth está ativo
        if (!isUserLoading && !user) {
          await initiateAnonymousSignIn(auth);
        }

        // Verifica no Firestore se o usuário da sessão ainda é válido
        const userDoc = await getDoc(doc(db, 'admin_users', sessionUser));
        if (userDoc.exists()) {
          setAuthorized(true);
          setAdminUsername(sessionUser);
        } else {
          sessionStorage.clear();
          router.push('/admin/login');
        }
      } catch (e) {
        console.error("Erro na verificação de sessão admin:", e);
      }
    };

    checkAuth();
  }, [isClient, pathname, router, user, isUserLoading, auth, db, isLoginPage]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) return <>{children}</>;

  if (!isClient || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A] text-white font-poppins p-4 text-center">
        <div className="space-y-6">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-[#7B1C2A]/30 animate-pulse">
            <Image src={LOGO_URL} alt="Loading" fill className="object-cover" />
          </div>
          <div className="space-y-2">
            <div className="w-12 h-1 bg-[#7B1C2A] mx-auto rounded-full animate-bounce"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Verificando Credenciais na Nuvem</p>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Categorias', path: '/admin/categories', icon: Tags },
    { name: 'Estoque', path: '/admin/inventory', icon: Boxes },
    { name: 'Faturamento', path: '/admin/billing', icon: BarChart3 },
    { name: 'Pedidos', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Produtos', path: '/admin/products', icon: Package },
    { name: 'Vendas PDV', path: '/admin/sales', icon: PlusCircle },
  ];

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-muted/30 font-poppins">
      <aside className="hidden lg:flex w-72 flex-col bg-[#1A1A1A] text-white shadow-xl fixed inset-y-0 left-0 z-50">
        <div className="p-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-lg border border-white/20">
              <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
            </div>
            <h2 className="text-xl font-bold">Gestão Flor de Batom</h2>
          </div>
        </div>
        
        <div className="px-6 py-4 mx-6 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Logado como</p>
            <p className="text-xs font-bold truncate">{adminUsername}</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 mt-2">
          {navItems.map(item => (
            <Link key={item.path} href={item.path}>
              <Button 
                variant="ghost" 
                className={`w-full justify-start gap-3 h-12 rounded-xl transition-all border-none ${pathname === item.path ? 'bg-[#7B1C2A] text-white hover:bg-[#7B1C2A]/90' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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

      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <header className="lg:hidden h-16 bg-[#1A1A1A] text-white flex items-center justify-between px-4 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0">
              <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
            </div>
            <h2 className="text-xl font-bold truncate">Gestão Flor de Batom</h2>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-white/10 ml-2" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-7 w-7" />
          </Button>
        </header>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 lg:hidden backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute top-0 right-0 w-[85%] max-w-sm h-full bg-[#1A1A1A] p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-md">
                    <Image src={LOGO_URL} alt="Logo Flor de Batom" fill className="object-cover" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Menu</h2>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold text-gray-300">{adminUsername}</span>
              </div>

              <nav className="space-y-2 flex-1 overflow-y-auto">
                {navItems.map(item => (
                  <Link key={item.path} href={item.path}>
                    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${pathname === item.path ? 'bg-[#7B1C2A] text-white shadow-lg shadow-[#7B1C2A]/20' : 'text-gray-400 border border-white/5'}`}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-bold text-base">{item.name}</span>
                    </div>
                  </Link>
                ))}
                <Separator className="bg-white/10 my-4" />
                <Link href="/" target="_blank">
                  <div className="flex items-center gap-4 p-4 rounded-xl text-gray-400 hover:text-white transition-colors">
                    <ExternalLink className="h-5 w-5" />
                    <span className="font-bold text-base">Visitar Loja</span>
                  </div>
                </Link>
              </nav>
              <div className="pt-6 mt-auto">
                 <Button variant="destructive" className="w-full justify-center gap-3 h-12 rounded-xl font-bold" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" /> Sair do Sistema
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
