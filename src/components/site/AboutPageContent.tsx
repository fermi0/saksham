"use client";

import { motion } from "framer-motion";

export default function AboutPageContent() {
  return (
    <motion.div
      className="w-full max-w-2xl rounded-2xl border border-[#3c3836] bg-[#282828]/50 p-8 backdrop-blur-sm md:p-12"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="mb-6 flex items-center gap-4 font-light text-3xl text-[#fbf1c7]">
        <span className="h-0.5 w-8 bg-[#d65d0e]" />
        About protocol
      </h2>
      <div className="space-y-6 font-light leading-relaxed text-[#a89984]">
        <p>
          I build web experiences that stay fast, honest, and easy to change —
          the kind you can still reason about months later.
        </p>
        <p>
          This site uses a Gruvbox-inspired palette: warm paper tones, amber
          accents, and enough contrast to read for hours without fatigue.
        </p>
        <div className="border-t border-[#3c3836]/50 pt-6">
          <h3 className="mb-4 text-sm uppercase tracking-widest text-[#fe8019]">
            Core directives
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#fabd2f]" />
              <span>Ship small, measure, then deepen — avoid speculative complexity.</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#83a598]" />
              <span>Prefer clear boundaries over clever abstractions.</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d3869b]" />
              <span>Keep third-party surface area small and justified.</span>
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
