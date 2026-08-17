"use client";

import React, { useEffect, useRef } from 'react';
import { X, Phone, Mail, MapPin, Globe } from 'lucide-react';
import gsap from 'gsap';

interface ContactOverlayProps {
  onClose: () => void;
}

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
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center pointer-events-auto p-4">
      
      {/* Top Header & Close */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] pointer-events-auto">
          <span className="text-white font-medium tracking-wide text-sm uppercase">Contact Us</span>
        </div>
        
        <MagneticWrapper className="pointer-events-auto">
          <button 
            onClick={handleClose}
            className="group p-3 rounded-full bg-white/10 text-white hover:bg-white hover:text-black backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] transition-colors"
          >
            <X size={20} className="transition-transform duration-500 group-hover:rotate-90" />
          </button>
        </MagneticWrapper>
      </div>

      {/* Main Content Card */}
      <div className="contact-card w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-3xl p-8 md:p-12 flex flex-col gap-8 relative z-10 overflow-hidden">
        
        {/* Decorative Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center contact-item">
          <h2 className="text-2xl md:text-3xl font-light text-white tracking-widest uppercase mb-2">Get in Touch</h2>
          <p className="text-white/60 text-sm">Experience luxury living firsthand.</p>
        </div>

        <div className="flex flex-col gap-6 w-full">
          {/* Phone */}
          <a href="tel:+1234567890" className="contact-item group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white group-hover:text-black transition-colors text-white">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">Phone</p>
              <p className="text-white text-lg font-light tracking-wide">+1 (234) 567-890</p>
            </div>
          </a>

          {/* Email */}
          <a href="mailto:twelvespacestudio.com" className="contact-item group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white group-hover:text-black transition-colors text-white">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">Email</p>
              <p className="text-white text-lg font-light tracking-wide">contact@twelvespacestudio.com</p>
            </div>
          </a>

          {/* Address */}
          <div className="contact-item group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white group-hover:text-black transition-colors text-white">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">Location</p>
              <p className="text-white text-sm font-light leading-relaxed">The Project Site<br />Chennai, Tamil Nadu, 600040</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
