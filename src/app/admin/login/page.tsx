"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'flordebatom' && pass === 'gestaoflor@26') {
      sessionStorage.setItem('adminLogado', 'true');
      toast({ title: "Acesso Autorizado", description: "Bem-vinda ao painel de gestão." });
      router.push('/admin/dashboard');
    } else {
      toast({ variant: "destructive", title: "Erro de Acesso", description: "Usuário ou senha incorretos." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-primary">Área Restrita</CardTitle>
          <CardDescription>Painel administrativo Flor de Batom</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="user" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Usuário</Label>
              <Input id="user" placeholder="flordebatom" value={user} onChange={(e) => setUser(e.target.value)} required className="h-11 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha</Label>
              <Input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required className="h-11 rounded-lg" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-14 text-lg font-bold rounded-xl gap-2">
              <LogIn className="h-5 w-5" /> Entrar no Sistema
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
