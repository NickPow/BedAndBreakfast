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
                <div className="relative aspect-video w-full">
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                    title="Shylow SKI video"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
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