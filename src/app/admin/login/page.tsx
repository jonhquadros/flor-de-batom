"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'admin' && pass === 'flor123') {
      sessionStorage.setItem('flor_admin_token', 'true');
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
      router.push('/admin/dashboard');
    } else {
      toast({ variant: "destructive", title: "Erro de Acesso", description: "Usuário ou senha incorretos." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">Acesso Restrito</CardTitle>
          <CardDescription>Entre com suas credenciais de administrador</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuário</Label>
              <Input id="user" placeholder="admin" value={user} onChange={(e) => setUser(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Senha</Label>
              <Input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-lg">Entrar no Painel</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}