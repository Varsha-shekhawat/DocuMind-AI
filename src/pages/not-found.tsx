import { Link } from 'wouter';
import { Logo } from '@/components/documind';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between p-6">
      <header className="flex items-center justify-between border-b border-ink/10 pb-4">
        <Logo />
        <Link href="/" className="text-xs font-semibold text-ink/60 hover:text-ink">
          Home
        </Link>
      </header>

      <div className="mx-auto max-w-md my-auto py-16 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-terracotta/10 text-terracotta">
          <BookOpen size={22} strokeWidth={1.5} />
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">
          Page Not Found · 404
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink">A quiet detour.</h1>
        <p className="mt-2 text-sm text-ink/60 leading-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-7 flex justify-center gap-4">
          <Link
            href="/documents"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2.5 text-xs font-semibold text-paper hover:bg-forest/90"
            data-testid="link-notfound-documents"
          >
            Go to Documents
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/20 bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:bg-ink/5"
            data-testid="link-notfound-home"
          >
            <ArrowLeft size={13} /> Return Home
          </Link>
        </div>
      </div>

      <footer className="text-center font-mono-ui text-[9px] uppercase tracking-widest text-ink/35">
        UNFOLD · A quieter way to read
      </footer>
    </div>
  );
}
