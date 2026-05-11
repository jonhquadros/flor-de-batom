
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Flor de Batom | Beleza e Sofisticação',
  description: 'Descubra a coleção exclusiva de maquiagens Flor de Batom.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flor de Batom',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#7B1C2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600;700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="https://i.ibb.co/6J4J1LMd/florlogo.jpg" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
        
        {/* Registro do Service Worker para PWA */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
