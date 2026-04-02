import AboutScene from "@/components/scenes/AboutScene";
import Link from "next/link";

export const metadata = {
  title: "About • Saksham",
  description: "A quick snapshot of my personal and professional journey.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="text-sm tracking-wide text-white/60">About</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Building things that feel calm, fast, and useful.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            This site is my corner of the internet—projects I’m proud of, notes I
            want to remember, and the long-form stories that don’t fit in a
            résumé.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              href="/blog"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Blog
            </Link>
          </div>
        </div>

        <div className="w-full md:max-w-sm">
          <AboutScene />
        </div>
      </header>

      <section className="mt-14 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-medium text-white/80">Now</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Focused on building reliable web experiences and learning deeply—
            one small, polished piece at a time.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-medium text-white/80">Work</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            I enjoy systems that are simple to reason about: clean boundaries,
            thoughtful UX, and performance that holds up in the real world.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-medium text-white/80">Outside</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Writing, tinkering with visuals, and keeping things lightweight—so
            the work stays sustainable.
          </p>
        </div>
      </section>
    </main>
  );
}

