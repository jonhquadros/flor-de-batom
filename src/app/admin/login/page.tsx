
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, LogIn, Loader2 } from 'lucide-react';
import { useAuth, useFirestore, initiateAnonymousSignIn } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { seedInitialDataToFirestore } from '@/lib/storage-utils';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  // Garante que os usuários iniciais existam no Firestore ao carregar a página
  useEffect(() => {
    if (db) {
      seedInitialDataToFirestore(db);
    }
  }, [db]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth) return;

    setIsLoading(true);
    try {
      // 1. Garante uma sessão ativa para leitura (regras de segurança)
      initiateAnonymousSignIn(auth);

      // 2. Busca o usuário no Firestore pelo ID (username)
      const userDocRef = doc(db, 'admin_users', username.toLowerCase().trim());
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // 3. Valida a senha conforme solicitado
        if (userData.password === password) {
          sessionStorage.setItem('adminLogado', 'true');
          sessionStorage.setItem('adminUser', username.toLowerCase().trim());
          
          toast({ title: "Acesso Autorizado", description: "Bem-vinda ao painel de gestão." });
          router.push('/admin/dashboard');
        } else {
          toast({ variant: "destructive", title: "Erro de Acesso", description: "Senha incorreta." });
        }
      } else {
        toast({ variant: "destructive", title: "Erro de Acesso", description: "Usuário não encontrado no banco de dados." });
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast({ variant: "destructive", title: "Erro de Sistema", description: "Falha na comunicação com o banco de dados." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-poppins">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Área Restrita</CardTitle>
          <CardDescription>Painel administrativo Flor de Batom</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="user" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Usuário</Label>
              <Input 
                id="user" 
                placeholder="Ex: flordebatom" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                disabled={isLoading}
                required 
                className="h-11 rounded-lg" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha</Label>
              <Input 
                id="pass" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={isLoading}
                required 
                className="h-11 rounded-lg" 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 h-14 text-lg font-bold rounded-xl gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              {isLoading ? "Validando..." : "Entrar no Sistema"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
