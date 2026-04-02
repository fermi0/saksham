"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const stats = [
  { label: "Core status", val: "Online", color: "text-[#b8bb26]" },
  { label: "Signal queue", val: "Clear", color: "text-[#fe8019]" },
  { label: "Archive depth", val: "Growing", color: "text-[#8ec07c]" },
  { label: "Noise floor", val: "Low", color: "text-[#d3869b]" },
  { label: "Sync drift", val: "< 1ms", color: "text-[#83a598]" },
  { label: "Local time", val: "Live", color: "text-[#ebdbb2]" },
] as const;

const posts = [
  {
    title: "Hello, internet",
    description:
      "Why I’m writing again, and what I want this log to become.",
    href: "#",
    date: "2026-04-02",
  },
  {
    title: "Making 3D feel lightweight",
    description:
      "Small scenes, gentle motion, and defaults that survive real devices.",
    href: "#",
    date: "2026-04-02",
  },
];

export default function BlogPageContent() {
  return (
    <motion.div
      className="flex w-full flex-col gap-12"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="mb-4 text-4xl font-light uppercase tracking-wider text-[#fbf1c7]">
          Transmission log
        </h2>
        <div className="mb-2 h-0.5 w-16 bg-[#d65d0e]" />
        <p className="text-sm uppercase tracking-widest text-[#a89984]">
          Telemetry stream active
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-6 md:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="group flex flex-col items-start gap-2 rounded-xl border border-[#3c3836] bg-[#282828]/50 p-6 backdrop-blur transition-colors hover:border-[#504945]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
          >
            <span className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#928374] transition-colors group-hover:text-[#a89984]">
              {stat.label}
            </span>
            <span className={`text-xl font-light md:text-2xl ${stat.color}`}>
              {stat.val}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4">
        <h3 className="text-sm uppercase tracking-[0.25em] text-[#7c6f64]">
          Entries
        </h3>
        {posts.map((post) => (
          <article
            key={post.title}
            className="rounded-xl border border-[#3c3836] bg-[#282828]/40 p-6 transition-colors hover:border-[#504945]"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-lg font-light text-[#fbf1c7]">
                  {post.title}
                </h4>
                <p className="mt-2 font-light leading-relaxed text-[#a89984]">
                  {post.description}
                </p>
              </div>
              <time className="shrink-0 text-xs tracking-wider text-[#928374]">
                {post.date}
              </time>
            </div>
            <div className="mt-4">
              <Link
                href={post.href}
                className="text-sm text-[#fe8019]/80 underline decoration-[#504945] underline-offset-4 transition hover:text-[#fe8019] hover:decoration-[#fe8019]/50"
              >
                Read soon
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="group relative mx-auto flex min-h-[200px] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl border border-[#3c3836]/40 bg-[#282828]/20 p-8 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(29,32,33,0)_0%,_rgba(254,128,25,0.05)_100%)]" />
        <p className="relative z-10 text-sm uppercase tracking-[0.3em] text-[#7c6f64] transition-colors duration-1000 group-hover:text-[#fe8019]/70">
          [ End of line ]
        </p>
      </div>
    </motion.div>
  );
}
