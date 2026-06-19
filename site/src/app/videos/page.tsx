type VideoItem = {
  youtubeId: string;
  youtubeUrl: string;
};

const videoItems: VideoItem[] = [
  {
    youtubeId: "WMg7fTdfi5s",
    youtubeUrl: "https://youtu.be/WMg7fTdfi5s",
  },
  {
    youtubeId: "eIVqoIF9q58",
    youtubeUrl: "https://youtube.com/shorts/eIVqoIF9q58?feature=share",
  },
];

export default function VideosPage() {
  return (
    <div className="site-shell section-pad">
      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h1 className="section-title">Videos</h1>
        

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {videoItems.map((video) => (
            <article key={video.youtubeId} className="media-card rounded-[1.3rem] p-4">
              <div className="relative overflow-hidden rounded-[1rem] border border-stone-200 bg-stone-950">
                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block aspect-video w-full"
                  aria-label="Open video on YouTube"
                >
                  <img
                    className="h-full w-full object-cover"
                    src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt="Video thumbnail"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-stone-950/25 text-white">
                    <span className="rounded-full border border-white/80 bg-black/40 px-4 py-2 text-sm font-semibold">
                      Play on YouTube
                    </span>
                  </span>
                </a>
              </div>
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="button-secondary mt-4 inline-flex"
              >
                Open on YouTube
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}