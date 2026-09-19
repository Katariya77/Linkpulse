import React from 'react';
import { LegalPolicyTab } from './LegalModal';
import { Shield } from 'lucide-react';

interface LegalFooterProps {
  onOpenPolicy: (tab: LegalPolicyTab) => void;
  className?: string;
}

export const LegalFooter: React.FC<LegalFooterProps> = ({ onOpenPolicy, className = '' }) => {
  return (
    <footer 
      className={`w-full pt-8 pb-4 border-t border-zinc-900/90 text-center space-y-3.5 ${className}`}
      id="linkpulse-public-legal-footer"
    >
      {/* 6 Public Legal Policy Links */}
      <nav 
        className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2 text-[11px] sm:text-xs font-medium text-zinc-400"
        aria-label="Legal and policy links"
      >
        <button
          type="button"
          id="footer-terms-btn"
          onClick={() => onOpenPolicy('terms')}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
        >
          Terms & Conditions
        </button>
        <span className="text-zinc-700 hidden sm:inline">•</span>

        <button
          type="button"
          id="footer-privacy-btn"
          onClick={() => onOpenPolicy('privacy')}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
        >
          Privacy Policy
        </button>
        <span className="text-zinc-700 hidden sm:inline">•</span>

        <button
          type="button"
          id="footer-about-btn"
          onClick={() => onOpenPolicy('about')}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
        >
          About Us
        </button>
        <span className="text-zinc-700 hidden sm:inline">•</span>

        <button
          type="button"
          id="footer-contact-btn"
          onClick={() => onOpenPolicy('contact')}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
        >
          Contact Us
        </button>
        <span className="text-zinc-700 hidden sm:inline">•</span>

        <button
          type="button"
          id="footer-refunds-btn"
          onClick={() => onOpenPolicy('refunds')}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
        >
          Cancellation & Refunds
        </button>
        <span className="text-zinc-700 hidden sm:inline">•</span>

        <button
          type="button"
          id="footer-shipping-btn"
          onClick={() => onOpenPolicy('shipping')}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
        >
          Shipping & Delivery
        </button>
      </nav>

      {/* Compliance Notice & Copyright */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1 text-zinc-400">
          <Shield className="h-3 w-3 text-zinc-400" />
          <span>Transparent policies and digital service terms</span>
        </span>
        <span className="text-zinc-800 hidden sm:inline">|</span>
        <span>Digital Software Platform</span>
        <span className="text-zinc-800 hidden sm:inline">|</span>
        <span>&copy; {new Date().getFullYear()} LinkPulse. All rights reserved.</span>
      </div>
    </footer>
  );
};
