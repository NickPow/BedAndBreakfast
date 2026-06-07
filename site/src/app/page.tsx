import Link from "next/link";

export default function Home() {
  return (
    <div className="site-shell section-pad space-y-8 md:space-y-12">
      <section className="hero-ribbon grid gap-8 rounded-[1.5rem] p-6">
        <div>
          <h1 className="section-title">Shylow SKI</h1>
          <p className="mt-2 text-lg">Private bed and breakfast in Albion, Jamaica</p>

          <div className="mt-4 space-y-1">
            <p className="font-semibold">Lot 946</p>
            <p>St Thomas Drive</p>
            <p>Albion, St Thomas</p>
          </div>

          <p className="mt-4">8 guests · 4 bedrooms · 4 beds · 2 shared baths</p>
          

          <div className="mt-6">
            <Link className="button-primary" href="/booking">
              Check availability
            </Link>
          </div>
        </div>
      </section>

      <section className="content-card rounded-[1.5rem] p-5 md:p-6">
        <h2 className="section-title text-2xl md:text-3xl">Location</h2>
        <p className="mt-2 text-sm text-stone-700">Lot 946, St Thomas Drive, Albion, St Thomas, Jamaica</p>
        <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/60">
          <iframe
            title="Shylow SKI location map"
            src="https://www.google.com/maps?q=Lot+946+St+Thomas+Drive+Albion+St+Thomas+Jamaica&output=embed"
            width="100%"
            height="420"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </div>
  );
}
