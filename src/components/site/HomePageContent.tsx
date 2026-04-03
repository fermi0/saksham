"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

// lazy so video doesn't block initial paint
const JoiHologram = dynamic(() => import("@/components/hologram/JoiHologram"), {
  ssr: false,
});

export default function HomePageContent() {
  return (
    <main className="relative min-h-[calc(100vh-10rem)] flex-1 overflow-hidden">

      {/* ── Joi hologram — bottom-right, head ~50vh ───────────────────────── */}
      <JoiHologram />

      {/* ── hero text — left so it doesn't crowd the hologram ─────────────── */}
      <motion.div
        className="relative z-10 flex h-full min-h-[calc(100vh-10rem)] flex-col justify-center px-4 pt-16 md:max-w-[58%] md:pt-0"
        initial={{ scale: 0.97, opacity: 0, filter: "blur(10px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.3, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="mb-6 font-light text-4xl text-[#fbf1c7] md:text-5xl lg:text-6xl">
          Welcome to the<br />other side.
        </h2>
        <div className="mb-8 h-px w-24 bg-gradient-to-r from-[#d65d0e] to-transparent" />
        <p className="max-w-md font-light text-lg leading-relaxed text-[#a89984] md:text-xl">
          Personal site — blogs, projects, and notes — folded through a warm
          Gruvbox palette: readable in the dark, calm at the edges, sharp where
          it matters.
        </p>
        <div className="mt-12 flex flex-wrap gap-6">
          <Link
            href="/blog"
            className="rounded-full border border-[#504945] bg-[#3c3836] px-8 py-3 text-[#ebdbb2] transition-all duration-300 hover:border-[#fe8019] hover:text-[#fe8019] hover:shadow-[0_0_15px_rgba(254,128,25,0.2)]"
          >
            Explore archive
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-transparent bg-transparent px-8 py-3 text-[#a89984] transition-colors duration-300 hover:border-[#504945] hover:text-[#ebdbb2]"
          >
            About protocol
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
