"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/booking", label: "Booking" },
  { href: "/reviews", label: "Reviews" },
  { href: "/pictures", label: "Pictures" },
  { href: "/videos", label: "Videos" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-[rgba(247,244,239,0.78)] backdrop-blur-2xl">
      <div className="site-shell flex flex-col gap-3 py-3 md:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/55 bg-[rgba(255,255,255,0.62)] px-4 py-3 shadow-[0_12px_34px_rgba(16,32,42,0.07)]">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f5f6d,#db8752)] text-lg font-bold text-[#f8fbfa] shadow-[0_16px_30px_rgba(15,95,109,0.2)]">
            SS
          </span>
          <span className="hidden sm:block">
            <span className="block text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Shylow SKI
            </span>
            <span className="block text-sm font-semibold text-stone-950">
              Bed & Breakfast
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] lg:flex">
          <span className="rounded-full border border-white/70 bg-white/72 px-3 py-2 text-[0.72rem] tracking-[0.24em] text-[var(--accent-ink)]">
            Albion, St Thomas, Jamaica
          </span>
          <span>Request-based booking</span>
        </div>
        </div>

        <nav className="flex items-center gap-2 overflow-x-auto rounded-full border border-white/70 bg-white/72 p-1 text-sm shadow-[0_10px_28px_rgba(16,32,42,0.07)]">
          {links.map((link) => {
            const isActive =
              pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 font-medium transition-colors ${
                  isActive
                    ? "bg-[linear-gradient(135deg,#0f5f6d,#db8752)] text-white shadow-[0_12px_24px_rgba(15,95,109,0.22)]"
                    : "text-stone-700 hover:bg-white hover:text-stone-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}