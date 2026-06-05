const videoItems = [
  {
    title: "Property walkthrough",
    body: "Add a YouTube or Vimeo link later to show guests the space before they book.",
  },
  {
    title: "Breakfast and hospitality",
    body: "Use this slot for short clips that introduce the host and the morning experience.",
  },
  {
    title: "Albion and the south coast",
    body: "Reserve this slot for local travel moments, scenic drives, or nearby attractions.",
  },
];

export default function VideosPage() {
  return (
    <div className="site-shell section-pad">
      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h1 className="section-title">Videos coming soon</h1>
        <p className="mt-3 text-sm leading-7 text-stone-700">
          We've removed the video embeds for now — we'll add a proper video
          section once there are actual walkthroughs and clips to show.
        </p>
      </section>
    </div>
  );
}