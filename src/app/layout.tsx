import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default:'MediCart Pharmacy Demo', template:'%s | MediCart' },
  description:'Production-oriented digital pharmacy commerce demonstration with prescription review and batch inventory.'
};

export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
  return <html lang="en"><body><Header />{children}<footer className="footer"><div className="container footer-grid">
    <div><b>MediCart Demo</b><br/>Digital pharmacy commerce reference implementation.</div>
    <div>Demo only — not medical advice. Prescription products require authorized review.</div>
  </div></footer></body></html>;
}
