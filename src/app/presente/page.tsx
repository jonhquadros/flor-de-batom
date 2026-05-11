
import type { Metadata } from 'next';
import { MontadorPresente } from '@/components/presente/MontadorPresente';

export const metadata: Metadata = {
  title: 'Monte seu Presente — Flor de Batom Makeup',
  description: 'Crie uma cesta ou copo de maquiagem personalizado para presentear!',
};

export default function PresentePage() {
  return (
    <main className="min-h-screen bg-[#FDFCFB]">
      <MontadorPresente />
    </main>
  );
}
