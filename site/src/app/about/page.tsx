export default function AboutPage() {
  return (
    <div className="site-shell section-pad space-y-8 md:space-y-12">
      <section className="hero-ribbon grid gap-6 rounded-[1.8rem] p-6 md:grid-cols-[1.3fr_0.7fr] md:gap-8 md:p-8 lg:p-10">
        <div className="space-y-5">
          <p className="section-kicker">Shylow SKI</p>
          <h1 className="section-title max-w-2xl text-[clamp(2.8rem,5vw,5.6rem)]">About this space</h1>
          <p className="section-copy max-w-2xl text-base md:text-lg">
            A calm, private stay designed for rest, privacy, and easy living while you unwind in Albion.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <span className="pill">Relaxed getaway</span>
            <span className="pill">Private space</span>
            <span className="pill">Quiet neighborhood</span>
          </div>
        </div>

        <aside className="content-card rounded-[1.5rem] p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-ink)]">What to expect</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-stone-700 md:text-[0.98rem]">
            <p>Comfortable rooms, open outdoor space, and a simple stay that lets you move at your own pace.</p>
            <p>Take time to unwind, recharge, and enjoy a quieter kind of getaway.</p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="content-card rounded-[1.4rem] p-6 md:p-7">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">Guest access</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700 md:text-base">You have access to:</p>
          <ul className="mt-3 space-y-2 pl-5 text-sm leading-7 text-stone-800 marker:text-[var(--accent)] list-disc md:text-base">
            <li>this apartment you are now in</li>
            <li>the outdoor backyard space</li>
            <li>the fruits in season</li>
          </ul>
          <p className="mt-4 text-sm leading-7 text-stone-700 md:text-base">
            Additionally, the gate is keyless entry run by the Bluetooth on your phone.
          </p>
        </article>

        <article className="content-card rounded-[1.4rem] p-6 md:p-7">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">Other things to note</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700 md:text-base">
            If you have guests who come to visit they are welcome to use the outside bathroom located at the left side of the building.
          </p>
        </article>
      </section>

      <section className="quote-panel rounded-[1.4rem] p-6 md:p-7 lg:p-8">
        <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">Where you'll be</h2>
        <p className="mt-3 text-sm font-semibold tracking-wide text-stone-900 md:text-base">Albion, Saint Thomas Parish, Jamaica</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1rem] border border-white/70 bg-white/70 p-4">
            <h3 className="text-xl font-semibold text-stone-950 md:text-2xl">Safety and Security</h3>
            <p className="mt-2 text-sm leading-7 text-stone-700">
              The community of Albion is secure. There is a neighborhood watch that monitors all the activities taking place in the community. Do your part by staying within the parameters of Lot 946 unless you are going out.
            </p>
          </article>

          <article className="rounded-[1rem] border border-white/70 bg-white/70 p-4">
            <h3 className="text-xl font-semibold text-stone-950 md:text-2xl">Location</h3>
            <p className="mt-2 text-sm leading-7 text-stone-700">
              This community of Albion is located in the parish of St Thomas in Jamaica. It is approximately 31.4 km/30 minutes away from the Norman Manley International Airport.
            </p>
          </article>

          <article className="rounded-[1rem] border border-white/70 bg-white/70 p-4">
            <h3 className="text-xl font-semibold text-stone-950 md:text-2xl">Getting around</h3>
            <p className="mt-2 text-sm leading-7 text-stone-700">A vehicle for emergency or convenience. extra cost</p>
            <p className="mt-2 text-sm leading-7 text-stone-700">
              Bicycles available to enjoy a ride in the neighborhood at a small maintenance fee.
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* 'Where you'll sleep' section removed per user request */}
        <article className="content-card rounded-[1.4rem] p-6 md:p-7">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">What this place offers</h2>
          <ul className="mt-4 space-y-2 pl-5 text-sm leading-7 text-stone-800 marker:text-[var(--accent)] list-disc md:text-base">
            <li>Lake access</li>
            <li>Kitchen</li>
            <li>Wifi</li>
            <li>Free parking on premises</li>
            <li>Exterior security cameras on property</li>
            <li>Carbon monoxide alarm</li>
          </ul>
        </article>
      </section>
    </div>
  );
}