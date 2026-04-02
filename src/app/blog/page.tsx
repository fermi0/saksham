import BlogScene from "@/components/scenes/BlogScene";
import Link from "next/link";

export const metadata = {
  title: "Blog • Saksham",
  description: "Writing about building, learning, and shipping.",
};

const posts = [
  {
    title: "Hello, internet",
    description:
      "Why I’m starting a blog again, and what I want this site to become.",
    href: "#",
    date: "2026-04-02",
  },
  {
    title: "Making 3D feel lightweight",
    description:
      "Notes on using small scenes, gentle motion, and good defaults for performance.",
    href: "#",
    date: "2026-04-02",
  },
];

export default function BlogPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="text-sm tracking-wide text-white/60">Blog</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Notes, stories, and shipped learnings.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Short, practical writing about my personal and professional journey.
            Over time this will grow into a searchable archive.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              About
            </Link>
          </div>
        </div>

        <div className="w-full md:max-w-sm">
          <BlogScene />
        </div>
      </header>

      <section className="mt-14 grid gap-4">
        {posts.map((post) => (
          <article
            key={post.title}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-white/85">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {post.description}
                </p>
              </div>
              <time className="shrink-0 text-xs text-white/45">{post.date}</time>
            </div>
            <div className="mt-4 text-sm text-white/60">
              <span className="underline decoration-white/20 underline-offset-4 group-hover:decoration-white/50">
                Read soon
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

