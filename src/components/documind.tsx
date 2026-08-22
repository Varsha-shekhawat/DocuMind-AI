import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  Filter,
  FolderOpen,
  HelpCircle,
  Highlighter,
  History,
  KeyRound,
  Lightbulb,
  List,
  LoaderCircle,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createMockDocument, getDocument, mockDocuments, type DocumentRecord, type DocumentStatus } from '@/data/mock-data';
import { useAuth } from '@/lib/auth-context';
import { documentsApi, type ApiDocument } from '@/lib/api-client';

const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50';

export function UnfoldMark({ inverse = false, size = 18 }: { inverse?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 5 L12 3 L12 20 L4 18 Z" fill={inverse ? '#f3ead8' : '#293d2c'} />
      <path d="M12 3 L20 6.5 L20 22 L12 20 Z" fill={inverse ? '#d7b25c' : '#b75d3f'} />
      <path d="M12 3 L16.5 6.5 L12 9 Z" fill={inverse ? '#293d2c' : '#e6d7b4'} />
      <path d="M12 3 L12 20" stroke={inverse ? '#293d2c' : '#f8f2e4'} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" data-testid="link-logo">
      <span className={`relative grid h-7 w-7 place-items-center rounded-sm border ${inverse ? 'border-[#d8c59d]/40 bg-[#d8c59d]/15' : 'border-[#293d2c]/20 bg-[#e8ddc6]'}`} aria-hidden="true">
        <UnfoldMark inverse={inverse} size={16} />
      </span>
      <span className={`font-display text-[17px] font-semibold tracking-[-.02em] ${inverse ? 'text-[#f3ead8]' : 'text-ink'}`}>UNFOLD</span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const handleNavClick = (e: React.MouseEvent, anchorId: string) => {
    e.preventDefault();
    setOpen(false);
    if (location === '/' || location === '') {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#${anchorId}`);
        return;
      }
    }
    setLocation(`/#${anchorId}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 md:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 text-[12px] text-ink/70 md:flex" aria-label="Primary navigation">
          <a href="/#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} data-testid="link-how-it-works" className="cursor-pointer transition-colors hover:text-terracotta">How it works</a>
          <a href="/#features" onClick={(e) => handleNavClick(e, 'features')} data-testid="link-features" className="cursor-pointer transition-colors hover:text-terracotta">Features</a>
          <a href="/#pricing" onClick={(e) => handleNavClick(e, 'pricing')} data-testid="link-pricing" className="cursor-pointer transition-colors hover:text-terracotta">Pricing</a>
          <a href="/#about" onClick={(e) => handleNavClick(e, 'about')} data-testid="link-about" className="cursor-pointer transition-colors hover:text-terracotta">About us</a>
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="text-[12px] font-semibold text-ink/70 hover:text-ink" data-testid="link-log-in">Log in</Link>
          <Link href="/documents/new" className={`${buttonBase} bg-forest px-4 py-2.5 text-paper hover:bg-forest/90`} data-testid="link-get-started">Get started</Link>
        </div>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-md border border-ink/15 md:hidden" onClick={() => setOpen(!open)} aria-label="Open navigation" data-testid="button-open-menu">
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && (
        <div className="paper-texture border-t border-ink/10 bg-paper px-5 py-5 shadow-lg md:hidden">
          <nav className="grid gap-4 text-sm" aria-label="Mobile navigation">
            <Link href="/" onClick={() => setOpen(false)} className="text-ink/75 hover:text-terracotta" data-testid="mobile-link-home">Home</Link>
            <a href="/#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')} className="cursor-pointer text-ink/75 hover:text-terracotta" data-testid="mobile-link-how-it-works">How It Works</a>
            <a href="/#features" onClick={(e) => handleNavClick(e, 'features')} className="cursor-pointer text-ink/75 hover:text-terracotta" data-testid="mobile-link-features">Features</a>
            <a href="/#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="cursor-pointer text-ink/75 hover:text-terracotta" data-testid="mobile-link-pricing">Pricing</a>
            <a href="/#about" onClick={(e) => handleNavClick(e, 'about')} className="cursor-pointer text-ink/75 hover:text-terracotta" data-testid="mobile-link-about">About Us</a>
            <Link href="/documents" onClick={() => setOpen(false)} className="text-ink/75 hover:text-terracotta" data-testid="mobile-link-documents">Documents</Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="text-ink/75 hover:text-terracotta" data-testid="mobile-link-settings">Settings</Link>
            <div className="mt-2 flex gap-3 border-t border-ink/10 pt-4">
              <Link href="/login" onClick={() => setOpen(false)} className={`${buttonBase} flex-1 border border-ink/15 py-2.5 text-xs`} data-testid="mobile-link-login">Log in</Link>
              <Link href="/documents/new" onClick={() => setOpen(false)} className={`${buttonBase} flex-1 bg-forest py-2.5 text-xs text-paper`} data-testid="mobile-link-start">Get started</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function ArrowLink({ children, href = '#', light = false, onClick }: { children: ReactNode; href?: string; light?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  if (onClick) {
    return <a href={href} onClick={onClick} className={`group inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] cursor-pointer ${light ? 'text-paper/80 hover:text-paper' : 'text-terracotta hover:text-forest'}`} data-testid={`link-arrow-${String(children).toLowerCase().replaceAll(' ', '-')}`}>
      {children}<ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
    </a>;
  }

  return <Link href={href} className={`group inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] ${light ? 'text-paper/80 hover:text-paper' : 'text-terracotta hover:text-forest'}`} data-testid={`link-arrow-${String(children).toLowerCase().replaceAll(' ', '-')}`}>
    {children}<ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
  </Link>;
}

export function DocumentPaper({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative ${compact ? 'h-[205px] w-[180px]' : 'h-[390px] w-[335px] md:h-[430px] md:w-[370px]'} rotate-[-3deg] bg-[#f8f2e4] p-5 text-ink paper-shadow paper-fold`}>
      <div className="mb-3 flex items-start justify-between border-b border-ink/20 pb-2">
        <div>
          <p className="font-display text-[15px]">Research Paper.pdf</p>
          <p className="font-mono-ui mt-1 text-[8px] uppercase tracking-[.16em] text-ink/50">14 pages · 3,842 words</p>
        </div>
        <FileText size={17} strokeWidth={1.5} className="text-terracotta" />
      </div>
      <p className="mb-2 font-display text-[10px] italic text-ink/65">Abstract</p>
      <div className="doc-lines h-[115px] text-[8px] leading-[18px] text-ink/55">
        This paper explores the impact of machine learning techniques on productivity across knowledge work domains. The findings suggest a significant improvement in task automation and decision support, with implications for future workflows.
      </div>
      <div className="absolute left-[18%] top-[44%] h-4 w-[66%] rounded-sm bg-ochre/45" />
      <div className="absolute left-[18%] top-[57%] h-4 w-[48%] rounded-sm bg-ochre/45" />
      <div className="mt-5 border-t border-ink/15 pt-3">
        <p className="font-display text-[10px] italic text-ink/65">1. Introduction</p>
        <div className="doc-lines mt-2 h-[78px] text-[8px] leading-[18px] text-ink/55">As the tools around knowledge work change, it becomes important to understand the conditions under which assistance becomes meaningful.</div>
      </div>
      {!compact && <Highlighter className="absolute -bottom-4 -right-3 rotate-[18deg] text-terracotta" size={38} strokeWidth={1.4} />}
    </div>
  );
}

function Annotation({ children, tone, className = '' }: { children: ReactNode; tone: 'ochre' | 'sage' | 'terracotta'; className?: string }) {
  const tones = { ochre: 'bg-ochre/90', sage: 'bg-[#b8c0a5]', terracotta: 'bg-terracotta/90' };
  return <div className={`absolute z-10 px-3 py-2 text-[10px] font-semibold leading-tight text-ink shadow-sm ${tones[tone]} ${className}`}>{children}</div>;
}

