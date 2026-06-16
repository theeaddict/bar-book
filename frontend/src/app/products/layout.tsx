// src/app/products/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Products | Bar Book',
  description: 'Manage bar inventory product catalog prices and groupings.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>;
}
