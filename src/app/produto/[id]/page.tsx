
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { ProdutoDetalhe } from '@/components/produto/ProdutoDetalhe';
import { Product } from '@/lib/types';

// Inicialização segura para Server Components
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) return { title: 'Produto não encontrado' };

    const p = snap.data() as Product;
    const title = `${p.name} — Flor de Batom Makeup`;
    const description = p.description || `${p.name} por R$ ${p.price.toFixed(2).replace('.', ',')}`;
    const url = `https://flordebatommakeup.netlify.app/produto/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: p.imageUrl, width: 800, height: 800, alt: p.name }],
        url,
        siteName: 'Flor de Batom Makeup',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [p.imageUrl],
      },
    };
  } catch (e) {
    return { title: 'Flor de Batom Makeup' };
  }
}

export default async function ProdutoPage({ params }: Props) {
  const { id } = await params;
  
  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) notFound();
    
    const produto = { ...snap.data(), id: snap.id } as Product;
    
    return <ProdutoDetalhe produto={produto} />;
  } catch (e) {
    notFound();
  }
}
