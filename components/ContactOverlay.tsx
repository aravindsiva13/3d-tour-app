"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Phone, Mail, MapPin, Globe, Map as MapIcon, Share2, Check } from 'lucide-react';
import gsap from 'gsap';

interface ContactOverlayProps {
  onClose: () => void;
}

/* lucide-react dropped brand marks from core, so YouTube and Instagram are
   inlined here in the same 24px / 2px-stroke geometry as the lucide set. */
type IconProps = { size?: number };

const YoutubeIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const InstagramIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const DCC = {
  name: 'DCC Promoters',
  phone: '+91 87545 93460',
  phoneHref: '+918754593460',
  email: 'info@dccpromoters.in',
  website: 'https://www.dccpromoters.in/'
};

/* Order as specified: Website -> (WhatsApp) -> YouTube -> Google Maps -> Instagram.
   WhatsApp is omitted: no number/URL was supplied and inventing one would send
   enquiries into the void. Drop an entry in here once the real link exists. */
const SOCIALS = [
  { label: 'Website', href: DCC.website, Icon: Globe },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCseg9kWWiMG1236u6ghLXew', Icon: YoutubeIcon },
  { label: 'Google Maps', href: "https://www.google.com/maps/place/13%C2%B005'04.8%22N+80%C2%B010'55.7%22E/@13.0845215,80.1820133,83m/", Icon: MapIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/promoters.dcc/', Icon: InstagramIcon }
] as const;

const MagneticWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const h = rect.width / 2;
      const w = rect.height / 2;
      const x = e.clientX - rect.left - h;
      const y = e.clientY - rect.top - w;
      
      gsap.to(el, { x: x * 0.4, y: y * 0.4, duration: 0.4, ease: "power2.out" });
    };

    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
    };

    el.addEventListener("mousemove", move as EventListener);
    el.addEventListener("mouseleave", leave as EventListener);

    return () => {
      el.removeEventListener("mousemove", move as EventListener);
      el.removeEventListener("mouseleave", leave as EventListener);
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
};

