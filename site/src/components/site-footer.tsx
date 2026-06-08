import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/60 bg-[rgba(245,245,242,0.86)] backdrop-blur-xl">
      <div className="site-shell grid gap-5 py-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div className="space-y-3">
          <p className="section-kicker">Shylow SKI Bed & Breakfast</p>
          <p className="max-w-2xl text-sm leading-7 text-stone-600">
            A polished coastal stay with direct-request booking.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            <span className="rounded-full border border-white/70 bg-white/60 px-3 py-2">Albion, St Thomas, Jamaica</span>
            <span className="rounded-full border border-white/70 bg-white/60 px-3 py-2">Secure booking flow</span>
            <span className="rounded-full border border-white/70 bg-white/60 px-3 py-2">Direct host approval</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link className="button-primary" href="/booking">
            Start a booking request
          </Link>
          <Link className="button-secondary" href="/about">
            Explore the area
          </Link>
        </div>
      </div>
    </footer>
  );
}