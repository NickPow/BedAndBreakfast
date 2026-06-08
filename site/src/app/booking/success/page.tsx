import Link from "next/link";

export default function BookingSuccessPage() {
  return (
    <div className="site-shell section-pad">
      <section className="quote-panel animate-rise rounded-[2rem] p-8 md:p-12">
        <span className="eyebrow">Booking request received</span>
        <h1 className="section-title mt-4">Thanks, your request is with the host.</h1>
        <p className="section-copy mt-4 max-w-2xl">
          We emailed the booking details and someone will follow up with availability and payment steps.
          If you need an urgent update, please contact the host directly.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="button-primary">
            Back to home
          </Link>
          <Link href="/booking" className="button-secondary">
            Submit another request
          </Link>
        </div>
      </section>
    </div>
  );
}
