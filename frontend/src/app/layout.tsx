import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/providers/app-provider';
import { LayoutWrapper } from '@/components/layout/layout-wrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bar Book',
  description: 'Bar inventory and sales tracker for Kenyan bars/pubs.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bar Book',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#34241A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                }
              });
            }
          `,
        }} />
      </head>
      <body>
        <AppProvider>
          <div className="min-h-screen bg-cream flex flex-col md:flex-row">
            <LayoutWrapper>{children}</LayoutWrapper>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
