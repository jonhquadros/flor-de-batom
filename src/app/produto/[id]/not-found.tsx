
import Link from 'next/link';
import { ChevronLeft, ShoppingBag } from 'lucide-react';

export default function ProdutoNaoEncontrado() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center text-center px-4 font-poppins">
      <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary mb-8 animate-pulse shadow-xl shadow-primary/5">
        <ShoppingBag className="h-10 w-10" />
      </div>
      <h1 className="font-headline text-4xl lg:text-5xl text-primary mb-4">
        Ops! Produto não encontrado
      </h1>
      <p className="text-muted-foreground mb-12 max-w-xs leading-relaxed text-sm">
        O item que você está procurando pode ter sido removido ou o link está incorreto.
      </p>
      <Link
        href="/"
        className="group flex items-center gap-3 bg-primary text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
      >
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
        Ver Catálogo Completo
      </Link>
    </div>
  );
}
