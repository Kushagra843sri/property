import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { StickyContact } from '@/components/layout/StickyContact';
import PublicNotFound from './(public)/not-found';

// Unknown URLs resolve here (outside the (public) layout), so it needs its own shell and landmark.
export default function RootNotFound() {
  return (
    <>
      <Header />
      <main id="main" className="min-h-[60dvh]">
        <PublicNotFound />
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
