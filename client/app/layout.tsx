import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Newsreader } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { InterestProvider } from '@/components/listings/InterestContext';
import { SITE } from '@/lib/site';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});
const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Properties`, template: `%s | ${SITE.name}` },
  description: `${SITE.name}: browse current properties for sale and rent, and talk to us directly.`,
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_IN' },
};

export const viewport: Viewport = { themeColor: '#f5f1ea', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${newsreader.variable} ${instrument.variable}`}
    >
      {/* suppressHydrationWarning: browser extensions inject attributes (e.g. cz-shortcut-listen) onto body */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AuthProvider>
          <InterestProvider>{children}</InterestProvider>
          <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </body>
    </html>
  );
}