export const ContactOverlay: React.FC<ContactOverlayProps> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleShare = useCallback(async () => {
    // Current virtual-tour / property URL, falling back to the marketing site
    // during SSR where `window` does not exist.
    const pageUrl = typeof window !== 'undefined' ? window.location.href : DCC.website;
    const payload = {
      title: DCC.name,
      text: `${DCC.name} — ${DCC.website}`,
      url: pageUrl
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        setShareState('idle');
        return;
      } catch (err) {
        // The user dismissing the sheet throws AbortError — not a failure.
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: copy the link so there is always something useful to paste.
    try {
      await navigator.clipboard.writeText(`${DCC.name} — ${pageUrl}`);
      setShareState('copied');
    } catch {
      setShareState('failed');
    }
  }, []);

  // Reset the confirmation so it does not linger.
  useEffect(() => {
    if (shareState === 'idle') return;
    const t = setTimeout(() => setShareState('idle'), 2600);
    return () => clearTimeout(t);
  }, [shareState]);

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(containerRef.current, 
        { opacity: 0, backdropFilter: 'blur(0px)' }, 
        { opacity: 1, backdropFilter: 'blur(8px)', duration: 0.6, ease: 'power2.out' }
      );
      tl.fromTo('.contact-item',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
        "-=0.2"
      );
    }
  }, []);

  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        backdropFilter: 'blur(0px)',
        duration: 0.4,
        ease: 'power2.in',
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[rgba(11,10,8,0.50)] flex flex-col items-center justify-center pointer-events-auto p-4">
      
      {/* Top Header & Close */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
        <div className="bg-[rgba(246,231,188,0.08)] backdrop-blur-2xl px-6 py-3 rounded-full border border-[rgba(201,169,97,0.28)] shadow-[inset_0_1px_1px_rgba(246,231,188,0.2)] pointer-events-auto">
          <span className="text-[var(--gold-200)] font-medium tracking-[0.18em] text-sm uppercase">Contact Us</span>
        </div>
        
        <MagneticWrapper className="pointer-events-auto">
          <button 
            onClick={handleClose}
            className="group p-3 rounded-full bg-[rgba(246,231,188,0.08)] text-white hover:bg-[var(--gold-300)] hover:text-[#1A150B] backdrop-blur-2xl border border-[rgba(201,169,97,0.28)] shadow-[inset_0_1px_1px_rgba(246,231,188,0.2)] transition-colors"
          >
            <X size={20} className="transition-transform duration-500 group-hover:rotate-90" />
          </button>
        </MagneticWrapper>
      </div>

      {/* Main Content Card */}
      <div className="contact-card w-full max-w-lg bg-[rgba(246,231,188,0.08)] backdrop-blur-2xl border border-[rgba(201,169,97,0.28)] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(246,231,188,0.2)] rounded-3xl p-8 md:p-12 flex flex-col gap-8 relative z-10 overflow-hidden">
        
        {/* Decorative Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[rgba(246,231,188,0.08)] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[rgba(246,231,188,0.05)] rounded-full blur-3xl pointer-events-none" />

        <div className="text-center contact-item">
          <h2 className="text-2xl md:text-3xl font-light text-white tracking-widest uppercase mb-2">Get in Touch</h2>
          <p className="text-white/60 text-sm">Experience luxury living firsthand.</p>
        </div>

        <div className="flex flex-col gap-6 w-full">
          {/* Phone */}
          <a href={`tel:${DCC.phoneHref}`} className="contact-item group flex items-center gap-4 p-4 rounded-2xl hover:bg-[rgba(246,231,188,0.08)] border border-transparent hover:border-[rgba(201,169,97,0.18)] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-[rgba(246,231,188,0.08)] flex items-center justify-center shrink-0 border border-[rgba(201,169,97,0.28)] group-hover:bg-[var(--gold-300)] group-hover:text-black transition-colors text-white">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">Mobile</p>
              <p className="text-white text-lg font-light tracking-wide">{DCC.phone}</p>
            </div>
          </a>

          {/* Email */}
          <a href={`mailto:${DCC.email}`} className="contact-item group flex items-center gap-4 p-4 rounded-2xl hover:bg-[rgba(246,231,188,0.08)] border border-transparent hover:border-[rgba(201,169,97,0.18)] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-[rgba(246,231,188,0.08)] flex items-center justify-center shrink-0 border border-[rgba(201,169,97,0.28)] group-hover:bg-[var(--gold-300)] group-hover:text-black transition-colors text-white">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">Email</p>
              <p className="text-white text-lg font-light tracking-wide break-all">{DCC.email}</p>
            </div>
          </a>

          {/* Address */}
          <div className="contact-item group flex items-center gap-4 p-4 rounded-2xl hover:bg-[rgba(246,231,188,0.08)] border border-transparent hover:border-[rgba(201,169,97,0.18)] transition-all">
            <div className="w-12 h-12 rounded-full bg-[rgba(246,231,188,0.08)] flex items-center justify-center shrink-0 border border-[rgba(201,169,97,0.28)] group-hover:bg-[var(--gold-300)] group-hover:text-black transition-colors text-white">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">Location</p>
              <p className="text-white text-sm font-light leading-relaxed">The Project Site<br />Chennai, Tamil Nadu, 600040</p>
            </div>
          </div>
        </div>

        {/* External links + share */}
        <div className="contact-item flex flex-col gap-5 w-full">
          <div className="gold-rule w-full" />

          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="group w-12 h-12 rounded-full bg-[rgba(246,231,188,0.08)] flex items-center justify-center shrink-0 border border-[rgba(201,169,97,0.28)] text-[var(--gold-200)] hover:bg-[var(--gold-300)] hover:text-[#1A150B] hover:border-[var(--gold-200)] hover:shadow-[0_0_22px_rgba(201,169,97,0.45)] transition-all duration-300"
              >
                <Icon size={19} />
              </a>
            ))}

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share DCC Promoters"
              title="Share"
              className="group w-12 h-12 rounded-full bg-[rgba(246,231,188,0.08)] flex items-center justify-center shrink-0 border border-[rgba(201,169,97,0.28)] text-[var(--gold-200)] hover:bg-[var(--gold-300)] hover:text-[#1A150B] hover:border-[var(--gold-200)] hover:shadow-[0_0_22px_rgba(201,169,97,0.45)] transition-all duration-300"
            >
              {shareState === 'copied' ? <Check size={19} /> : <Share2 size={19} />}
            </button>
          </div>

          {/* Fallback confirmation — also the accessible announcement */}
          <p
            role="status"
            aria-live="polite"
            className={`text-center text-[11px] tracking-[0.18em] uppercase transition-opacity duration-300 ${
              shareState === 'idle' ? 'opacity-0' : 'opacity-100 text-[var(--gold-300)]'
            }`}
          >
            {shareState === 'copied' ? 'Link copied to clipboard' : shareState === 'failed' ? 'Could not share — copy the link from your browser' : ' '}
          </p>
        </div>

      </div>
    </div>
  );
};
