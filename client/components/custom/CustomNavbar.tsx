'use client';

import {
  Navbar,
  NavBody,  NavItems,
  MobileNav,
  NavbarLogo,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import Link from "next/link";
import { useState } from "react";

interface NavItem {
  name: string;
  link: string;
}

interface CustomNavbarProps {
  items?: NavItem[];
}

export const navItems = [
  { name: "Home", link: "/" },
  { name: "Features", link: "#features" },
  { name: "Pricing", link: "/pricing" },
  { name: "Contact", link: "#contact" },
];

export const CustomNavbar = ({ items = navItems }: CustomNavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <Navbar>
      {/* Desktop Navigation */}
      <NavBody>
        <NavbarLogo />
        <NavItems items={items} />        <div className="flex items-center gap-4">
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >          {items.map((item, idx) => (
            <Link
              key={`mobile-link-${idx}`}
              href={item.link}
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative text-neutral-600 dark:text-neutral-300"
            >
              <span className="block">{item.name}</span>
            </Link>
          ))}<div className="flex w-full items-center justify-center py-4">
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
};

export default CustomNavbar;