export function LandingPage() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      }
    };

    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, [location]);

  const scrollToAnchor = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `/#${id}`);
    } else {
      setLocation(`/#${id}`);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-paper">
      <Navbar />
      <main>
        {/* HERO SECTION */}
        <section className="relative mx-auto grid min-h-[760px] max-w-[1320px] items-center gap-10 px-5 pb-20 pt-16 md:grid-cols-[1.04fr_.96fr] md:px-10 md:pt-20">
          <div className="absolute -left-20 top-[110px] hidden h-[330px] w-[250px] rotate-[12deg] bg-[#e4d5b4]/50 md:block" />
          <div className="reveal relative z-10 max-w-[620px]">
            <p className="mb-7 font-mono-ui text-[10px] font-medium uppercase tracking-[.2em] text-terracotta">Turn documents into understanding.</p>
            <h1 className="max-w-[590px] font-display text-[clamp(3.2rem,7vw,6.5rem)] leading-[.91] tracking-[-.055em] text-ink">Some documents deserve your attention. <em className="text-terracotta">Not all of your time.</em></h1>
            <p className="mt-8 max-w-[430px] text-[15px] leading-7 text-ink/65">UNFOLD turns long documents into clear summaries, key ideas and useful insights.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/documents/new" className={`${buttonBase} bg-forest px-5 py-3.5 text-paper hover:bg-forest/90`} data-testid="button-understand-document">Understand a document <ArrowUpRight size={15} /></Link>
              <ArrowLink href="/#how-it-works" onClick={(e) => scrollToAnchor(e, 'how-it-works')}>See how it works</ArrowLink>
            </div>
            <div className="mt-16 flex items-center gap-3">
              <div className="flex -space-x-2">
                {['ME', 'AR', 'JK', 'SO'].map((initials, index) => <span key={initials} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-paper text-[9px] font-semibold text-paper ${['bg-forest', 'bg-terracotta', 'bg-ochre text-ink', 'bg-[#7b8670]'][index]}`}>{initials}</span>)}
              </div>
              <p className="max-w-[210px] text-[10px] leading-4 text-ink/55">Trusted by researchers, students and professionals worldwide.</p>
            </div>
          </div>
          <div className="reveal reveal-2 relative flex min-h-[470px] items-center justify-center md:min-h-[560px]">
            <div className="absolute h-[370px] w-[370px] rounded-full bg-[#e6dbc2]/60 md:h-[480px] md:w-[480px]" />
            <div className="absolute bottom-[13%] right-[3%] h-[125px] w-[225px] rotate-[8deg] bg-forest/90 md:right-[4%] md:h-[165px] md:w-[290px]" />
            <DocumentPaper />
            <Annotation tone="ochre" className="right-[4%] top-[23%] rotate-[7deg] md:right-[3%]">important<br />finding</Annotation>
            <Annotation tone="sage" className="left-[5%] top-[44%] rotate-[-8deg]">key<br />argument</Annotation>
            <Annotation tone="terracotta" className="bottom-[17%] right-[13%] rotate-[-4deg] text-paper">main<br />insight</Annotation>
            <div className="absolute -bottom-3 left-[50%] flex -translate-x-1/2 gap-8 border-t border-ink/25 bg-paper/95 px-7 pt-4 md:gap-12">
              {[['14', 'pages'], ['3,842', 'words'], ['7', 'key ideas'], ['1', 'clear understanding']].map(([number, label]) => <div key={label} className="text-center"><p className="font-display text-xl text-ink">{number}</p><p className="mt-1 font-mono-ui text-[8px] uppercase tracking-[.12em] text-ink/50">{label}</p></div>)}
            </div>
          </div>
        </section>

        {/* 1. HOW IT WORKS SECTION */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-ink/15 bg-[#e7ddc8] md:scroll-mt-24">
          <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-10 md:py-28">
            <div className="mb-14 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">A quieter way to read</p>
                <h2 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.7rem)] leading-[.95] tracking-[-.05em]">From pages<br /><em>to perspective.</em></h2>
              </div>
              <div className="max-w-[320px] md:text-right">
                <p className="text-sm leading-6 text-ink/65">A little orientation changes how a whole document feels. Four deliberate steps from raw text to complete clarity.</p>
                <div className="mt-3">
                  <Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta hover:text-forest" data-testid="link-explore-how-it-works">
                    Explore full method <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'Upload & Parse', 'PDF, DOCX, or TXT', 'Drop in files up to 25MB. We extract typography, hierarchy, and structural context without losing meaning.'],
                ['02', 'Deep Structural Read', 'Beyond keywords', 'UNFOLD reads for thesis, methodology, evidence, and the logical architecture of the underlying argument.'],
                ['03', 'Multi-Level Synthesis', 'Adjustable lengths', 'Get structured summaries with length controls, key bullet takeaways, and categorized main idea threads.'],
                ['04', 'Actionable Insights', 'Ready to apply', 'Surface follow-up questions, recommendations, and clear perspectives to take your next read further.'],
              ].map(([number, title, subtitle, body], index) => (
                <div key={number} className={`reveal reveal-${index + 1} border-t border-ink/25 pt-5`}>
                  <div className="flex justify-between font-mono-ui text-[10px] text-terracotta">
                    <span>{number}</span>
                    <ArrowRight size={13} />
                  </div>
                  <h3 className="mt-6 font-display text-2xl text-ink">{title}</h3>
                  <p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">{subtitle}</p>
                  <p className="mt-4 text-xs leading-6 text-ink/65">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. FEATURES SECTION */}
        <section id="features" className="scroll-mt-20 mx-auto max-w-[1320px] px-5 py-24 md:scroll-mt-24 md:px-10 md:py-32">
          <div className="grid gap-16 md:grid-cols-[.85fr_1.15fr]">
            <div className="self-center">
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">Capabilities & Tools</p>
              <h2 className="mt-4 font-display text-[clamp(2.8rem,5vw,4.8rem)] leading-[.94] tracking-[-.05em]">Everything you need to <em>master long documents.</em></h2>
              <p className="mt-6 text-sm leading-7 text-ink/65">UNFOLD provides a tactile, calm reading environment equipped with tools to synthesize, organize, and retain knowledge without cognitive fatigue.</p>
              
              <div className="mt-8 space-y-4">
                {[
                  { title: 'AI Document Summarization', desc: 'Instant multi-level synthesis with adjustable Short, Medium, and Long controls.' },
                  { title: 'Key Point Extraction', desc: 'Detect pivotal claims, core findings, and empirical evidence in seconds.' },
                  { title: 'Main Idea Identification', desc: 'Conceptual threads categorized with dedicated titles and explanatory notes.' },
                  { title: 'Actionable Suggestions', desc: 'Thoughtful prompts and research questions to deepen your next inquiry.' },
                  { title: 'Organized Document Library', desc: 'User-scoped, filterable, and searchable personal knowledge archive.' },
                  { title: 'Interactive Document Preview', desc: 'Collapsible paper-like reading sheet with citation-level structural alignment.' },
                ].map((feat) => (
                  <div key={feat.title} className="border-b border-ink/10 pb-3">
                    <p className="font-display text-[15px] text-ink">{feat.title}</p>
                    <p className="mt-1 text-xs text-ink/55 leading-5">{feat.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link href="/documents/new" className={`${buttonBase} bg-forest px-4 py-2.5 text-xs text-paper hover:bg-forest/90`} data-testid="button-features-try">
                  Try with your document <ArrowRight size={14} />
                </Link>
                <ArrowLink href="/documents">View sample library</ArrowLink>
              </div>
            </div>

            <div className="relative min-h-[510px] border border-ink/15 bg-[#e8ddc6] p-5 md:p-9 self-center">
              <div className="absolute -right-5 -top-6 h-24 w-44 rotate-[-8deg] bg-[#d2bf94]/70" />
              <div className="relative grid gap-4 md:grid-cols-[.82fr_1.18fr]">
                <div className="paper-texture paper-shadow rotate-[-2deg] bg-[#fbf6eb] p-5">
                  <div className="mb-5 flex justify-between border-b border-ink/20 pb-3">
                    <span className="font-display text-sm">Research Paper.pdf</span>
                    <span className="font-mono-ui text-[8px] text-ink/50">1 / 14</span>
                  </div>
                  <p className="font-display text-[10px] italic text-ink/70">Abstract</p>
                  <div className="doc-lines mt-3 h-[290px] text-[8px] leading-[18px] text-ink/55">
                    This paper explores the impact of machine learning techniques on productivity across knowledge work domains. The findings suggest a significant improvement in task automation and decision support, with implications for future workflows.
                  </div>
                </div>
                <div className="paper-texture bg-[#fbf6eb] p-5 shadow-sm">
                  <div className="flex gap-4 border-b border-ink/15 pb-3 font-mono-ui text-[9px]">
                    <span className="border-b-2 border-terracotta pb-3 text-terracotta font-semibold">Summary</span>
                    <span className="text-ink/50">Key Points</span>
                    <span className="hidden sm:inline text-ink/50">Main Ideas</span>
                  </div>
                  <p className="mt-5 font-display text-lg">Structured Synthesis</p>
                  <p className="mt-2 text-[11px] leading-5 text-ink/65">
                    Artificial intelligence elevates productivity when transparency in reasoning is preserved.
                  </p>
                  <p className="mt-5 font-display text-xs">Summary length</p>
                  <div className="mt-2 flex gap-1">
                    {['Short', 'Medium', 'Long'].map((x, i) => (
                      <span key={x} className={`flex-1 border border-ink/15 px-2 py-1.5 text-center text-[9px] ${i === 1 ? 'bg-forest text-paper font-semibold' : 'bg-paper text-ink/60'}`}>{x}</span>
                    ))}
                  </div>
                  <div className="mt-6 space-y-2.5">
                    {['Productivity gains are deeply contextual.', 'The handoff between human judgment and models matters.', 'Trust emerges from legible evidence.'].map((x) => (
                      <div key={x} className="flex gap-2 border-t border-ink/10 pt-2.5 text-[10px] text-ink/65">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ABOUT US SECTION */}
        <section id="about" className="scroll-mt-20 bg-forest text-paper md:scroll-mt-24">
          <div className="mx-auto grid max-w-[1320px] gap-14 px-5 py-24 md:grid-cols-[1.1fr_.9fr] md:px-10 md:py-32">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#d7b25c]">Our Purpose</p>
              <h2 className="mt-5 max-w-[700px] font-display text-[clamp(2.8rem,5.5vw,6rem)] leading-[.89] tracking-[-.06em]">
                The space between reading <em className="text-[#d7b25c]">and knowing.</em>
              </h2>
              <p className="mt-7 max-w-[560px] text-sm leading-7 text-paper/75">
                UNFOLD is designed to help people understand long documents without spending unnecessary time manually extracting structure, claims, key ideas, and insights.
              </p>
            </div>
            <div className="flex flex-col justify-between">
              <div className="space-y-5 text-xs leading-6 text-paper/70">
                <p>
                  Modern knowledge work is overwhelmed by volume. We believe the future of reading isn't skimming faster, but understanding deeper with significantly less cognitive fatigue.
                </p>
                <p>
                  By transforming complex PDFs, academic papers, and technical reports into structured, digestible perspectives, UNFOLD frees your attention for what matters: thinking, synthesizing, and creating.
                </p>
              </div>
              <div className="mt-10">
                <Link href="/register" className={`${buttonBase} bg-[#d7b25c] px-6 py-3.5 text-forest hover:bg-[#e2c577]`} data-testid="button-create-account">
                  Create your account <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PRICING SECTION */}
        <section id="pricing" className="scroll-mt-20 mx-auto max-w-[1320px] px-5 py-24 md:scroll-mt-24 md:px-10 md:py-32">
          <div className="mb-14 text-center">
            <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">Simple, Transparent Pricing</p>
            <h2 className="mt-3 font-display text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[.94] tracking-[-.05em]">
              Invest in clarity.
            </h2>
            <p className="mt-4 mx-auto max-w-[480px] text-sm leading-6 text-ink/60">
              Start reading for free. Upgrade when your research volume and library needs expand.
            </p>
          </div>

          <div className="mx-auto grid max-w-[960px] gap-8 md:grid-cols-2">
            {/* Free Tier */}
            <div className="paper-texture border border-ink/15 bg-card p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl text-ink">Free</h3>
                  <span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-forest border border-forest/20 px-2 py-0.5 rounded-full">Preview</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-ink">$0</span>
                  <span className="font-mono-ui text-[10px] text-ink/45 uppercase tracking-[.1em]">/ month</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-ink/60">
                  Ideal for students, occasional readers, and exploratory research.
                </p>
                <div className="mt-7 space-y-3 border-t border-ink/10 pt-6 text-xs text-ink/75">
                  {[
                    'Up to 10 document uploads',
                    'PDF, DOCX, and TXT files (up to 25 MB)',
                    'Multi-level summaries with length controls',
                    'Key points and main ideas extraction',
                    'Personal reading room & document library',
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2.5">
                      <Check size={14} className="shrink-0 text-forest" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-4">
                <Link href="/documents/new" className={`${buttonBase} w-full border border-ink/20 bg-paper py-3 text-xs text-ink hover:border-ink/40`} data-testid="button-pricing-free">
                  Get started free
                </Link>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="paper-texture border-2 border-forest bg-card p-8 shadow-md relative flex flex-col justify-between">
              <span className="absolute -top-3 right-6 bg-forest text-paper font-mono-ui text-[9px] uppercase tracking-[.14em] px-3 py-0.5 rounded-full">
                Recommended
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl text-ink">Pro Reader</h3>
                  <span className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-terracotta border border-terracotta/20 px-2 py-0.5 rounded-full">Unlimited</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-ink">$12</span>
                  <span className="font-mono-ui text-[10px] text-ink/45 uppercase tracking-[.1em]">/ month</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-ink/60">
                  For researchers, analysts, and professionals with heavy reading loads.
                </p>
                <div className="mt-7 space-y-3 border-t border-ink/10 pt-6 text-xs text-ink/75">
                  {[
                    'Unlimited document uploads & storage',
                    'Priority AI processing queue',
                    'Full actionable recommendations & questions',
                    'Markdown & PDF synthesis export',
                    'Advanced search and tag filtering',
                    'Encrypted & private cloud workspace',
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2.5">
                      <Check size={14} className="shrink-0 text-forest" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-4">
                <Link href="/register" className={`${buttonBase} w-full bg-forest py-3 text-xs text-paper hover:bg-forest/90`} data-testid="button-pricing-pro">
                  Start reading with Pro
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center font-mono-ui text-[10px] uppercase tracking-[.14em] text-ink/45">
            No credit card required. Free to explore during preview.
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-ink/15 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 text-xs text-ink/50 md:flex-row md:items-center md:justify-between">
          <Logo />
          <span>© 2024 UNFOLD. A quieter way to understand.</span>
          <div className="flex flex-wrap items-center gap-5">
            <a href="/#how-it-works" onClick={(e) => scrollToAnchor(e, 'how-it-works')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-how-it-works">How It Works</a>
            <a href="/#features" onClick={(e) => scrollToAnchor(e, 'features')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-features">Features</a>
            <a href="/#pricing" onClick={(e) => scrollToAnchor(e, 'pricing')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-pricing">Pricing</a>
            <a href="/#about" onClick={(e) => scrollToAnchor(e, 'about')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-about">About</a>
            <Link href="/documents" className="hover:text-terracotta" data-testid="link-footer-documents">Documents</Link>
            <Link href="/login" className="hover:text-terracotta" data-testid="link-footer-login">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function HowItWorksPage() {
  const [, setLocation] = useLocation();

  const scrollToAnchor = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setLocation(`/#${id}`);
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-paper">
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-[1320px] px-5 pb-16 pt-24 md:px-10 md:pt-28">
          <div className="reveal max-w-[760px]">
            <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-terracotta" data-testid="link-how-it-works-back">
              <ArrowLeft size={14} /> Back to overview
            </Link>
            <p className="mb-4 font-mono-ui text-[10px] font-medium uppercase tracking-[.2em] text-terracotta">
              The UNFOLD Method
            </p>
            <h1 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[.92] tracking-[-.055em] text-ink">
              From unread pages to <em className="text-terracotta">quiet understanding.</em>
            </h1>
            <p className="mt-7 max-w-[560px] text-[15px] leading-7 text-ink/65">
              UNFOLD reads like a careful researcher: extracting structure, tracing core claims, and distilling insights so you can spend less time reading and more time thinking.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/documents/new" className={`${buttonBase} bg-forest px-5 py-3.5 text-paper hover:bg-forest/90`} data-testid="button-how-it-works-start">
                Try it with a document <ArrowUpRight size={15} />
              </Link>
              <Link href="/documents" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-ink/70 hover:text-forest" data-testid="link-how-it-works-browse">
                Browse sample library <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-ink/15 bg-[#e7ddc8]">
          <div className="mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-24">
            <div className="mb-14 max-w-[620px]">
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">Step-by-step</p>
              <h2 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] leading-[.95] tracking-[-.04em]">
                How we process every document.
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '01',
                  title: 'Upload & Parse',
                  body: 'Drop in PDFs, documents, or plain text. We parse typography, headers, and document hierarchy cleanly without losing structural context.',
                  icon: Upload,
                },
                {
                  step: '02',
                  title: 'Deep Structural Read',
                  body: 'Our models read for core thesis, methodology, evidence, and underlying arguments rather than simple keyword matches.',
                  icon: BookOpen,
                },
                {
                  step: '03',
                  title: 'Multi-Level Synthesis',
                  body: 'Generate structured summaries with adjustable length controls, extracted key bullet points, and categorized main ideas.',
                  icon: Sparkles,
                },
                {
                  step: '04',
                  title: 'Actionable Insights',
                  body: 'Surface recommendations, questions for further inquiry, and takeaways formatted ready for your research or workflow.',
                  icon: Lightbulb,
                },
              ].map(({ step, title, body, icon: StepIcon }, idx) => (
                <div key={step} className={`reveal reveal-${idx + 1} border-t border-ink/25 pt-5`}>
                  <div className="flex items-center justify-between font-mono-ui text-[10px] text-terracotta">
                    <span>{step}</span>
                    <StepIcon size={16} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-6 font-display text-2xl text-ink">{title}</h3>
                  <p className="mt-3 text-xs leading-6 text-ink/65">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">Designed for focus</p>
              <h2 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.2rem)] leading-[.94] tracking-[-.05em]">
                Built for deep work, not quick skims.
              </h2>
              <p className="mt-6 text-sm leading-7 text-ink/65">
                Most AI tools just spit out raw unstructured blocks of text. UNFOLD organizes information into a tactile reading room where summaries, key takeaways, and source previews coexist harmoniously.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Adjustable summary lengths (Short, Medium, Long)',
                  'Extracted key arguments with page citations',
                  'Calm, paper-like interface designed to reduce cognitive load',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-xs text-ink/75">
                    <CheckCircle2 size={16} className="shrink-0 text-forest" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative border border-ink/15 bg-[#e8ddc6] p-6 md:p-8">
              <div className="paper-texture bg-[#fbf6eb] p-6 paper-shadow">
                <div className="mb-4 flex items-center justify-between border-b border-ink/15 pb-3">
                  <span className="font-display text-sm">Sample Document Synthesis</span>
                  <span className="font-mono-ui text-[9px] text-terracotta">Complete</span>
                </div>
                <p className="font-display text-lg">Machine Learning & Human Agency</p>
                <p className="mt-2 text-xs leading-5 text-ink/65">
                  Knowledge work flourishes when automated assistance preserves user judgment and transparency in reasoning.
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="bg-forest px-2.5 py-1 text-[10px] font-semibold text-paper">Summary</span>
                  <span className="border border-ink/15 bg-paper px-2.5 py-1 text-[10px] text-ink/60">Key Points</span>
                  <span className="border border-ink/15 bg-paper px-2.5 py-1 text-[10px] text-ink/60">Main Ideas</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-forest text-paper">
          <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center md:px-10 md:py-24">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#d7b25c]">Get started now</p>
              <h2 className="mt-3 font-display text-3xl md:text-4xl">Bring your first document to life.</h2>
            </div>
            <Link href="/documents/new" className={`${buttonBase} bg-[#d7b25c] px-6 py-3.5 text-forest hover:bg-[#e2c577]`} data-testid="button-how-it-works-cta">
              Upload document <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-ink/15 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 text-xs text-ink/50 md:flex-row md:items-center md:justify-between">
          <Logo />
          <span>© 2024 UNFOLD. A quieter way to understand.</span>
          <div className="flex flex-wrap items-center gap-5">
            <a href="/#how-it-works" onClick={(e) => scrollToAnchor(e, 'how-it-works')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-how-it-works">How It Works</a>
            <a href="/#features" onClick={(e) => scrollToAnchor(e, 'features')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-features">Features</a>
            <a href="/#pricing" onClick={(e) => scrollToAnchor(e, 'pricing')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-pricing">Pricing</a>
            <a href="/#about" onClick={(e) => scrollToAnchor(e, 'about')} className="cursor-pointer hover:text-terracotta" data-testid="link-footer-about">About</a>
            <Link href="/documents" className="hover:text-terracotta" data-testid="link-footer-documents">Documents</Link>
            <Link href="/login" className="hover:text-terracotta" data-testid="link-footer-login">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

type NavItem = { label: string; href: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'New document', href: '/documents/new', icon: Plus },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav({ onClose }: { onClose: () => void }) {
  const mobileItems: NavItem[] = [
    { label: 'Home', href: '/', icon: BookOpen },
    { label: 'How It Works', href: '/#how-it-works', icon: CircleHelp },
    { label: 'Documents', href: '/documents', icon: FolderOpen },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];
  return <div className="fixed inset-0 z-50 bg-ink/20 md:hidden" onClick={onClose}><aside className="h-full w-[280px] bg-sidebar p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><Logo /><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-ink/15" aria-label="Close navigation" data-testid="button-close-mobile-nav"><X size={17} /></button></div><div className="mt-10 space-y-1">{mobileItems.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-ink/70 hover:bg-ink/5" data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={1.7} />{label}</Link>)}</div></aside></div>;
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const handleLogout = async () => {
    try {
      await logout();
    } catch (_err) {
      // Ignored: route back to home
    }
    setLocation('/');
  };
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME';
  const displayName = user?.name ?? 'Mara Ellison';
  const displayEmail = user?.email ?? 'mara@example.com';

  return <aside className={`hidden shrink-0 flex-col border-r border-ink/15 bg-sidebar transition-[width] duration-300 md:flex ${collapsed ? 'w-[78px]' : 'w-[230px]'}`}>
    <div className={`flex h-[76px] items-center border-b border-ink/10 ${collapsed ? 'justify-center' : 'px-5'}`}>{collapsed ? <Link href="/" className="grid h-7 w-7 place-items-center rounded-sm border border-[#293d2c]/20 bg-[#e8ddc6]" data-testid="link-collapsed-logo"><UnfoldMark size={16} /></Link> : <Logo />}</div>
    <nav className="flex-1 space-y-1 p-3" aria-label="Document navigation">{navItems.map(({ label, href, icon: Icon }) => { const active = location === href || (href === '/documents' && location.startsWith('/documents/') && !location.includes('/new')); return <Link key={href} href={href} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-md px-3 py-3 text-[12px] font-semibold transition-colors ${active ? 'bg-forest text-paper' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'} ${collapsed ? 'justify-center px-0' : ''}`} data-testid={`nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={1.7} /><span className={collapsed ? 'hidden' : ''}>{label}</span></Link>; })}</nav>
     <div className={`border-t border-ink/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}><button type="button" onClick={handleLogout} className={`flex items-center gap-3 rounded-md px-3 py-3 text-[12px] text-ink/55 hover:bg-ink/5 ${collapsed ? 'px-2' : ''}`} title="Log out" data-testid="button-log-out"><LogOut size={16} /><span className={collapsed ? 'hidden' : ''}>Log out</span></button>{!collapsed && <div className="mt-4 flex items-center gap-2 px-2 pb-1"><div className="grid h-7 w-7 place-items-center rounded-full bg-terracotta text-[9px] font-bold text-paper">{initials}</div><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{displayName}</p><p className="truncate text-[9px] text-ink/45">{displayEmail}</p></div></div>}</div>
  </aside>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="flex min-h-[100dvh] bg-paper"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /><div className="min-w-0 flex-1"><header className="flex h-[76px] items-center justify-between border-b border-ink/15 bg-paper/80 px-5 backdrop-blur-sm md:px-9"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-ink/15 md:hidden" aria-label="Open menu" data-testid="button-open-app-menu"><Menu size={17} /></button><button type="button" onClick={() => setCollapsed(!collapsed)} className="hidden h-9 w-9 place-items-center rounded-md border border-ink/15 text-ink/60 hover:bg-ink/5 md:grid" aria-label="Toggle sidebar" data-testid="button-toggle-sidebar">{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button><span className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-ink/40">Your library of knowledge</span></div><div className="flex items-center gap-2"><Link href="/documents/new" className={`${buttonBase} bg-forest px-3.5 py-2.5 text-[11px] text-paper hover:bg-forest/90`} data-testid="button-header-new-document"><Plus size={14} /> <span className="hidden sm:inline">New document</span></Link><Link href="/settings" className="grid h-9 w-9 place-items-center rounded-md text-ink/55 hover:bg-ink/5" aria-label="Settings" data-testid="link-header-settings"><Settings size={17} /></Link></div></header><div className="p-5 md:p-9">{children}</div></div>{mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}</div>;
}

function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="mb-9 flex flex-col gap-5 border-b border-ink/15 pb-7 md:flex-row md:items-end md:justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">{eyebrow}</p><h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4.6rem)] leading-[.92] tracking-[-.05em]">{title}</h1></div>{children}</div>;
}

export function DocumentCard({
  document,
  onDelete,
}: {
  document: ApiDocument | DocumentRecord;
  onDelete?: (id: string, name: string) => void;
}) {
  const accent = { ochre: 'bg-ochre', terracotta: 'bg-terracotta', sage: 'bg-[#aeb99c]', bluegreen: 'bg-[#839f94]', plum: 'bg-[#9c8f91]' }[document.accent] ?? 'bg-ochre';
  const formattedDate = (document as ApiDocument).createdAt
    ? new Date((document as ApiDocument).createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : (document as DocumentRecord).date || 'Recently added';

  return <div className="group flex items-center justify-between border-b border-ink/15 py-4 transition-colors hover:bg-ink/[.025]" data-testid={`card-document-${document.id}`}>
    <Link href={`/documents/${document.id}`} className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-4">
      <div className={`grid h-11 w-10 place-items-center ${accent} text-paper`}><FileText size={18} strokeWidth={1.5} /></div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-[17px] group-hover:text-terracotta">{document.name}</p>
          <span className="rounded-full border border-forest/20 px-2 py-0.5 font-mono-ui text-[8px] uppercase tracking-[.08em] text-forest">{document.status}</span>
        </div>
        <p className="mt-1 truncate text-[11px] text-ink/50">{document.pages || 1} pages · {document.words || '—'} words <span className="mx-1.5 text-ink/25">·</span> {document.description}</p>
      </div>
    </Link>
    <div className="flex items-center gap-4 pl-4 text-right">
      <p className="hidden font-mono-ui text-[10px] text-ink/45 sm:block">{formattedDate}</p>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(document.id, document.name);
          }}
          className="grid h-8 w-8 place-items-center rounded text-ink/30 opacity-0 transition-opacity hover:bg-terracotta/10 hover:text-terracotta group-hover:opacity-100"
          title="Delete document"
          data-testid={`button-delete-document-${document.id}`}
        >
          <Trash2 size={15} />
        </button>
      )}
      <Link href={`/documents/${document.id}`} className="hidden sm:inline-block">
        <ArrowRight size={16} className="text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-terracotta" />
      </Link>
    </div>
  </div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="paper-texture flex min-h-[300px] flex-col items-center justify-center border border-dashed border-ink/20 bg-card px-6 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-ochre/45 text-forest"><BookOpen size={21} strokeWidth={1.5} /></div><h2 className="font-display text-2xl">{title}</h2><p className="mt-2 max-w-[320px] text-sm leading-6 text-ink/55">{body}</p>{action && <div className="mt-6">{action}</div>}</div>;
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <div className="border border-terracotta/30 bg-terracotta/5 p-8 text-center"><CircleHelp className="mx-auto text-terracotta" size={24} /><h2 className="mt-3 font-display text-2xl">Something interrupted the reading.</h2><p className="mt-2 text-sm text-ink/55">The document is still safe. Try opening it again.</p>{onRetry && <button type="button" onClick={onRetry} className={`${buttonBase} mt-5 border border-terracotta/35 px-4 py-2.5 text-terracotta`} data-testid="button-retry">Try again</button>}</div>;
}

export function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | DocumentStatus>('All');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const documents = data?.documents || [];

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesQuery = `${doc.name} ${doc.description || ''}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'All' || doc.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [documents, query, filter]);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return <AppShell><PageIntro eyebrow="Documents" title="Your library."><div className="flex flex-wrap items-center gap-4"><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-terracotta" data-testid="link-back-home"><ArrowLeft size={15} /> Back to home</Link><Link href="/documents/new" className={`${buttonBase} bg-forest px-4 py-3 text-paper hover:bg-forest/90`} data-testid="button-new-document"><Plus size={15} /> New document</Link></div></PageIntro><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block max-w-[360px] flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." className="h-10 w-full border border-ink/15 bg-card pl-9 pr-3 text-sm outline-none placeholder:text-ink/35 focus:border-terracotta" data-testid="input-search-documents" /></label><div className="relative"><button type="button" onClick={() => setFilterOpen(!filterOpen)} className={`${buttonBase} w-full justify-between border border-ink/15 bg-card px-3 py-2.5 text-xs sm:w-[150px]`} data-testid="button-filter-documents"><Filter size={14} /> {filter} <ChevronDown size={13} /></button>{filterOpen && <div className="absolute right-0 z-20 mt-2 w-[170px] border border-ink/15 bg-card p-1 shadow-lg">{(['All', 'Ready', 'Processing', 'Needs attention'] as const).map((value) => <button type="button" key={value} onClick={() => { setFilter(value); setFilterOpen(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-ink/5" data-testid={`filter-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</button>)}</div>}</div></div><div className="border-t border-ink/15">{isLoading ? (<div className="py-20 text-center text-sm text-ink/55"><LoaderCircle size={24} className="mx-auto mb-3 animate-spin text-terracotta" />Opening your library...</div>) : isError ? (<ErrorState onRetry={() => refetch()} />) : filtered.length ? (filtered.map((doc) => <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />)) : (<EmptyState title="No documents found" body={query ? "No documents match your search criteria." : "Bring in a document that deserves your attention."} action={<Link href="/documents/new" className={`${buttonBase} bg-forest px-4 py-2.5 text-paper`} data-testid="button-empty-upload">Upload document</Link>} />)}</div></AppShell>;
}

export function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onFile(file); };
  return <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) onFile(file); }} onClick={() => inputRef.current?.click()} className="group cursor-pointer border border-dashed border-ink/25 bg-[#e9dec6]/45 px-6 py-14 text-center transition-colors hover:border-terracotta hover:bg-[#e9dec6]/75" data-testid="upload-zone"><input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleChange} className="hidden" data-testid="input-upload-file" /><div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-ink/15 bg-paper text-terracotta transition-transform group-hover:-translate-y-1"><Upload size={21} strokeWidth={1.5} /></div><h2 className="mt-5 font-display text-2xl">Drop your document here</h2><p className="mt-2 text-sm text-ink/55">or click to browse from your computer</p><p className="mt-5 font-mono-ui text-[9px] uppercase tracking-[.13em] text-ink/40">PDF, DOCX, or TXT · up to 25 MB</p></div>;
}

export function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  return <div className="flex items-center justify-between border border-ink/15 bg-card p-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-9 shrink-0 place-items-center bg-terracotta text-paper"><FileText size={17} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.1em] text-ink/45">{(file.size / 1024 / 1024).toFixed(2)} MB · ready to read</p></div></div><button type="button" onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-md text-ink/45 hover:bg-ink/5 hover:text-terracotta" aria-label="Remove file" data-testid="button-remove-file"><X size={16} /></button></div>;
}

export function NewDocumentPage() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a document file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await documentsApi.upload(file, title);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setLocation(`/documents/${res.document.id}/processing`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload document. Please try again.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return <AppShell><PageIntro eyebrow="New document" title="Make room for a thought."><Link href="/documents" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-terracotta" data-testid="link-cancel-upload"><ArrowLeft size={15} /> Cancel</Link></PageIntro><div className="mx-auto grid max-w-[1000px] gap-9 lg:grid-cols-[1.3fr_.7fr]"><div>{error && <div className="mb-5 rounded border border-terracotta/30 bg-terracotta/10 p-3 text-xs leading-5 text-terracotta" data-testid="upload-error">{error}</div>}<UploadZone onFile={(nextFile) => { setFile(nextFile); setError(null); if (!title) setTitle(nextFile.name.replace(/\.[^/.]+$/, '')); }} />{file && <div className="mt-4"><FilePreview file={file} onRemove={() => { setFile(null); setError(null); }} /></div>}<div className="mt-7"><label className="font-mono-ui text-[10px] uppercase tracking-[.14em] text-ink/55" htmlFor="document-title">Document name</label><input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this document a name" className="mt-2 h-12 w-full border border-ink/15 bg-card px-4 text-sm outline-none placeholder:text-ink/35 focus:border-terracotta" data-testid="input-document-title" /></div><button type="button" disabled={!file || uploading} onClick={handleUpload} className={`${buttonBase} mt-6 w-full bg-forest px-5 py-3.5 text-paper hover:bg-forest/90`} data-testid="button-upload-document">{uploading ? (<><LoaderCircle size={15} className="animate-spin" /> Saving document...</>) : (<><Sparkles size={15} /> Begin understanding</>)}</button></div><aside className="border-t border-ink/15 pt-7 lg:border-l lg:border-t-0 lg:pl-8"><p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-terracotta">What happens next</p><div className="mt-6 space-y-6">{[['01', 'We read the whole thing', 'Structure, claims, evidence, and the questions underneath.'], ['02', 'We find the signal', 'Key points and main ideas, kept in the language of the document.'], ['03', 'You decide what matters', 'Suggestions to help your next read go further.']].map(([number, heading, body]) => <div key={number} className="flex gap-4"><span className="font-mono-ui text-[10px] text-terracotta">{number}</span><div><p className="font-display text-lg">{heading}</p><p className="mt-1 text-xs leading-5 text-ink/55">{body}</p></div></div>)}</div><div className="mt-12 border-t border-ink/15 pt-5"><p className="text-xs leading-5 text-ink/50">Your documents stay private to your library. Stored securely on your UNFOLD workspace.</p></div></aside></div></AppShell>;
}

export function ProcessingTimeline({ status }: { status: DocumentStatus }) {
  const steps = ['Document received', 'Reading the document', 'Finding the important parts', 'Creating the summary', 'Preparing insights'];
  const failed = status === 'Needs attention';
  const complete = status === 'Ready';
  return <div className="space-y-0">{steps.map((step, index) => {
    const done = complete || (!failed && false); // real progress is opaque server-side; we only know Processing vs Ready vs Needs attention
    const current = !complete && !failed && index === 1;
    const errored = failed && index === 1;
    return <div key={step} className="flex gap-4"><div className="flex flex-col items-center"><div className={`grid h-7 w-7 place-items-center rounded-full border ${done ? 'border-forest bg-forest text-paper' : errored ? 'border-terracotta bg-terracotta text-paper' : current ? 'border-terracotta bg-terracotta text-paper' : 'border-ink/20 bg-paper text-ink/25'}`}>{done ? <Check size={14} /> : errored ? <X size={14} /> : current ? <LoaderCircle size={14} className="animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</div>{index !== steps.length - 1 && <div className={`h-10 w-px ${done ? 'bg-forest/40' : 'bg-ink/15'}`} />}</div><div className="pb-7 pt-1"><p className={`text-sm ${done || current || errored ? 'font-semibold text-ink' : 'text-ink/35'}`}>{step}</p>{current && <p className="mt-1 text-xs text-ink/50">Stored securely in your reading room...</p>}{errored && <p className="mt-1 text-xs text-terracotta">Something went wrong here — see below.</p>}</div></div>;
  })}</div>;
}

export function ProcessingPage({ id }: { id?: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getById(id!),
    enabled: !!id,
    // Poll while the document is still being processed; stop once it
    // reaches a terminal state (Ready or Needs attention).
    refetchInterval: (query) => (query.state.data?.document.status === 'Processing' ? 2000 : false),
  });
  const document = data?.document;

  const retryMutation = useMutation({
    mutationFn: () => documentsApi.retry(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  if (isLoading) {
    return <AppShell><div className="py-20 text-center text-sm text-ink/55"><LoaderCircle size={24} className="mx-auto mb-3 animate-spin text-terracotta" />Opening reading room...</div></AppShell>;
  }

  if (isError || !document) {
    return <AppShell><ErrorState /></AppShell>;
  }

  const needsAttention = document.status === 'Needs attention';
  const ready = document.status === 'Ready';

  return <AppShell><div className="mx-auto grid max-w-[940px] gap-12 py-6 md:grid-cols-[1fr_.8fr] md:py-12"><div><Link href="/documents" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/50 hover:text-terracotta" data-testid="link-processing-back"><ArrowLeft size={15} /> Back to documents</Link><p className="mt-14 font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">Document Library Room</p><h1 className="mt-4 font-display text-[clamp(3rem,6vw,5.4rem)] leading-[.9] tracking-[-.05em]">{needsAttention ? <>Something needs<br /><em>your attention.</em></> : <>A little patience<br /><em>for a lot less reading.</em></>}</h1><p className="mt-7 max-w-[390px] text-sm leading-6 text-ink/60"><strong className="text-ink">{document.name}</strong> {needsAttention ? 'ran into a problem while processing.' : 'is safely stored in your reading room.'}</p>{needsAttention && document.processingError && <div className="mt-5 max-w-[390px] rounded border border-terracotta/30 bg-terracotta/10 p-3 text-xs leading-5 text-terracotta" data-testid="processing-error-message">{document.processingError}</div>}<div className="mt-8 flex items-center gap-4">{ready && <Link href={`/documents/${document.id}`} className={`${buttonBase} bg-forest px-5 py-3 text-paper hover:bg-forest/90`} data-testid="button-open-document-workspace">Open Document Workspace <ArrowRight size={14} /></Link>}{needsAttention && <button type="button" onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending} className={`${buttonBase} bg-forest px-5 py-3 text-paper hover:bg-forest/90`} data-testid="button-retry-processing">{retryMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} Try again</button>}</div></div><div className="paper-texture border border-ink/15 bg-card p-6 md:p-8"><div className="mb-8 flex items-center gap-3 border-b border-ink/15 pb-5"><div className="grid h-10 w-9 place-items-center bg-terracotta text-paper"><FileText size={17} /></div><div><p className="font-display text-lg">{document.name}</p><p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.12em] text-ink/45">Reading room · {document.status}</p></div></div><ProcessingTimeline status={document.status} /></div></div></AppShell>;
}

export function DocumentPreview({ document, collapsed, onToggle }: { document: ApiDocument | DocumentRecord; collapsed: boolean; onToggle: () => void }) {
  const fileSizeText = 'fileSize' in document && document.fileSize
    ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB`
    : 'Indexed';

  return <section className={`paper-texture relative overflow-hidden border border-ink/15 bg-card transition-all duration-300 ${collapsed ? 'h-[72px]' : 'min-h-[620px]'}`}><div className="flex items-center justify-between border-b border-ink/15 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><FileText size={15} className="text-terracotta" /><p className="truncate text-xs font-semibold">{document.name}</p></div><div className="flex items-center gap-1"><span className="hidden font-mono-ui text-[9px] text-ink/40 sm:inline">1 / {document.pages || 1}</span><button type="button" onClick={onToggle} className="grid h-8 w-8 place-items-center text-ink/50 hover:bg-ink/5" aria-label={collapsed ? 'Expand preview' : 'Collapse preview'} data-testid="button-toggle-preview">{collapsed ? <ChevronDown size={16} /> : <PanelLeftClose size={16} />}</button></div></div>{!collapsed && <div className="flex justify-center p-8"><div className="relative min-h-[500px] w-full max-w-[380px] rotate-[-1deg] bg-[#fcf7ed] p-8 paper-shadow"><div className="mb-6 border-b border-ink/15 pb-3"><p className="font-display text-xl">{document.name.replace(/\.[^/.]+$/, '')}</p><p className="mt-1 font-mono-ui text-[8px] uppercase tracking-[.14em] text-ink/45">Stored Document</p></div><p className="font-display text-[11px] italic">Document Overview</p><div className="doc-lines mt-3 h-[95px] text-[8px] leading-[18px] text-ink/55">{document.description || 'Document stored securely in your UNFOLD library.'}</div><div className="mt-7 border-t border-ink/15 pt-4"><p className="font-display text-[11px]">Reading Status</p><div className="doc-lines mt-3 h-[185px] text-[8px] leading-[18px] text-ink/55">Status: {document.status}. File size: {fileSizeText}. Awaiting full automated extraction and summarization in the next milestone.</div></div><span className="absolute left-[15%] top-[31%] h-4 w-[65%] bg-ochre/50" /><span className="absolute left-[15%] top-[55%] h-4 w-[52%] bg-ochre/50" /><span className="absolute bottom-7 right-8 font-mono-ui text-[8px] text-ink/35">01</span></div></div>}</section>;
}

export function SummaryLengthControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="flex gap-1">{['Short', 'Medium', 'Long'].map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={`flex-1 border px-3 py-2 text-xs transition-colors ${value === item ? 'border-forest bg-forest text-paper' : 'border-ink/15 bg-paper text-ink/60 hover:border-forest/40'}`} data-testid={`button-summary-length-${item.toLowerCase()}`}>{item}</button>)}</div>;
}

export function SummaryTabs({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  return <div className="flex min-w-max gap-6 border-b border-ink/15 px-1" role="tablist">{['Summary', 'Key Points', 'Main Ideas', 'Suggestions'].map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={`relative pb-3 font-mono-ui text-[10px] uppercase tracking-[.06em] ${active === item ? 'text-terracotta after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-terracotta' : 'text-ink/45 hover:text-ink'}`} role="tab" aria-selected={active === item} data-testid={`tab-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}</div>;
}

export function KeyPoints({ points }: { points: string[] }) {
  return <div className="space-y-0">{points.map((point, index) => <div key={point} className="flex gap-4 border-b border-ink/10 py-4"><span className="font-mono-ui text-[10px] text-terracotta">{String(index + 1).padStart(2, '0')}</span><p className="text-sm leading-6 text-ink/75">{point}</p></div>)}</div>;
}

export function MainIdeas({ ideas }: { ideas: { title: string; body: string }[] }) {
  return <div className="space-y-5">{ideas.map((idea, index) => <div key={idea.title} className="border-l-2 border-ochre pl-4"><div className="flex items-center gap-3"><span className="font-mono-ui text-[9px] text-terracotta">0{index + 1}</span><h3 className="font-display text-xl">{idea.title}</h3></div><p className="mt-2 text-sm leading-6 text-ink/60">{idea.body}</p></div>)}</div>;
}

export function Suggestions({ suggestions }: { suggestions: string[] }) {
  return <div className="space-y-3">{suggestions.map((suggestion) => <div key={suggestion} className="flex gap-3 border border-ink/10 bg-[#ede4d1]/60 p-4"><Lightbulb size={16} className="mt-0.5 shrink-0 text-terracotta" strokeWidth={1.5} /><p className="text-sm leading-6 text-ink/70">{suggestion}</p></div>)}</div>;
}

export function ResultsWorkspace({ document }: { document: ApiDocument | DocumentRecord }) {
  const [active, setActive] = useState('Summary');
  const [length, setLength] = useState('Medium');
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const copySummary = () => {
    if (document.summary) {
      navigator.clipboard.writeText(document.summary);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const hasSummary = !!document.summary && document.summary !== 'Document uploaded and awaiting reading.' && document.summary !== 'Document uploaded and ready for processing.';
  const hasKeyPoints = document.keyPoints && document.keyPoints.length > 0;
  const hasMainIdeas = document.mainIdeas && document.mainIdeas.length > 0;
  const hasSuggestions = document.suggestions && document.suggestions.length > 0;

  return <div className="grid gap-6 xl:grid-cols-[minmax(300px,.8fr)_minmax(500px,1.2fr)]"><DocumentPreview document={document} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /><section className="min-w-0 border border-ink/15 bg-card p-5 md:p-8"><div className="mb-7 flex items-start justify-between gap-4"><div><p className="font-mono-ui text-[9px] uppercase tracking-[.15em] text-terracotta">Understanding</p><h2 className="mt-2 font-display text-3xl">{document.name.replace(/\.[^/.]+$/, '')}</h2></div><div className="flex gap-1"><button type="button" onClick={copySummary} className="grid h-9 w-9 place-items-center rounded-md border border-ink/15 text-ink/50 hover:bg-ink/5" aria-label="Copy summary" data-testid="button-copy-summary">{copied ? <Check size={15} className="text-forest" /> : <Copy size={15} />}</button><button type="button" onClick={() => window.print()} className="grid h-9 w-9 place-items-center rounded-md border border-ink/15 text-ink/50 hover:bg-ink/5" aria-label="Download document" data-testid="button-download-results"><ArrowDownToLine size={15} /></button><button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-ink/15 text-ink/50 hover:bg-ink/5" aria-label="Share document" data-testid="button-share-results"><Share2 size={15} /></button></div></div><div className="overflow-x-auto"><SummaryTabs active={active} onChange={setActive} /></div><div className="pt-7">{active === 'Summary' && <div><div className="mb-7 flex items-center justify-between gap-4"><p className="font-display text-xl">Summary</p><div className="flex items-center gap-3"><span className="hidden font-mono-ui text-[9px] uppercase text-ink/40 sm:inline">Summary length</span><div className="w-[180px]"><SummaryLengthControl value={length} onChange={setLength} /></div></div></div>{hasSummary ? (<p className="max-w-[660px] text-[15px] leading-8 text-ink/70">{document.summary}</p>) : (<div className="rounded border border-dashed border-ink/20 bg-paper/60 p-6 text-sm leading-6 text-ink/60"><p className="font-semibold text-ink">Document stored in your UNFOLD library.</p><p className="mt-1">Full AI summaries, claim extraction, and key takeaways will unfold in the upcoming AI processing milestone.</p></div>)}<div className="mt-10 grid gap-3 border-t border-ink/10 pt-6 sm:grid-cols-3">{[[String(document.pages || 1), 'pages stored'], [String(document.words || '—'), 'words indexed'], [document.status, 'status']].map(([number, label]) => <div key={label}><p className="font-display text-2xl">{number}</p><p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.1em] text-ink/45">{label}</p></div>)}</div></div>}{active === 'Key Points' && <div><p className="mb-6 font-display text-xl">Key points</p>{hasKeyPoints ? <KeyPoints points={document.keyPoints} /> : <p className="text-sm text-ink/50">Key points extraction will be generated during the AI analysis milestone.</p>}</div>}{active === 'Main Ideas' && <div><p className="mb-6 font-display text-xl">Main ideas</p>{hasMainIdeas ? <MainIdeas ideas={document.mainIdeas} /> : <p className="text-sm text-ink/50">Main ideas will be structured during the AI analysis milestone.</p>}</div>}{active === 'Suggestions' && <div><p className="mb-6 font-display text-xl">Suggestions for a closer read</p>{hasSuggestions ? <Suggestions suggestions={document.suggestions} /> : <p className="text-sm text-ink/50">Follow-up suggestions will appear once the document is analyzed.</p>}</div>}</div></section></div>;
}

export function ResultsPage({ id }: { id?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getById(id!),
    enabled: !!id,
  });
  const document = data?.document;

  if (isLoading) {
    return <AppShell><div className="py-20 text-center text-sm text-ink/55"><LoaderCircle size={24} className="mx-auto mb-3 animate-spin text-terracotta" />Opening document workspace...</div></AppShell>;
  }

  if (isError || !document) {
    return <AppShell><ErrorState /></AppShell>;
  }

  return <AppShell><div className="mb-8 flex items-center justify-between"><Link href="/documents" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-terracotta" data-testid="link-results-back"><ArrowLeft size={15} /> Back to documents</Link><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-forest"><CheckCircle2 size={13} className="mr-1 inline" /> {document.status}</span></div><ResultsWorkspace document={document} /></AppShell>;
}

export function AuthLayout({ children, caption }: { children: ReactNode; caption: string }) {
  return <div className="min-h-[100dvh] bg-paper"><div className="flex min-h-[100dvh] flex-col lg:grid lg:grid-cols-[.92fr_1.08fr]"><div className="paper-texture relative hidden overflow-hidden bg-forest p-10 text-paper lg:block"><Logo inverse /><div className="absolute -bottom-20 -left-10 h-[420px] w-[420px] rounded-full border border-[#d7b25c]/30" /><div className="absolute bottom-20 left-16 h-[230px] w-[230px] rounded-full border border-[#d7b25c]/20" /><div className="absolute bottom-24 left-24 h-[180px] w-[140px] rotate-[-10deg] bg-[#e7d9b8]/90 p-5 text-ink paper-shadow"><p className="font-display text-lg">A note to self</p><div className="doc-lines mt-4 h-[120px] text-[8px] leading-[18px] text-ink/60">Make space for the ideas that take a little longer to arrive.</div></div><div className="absolute bottom-16 right-16 max-w-[190px]"><p className="font-display text-4xl leading-[.95]">Understand what deserves your attention.</p><p className="mt-5 text-xs leading-5 text-paper/60">{caption}</p></div></div><div className="flex flex-1 flex-col px-5 py-7 sm:px-10 lg:px-20 lg:py-10"><div className="lg:hidden"><Logo /></div><div className="my-auto w-full max-w-[420px] self-center py-12">{children}</div><p className="text-center font-mono-ui text-[9px] uppercase tracking-[.12em] text-ink/35">UNFOLD · A quieter way to read</p></div></div></div>;
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
      setLocation(redirectTarget || '/documents');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const redirectTarget = params.get('from');

  return <AuthLayout caption={mode === 'login' ? 'Your library of knowledge, waiting where you left it.' : 'A place for your documents, your questions, and the thinking that follows.'}><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">{mode === 'login' ? 'Welcome back' : 'Begin a clearer way of working'}</p><h1 className="mt-4 font-display text-5xl leading-[.9] tracking-[-.05em]">{mode === 'login' ? 'Make sense of something.' : 'Create your reading room.'}</h1><p className="mt-5 text-sm leading-6 text-ink/55">{mode === 'login' ? 'Pick up where you left off.' : 'Make long documents easier to carry.'}</p>{error && <div className="mt-6 rounded border border-terracotta/40 bg-terracotta/10 p-3 text-xs leading-5 text-terracotta" data-testid="auth-error-message">{error}</div>}<form onSubmit={submit} className="mt-7 space-y-4">{mode === 'register' && <label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">Name</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="mt-2 h-11 w-full border border-ink/15 bg-card px-3 text-sm outline-none focus:border-terracotta" placeholder="Your name" data-testid="input-name" /></label>}<label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full border border-ink/15 bg-card px-3 text-sm outline-none focus:border-terracotta" placeholder="you@example.com" data-testid="input-email" /></label><label className="block"><div className="flex justify-between"><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">Password</span>{mode === 'login' && <Link href="/forgot-password" className="text-[10px] text-terracotta hover:underline" data-testid="link-forgot-password">Forgot password?</Link>}</div><input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full border border-ink/15 bg-card px-3 text-sm outline-none focus:border-terracotta" placeholder="At least 8 characters" data-testid="input-password" /></label><button type="submit" disabled={loading} className={`${buttonBase} w-full bg-forest py-3.5 text-paper hover:bg-forest/90`} data-testid={`button-submit-${mode}`}>{loading ? 'Please wait...' : mode === 'login' ? 'Continue' : 'Create account'} <ArrowRight size={15} /></button></form><p className="mt-7 text-center text-xs text-ink/50">{mode === 'login' ? 'New to UNFOLD?' : 'Already have an account?'} <Link href={mode === 'login' ? '/register' : '/login'} className="font-semibold text-terracotta hover:underline" data-testid="link-switch-auth">{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p></AuthLayout>;
}

export function LoginPage() { return <AuthForm mode="login" />; }
export function RegisterPage() { return <AuthForm mode="register" />; }

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  return <AuthLayout caption="A gentle nudge when you need it."><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-terracotta">Reset your password</p><h1 className="mt-4 font-display text-5xl leading-[.9] tracking-[-.05em]">{sent ? 'Check your inbox.' : 'A fresh start is close.'}</h1><p className="mt-5 text-sm leading-6 text-ink/55">{sent ? "We've sent a reset link to your email. It should arrive shortly." : 'Enter your email and we’ll send you a link to reset it.'}</p>{sent ? <div className="mt-9 border border-forest/20 bg-forest/5 p-5 text-sm text-ink/65"><CheckCircle2 className="mb-3 text-forest" size={20} />Your reset link is on its way.</div> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="mt-9"><label className="block"><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">Email</span><input required type="email" className="mt-2 h-11 w-full border border-ink/15 bg-card px-3 text-sm outline-none focus:border-terracotta" placeholder="you@example.com" data-testid="input-reset-email" /></label><button type="submit" className={`${buttonBase} mt-4 w-full bg-forest py-3.5 text-paper hover:bg-forest/90`} data-testid="button-send-reset">Send reset link <ArrowRight size={15} /></button></form>}<Link href="/login" className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-ink/50 hover:text-terracotta" data-testid="link-back-login"><ArrowLeft size={14} /> Back to login</Link></AuthLayout>;
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME';
  const displayName = user?.name ?? 'Mara Ellison';
  const displayEmail = user?.email ?? 'mara@example.com';

  return <AppShell><PageIntro eyebrow="Settings" title="Your preferences." /><div className="mx-auto max-w-[780px] space-y-8"><section className="border border-ink/15 bg-card p-6 md:p-8"><div className="flex items-center gap-4 border-b border-ink/10 pb-6"><div className="grid h-14 w-14 place-items-center rounded-full bg-terracotta text-sm font-bold text-paper">{initials}</div><div><h2 className="font-display text-2xl">{displayName}</h2><p className="mt-1 text-sm text-ink/50">{displayEmail}</p></div><button type="button" className={`${buttonBase} ml-auto hidden border border-ink/15 px-3 py-2 text-xs sm:inline-flex`} data-testid="button-change-avatar">Change photo</button></div><div className="grid gap-5 pt-7 sm:grid-cols-2"><label><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">Full name</span><input key={displayName} defaultValue={displayName} className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3 text-sm outline-none focus:border-terracotta" data-testid="input-settings-name" /></label><label><span className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-ink/55">Email address</span><input key={displayEmail} defaultValue={displayEmail} className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3 text-sm outline-none focus:border-terracotta" data-testid="input-settings-email" /></label></div><button type="button" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }} className={`${buttonBase} mt-7 bg-forest px-4 py-3 text-paper`} data-testid="button-save-settings">{saved ? <Check size={15} /> : null}{saved ? 'Saved' : 'Save changes'}</button></section><section className="border border-ink/15 bg-card p-6 md:p-8"><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-terracotta">Reading preferences</p><div className="mt-5 divide-y divide-ink/10"><label className="flex items-center justify-between py-4"><span><span className="block text-sm font-semibold">Default summary length</span><span className="mt-1 block text-xs text-ink/50">Choose how much context appears first.</span></span><select className="border border-ink/15 bg-paper px-3 py-2 text-xs outline-none" defaultValue={user?.preferences?.defaultSummaryLength ?? 'Medium'} data-testid="select-summary-length"><option>Short</option><option>Medium</option><option>Long</option></select></label><label className="flex items-center justify-between py-4"><span><span className="block text-sm font-semibold">Email when a document is ready</span><span className="mt-1 block text-xs text-ink/50">A quiet note when the reading is complete.</span></span><input type="checkbox" defaultChecked={user?.preferences?.emailNotification ?? true} className="h-4 w-4 accent-[#293d2c]" data-testid="checkbox-email-notification" /></label></div></section></div></AppShell>;
}