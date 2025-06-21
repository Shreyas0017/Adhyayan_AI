'use client';

import Link from 'next/link';
import { Mail, MapPin, Phone, ArrowUpRight, Github, Twitter, Linkedin } from 'lucide-react';

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

const FooterLink = ({ href, children, external = false }: FooterLinkProps) => (
  <Link 
    href={href}
    className="text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-1 group"
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
  >
    {children}
    {external && (
      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    )}
  </Link>
);

const SocialLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 group"
    aria-label={label}
  >
    <Icon className="h-4 w-4 text-neutral-400 group-hover:text-white transition-colors duration-200" />
  </Link>
);

export function ProfessionalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Adhyayan AI</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                AI-powered learning that adapts to your style for faster, more effective education.
              </p>
            </div>
            
            {/* Social Links */}
            <div className="flex space-x-3">
              <SocialLink href="#" icon={Github} label="GitHub" />
              <SocialLink href="#" icon={Twitter} label="Twitter" />
              <SocialLink href="#" icon={Linkedin} label="LinkedIn" />
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Product</h4>
            <nav className="space-y-4">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="#integrations">Integrations</FooterLink>
              <FooterLink href="#api">API</FooterLink>
              <FooterLink href="#changelog">Changelog</FooterLink>
            </nav>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Company</h4>            <nav className="space-y-4">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/press">Press</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </nav>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Support</h4>
            <nav className="space-y-4">
              <FooterLink href="/help">Help Center</FooterLink>
              <FooterLink href="/documentation" external>Documentation</FooterLink>
              <FooterLink href="/community" external>Community</FooterLink>
              <FooterLink href="/status" external>Status</FooterLink>
            </nav>
            
            <div className="mt-8 space-y-4">
              <h5 className="text-sm font-medium text-neutral-300">Legal</h5>
              <nav className="space-y-3">
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
                <FooterLink href="/terms">Terms of Service</FooterLink>
                <FooterLink href="/security">Security</FooterLink>
              </nav>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-16 pt-8 border-t border-neutral-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 text-neutral-400">
              <Mail className="h-4 w-4" />
              <span className="text-sm">contact@adhyayan.ai</span>
            </div>
            <div className="flex items-center space-x-3 text-neutral-400">
              <Phone className="h-4 w-4" />
              <span className="text-sm">+91-8670707887</span>
            </div>
            <div className="flex items-center space-x-3 text-neutral-400">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Kolkata, India</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-neutral-400">
              © {currentYear} Adhyayan AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}