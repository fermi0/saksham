"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { BlackHoleScene, type BlackHoleStage } from "@/components/blackhole/BlackHoleScene";

type BlackHoleIntroGateProps = {
  children: ReactNode;
};

export default function BlackHoleIntroGate({ children }: BlackHoleIntroGateProps) {
  const [stage, setStage] = useState<BlackHoleStage>("pre-intro");

  const [isMounted, setIsMounted] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // const today = new Date().toDateString();
    // const lastPlayed = localStorage.getItem("blackhole_played_date");
    // if (lastPlayed === today) {
    //   setSkipped(true);
    //   setStage("home");
    // }
    setIsMounted(true);
  }, []);

  const handleStart = () => {
    setStage("intro");
    // localStorage.setItem("blackhole_played_date", new Date().toDateString());
  };

  const handleEnter = () => setStage("entering");
  const handleEnteredBlackHole = () => setStage("expanding");

  useEffect(() => {
    if (stage === "expanding") {
      // Drastically reduced delay so it flows natively into the website reveal!
      const t = setTimeout(() => setStage("greeting"), 300);
      return () => clearTimeout(t);
    }
    if (stage === "greeting") {
      // Shorter sequence to keep momentum going
      const t = setTimeout(() => setStage("home"), 1600);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const isRising = stage === "expanding" || stage === "greeting" || stage === "home";

  if (!isMounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-[#ebdbb2] selection:bg-[#fabd2f] selection:text-[#1d2021]">

      {/* ── Standby Screen ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!skipped && stage === "pre-intro" && (
          <motion.div
            key="pre-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-12 bg-black"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 2 }}
              className="text-center"
            >
              <h2 className="text-3xl font-extralight tracking-[0.5em] text-[#a89984] uppercase mb-2">
                Singularity
              </h2>
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#d65d0e] to-transparent mx-auto" />
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05, letterSpacing: "0.5em" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="group relative overflow-hidden rounded-full border border-[#504945] px-12 py-4 text-xs tracking-[0.4em] text-[#ebdbb2] uppercase transition-all duration-500 hover:border-[#fe8019] hover:text-[#fe8019]"
            >
              <span className="relative z-10">Initialize Singularity</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#fe8019]/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-D Black Hole Canvas ───────────────────────────────────────────── */}
      {!skipped && (
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{
            opacity: (stage === "intro" || stage === "entering") ? 1 : 0,
            scale: stage === "entering" ? 1.2 : 1
          }}
          transition={{
            opacity: { duration: 2 },
            scale: { duration: 12, ease: "easeIn" }
          }}
        >
          <BlackHoleScene stage={stage} onEntered={handleEnteredBlackHole} />
        </motion.div>
      )}

      {/* ── Intro Controls ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!skipped && stage === "intro" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
            transition={{ duration: 1.5 }}
            className="absolute bottom-32 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-6"
          >
            <p className="text-xs tracking-[0.6em] text-[#a89984] uppercase opacity-50">
              Beyond the Horizon
            </p>
            <button
              onClick={handleEnter}
              className="group relative flex items-center gap-4 overflow-hidden rounded-full border border-[#fe8019]/30 bg-black/40 backdrop-blur-md px-10 py-4 text-sm font-light tracking-[0.3em] text-[#fe8019] uppercase transition-all duration-700 hover:border-[#fe8019] hover:shadow-[0_0_40px_rgba(254,128,25,0.2)]"
            >
              <span className="relative z-10">Cross Event Horizon</span>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="relative z-10 inline-block text-lg"
              >
                ◎
              </motion.span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RISING PANEL — full-page emergence ──────────────────────────────── */}
      <motion.div
        key="emerge"
        className="absolute inset-0 z-20 flex min-h-screen flex-col"
        initial={skipped ? false : { clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
        animate={{
          clipPath: isRising ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)",
          opacity: isRising ? 1 : 0,
        }}
        transition={{
          clipPath: { duration: 2.6, ease: [0.16, 1, 0.3, 1] }, // spring-ish ease
          opacity: { duration: 0.6, ease: "easeOut" },
        }}
        style={{ pointerEvents: isRising ? "auto" : "none" }}
      >
        {/* ── layered background — buttery Gruvbox warm dark ────────────────── */}
        {/* base */}
        <div className="pointer-events-none absolute inset-0 bg-[#1d2021]" />

        {/* warm amber vignette — fades in after greeting */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={skipped ? false : { opacity: 0 }}
          animate={{ opacity: stage === "home" ? 1 : 0 }}
          transition={{ duration: 1.8, ease: "easeInOut", delay: 0.4 }}
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(214,93,14,0.10) 0%, rgba(29,32,33,0) 70%)",
          }}
        />

        {/* subtle scanline texture overlay — depth & richness */}
        <motion.div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          initial={skipped ? false : { opacity: 0 }}
          animate={{ opacity: stage === "home" ? 0.04 : 0 }}
          transition={{ duration: 2.2, ease: "easeInOut", delay: 0.6 }}
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(251,241,199,0.5) 0px, rgba(251,241,199,0.5) 1px, transparent 1px, transparent 3px)",
          }}
        />

        {/* The 3D Canvas itself now natively cross-fades backwards smoothly. No artificial white mask is needed to hide glitching. */}

        {/* ── "Hi" greeting ─────────────────────────────────────────────────── */}
        {!skipped && (
        <motion.div
          key="greeting-text"
          initial={{ opacity: 0, scale: 0.94, filter: "blur(12px)" }}
          animate={{
            opacity: stage === "greeting" ? 1 : 0,
            scale: stage === "greeting" ? 1 : 1.04,
            filter: stage === "greeting" ? "blur(0px)" : "blur(12px)",
          }}
          transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <h2 className="font-sans text-6xl font-extralight tracking-wider text-[#fbf1c7]/90 md:text-8xl"
            style={{ textShadow: "0 0 35px rgba(180,210,255,0.25)" }}>
            Hi
          </h2>
        </motion.div>
        )}

        {/* ── site content reveal ──────────────────────────────────────────── */}
        <motion.div
          key="home-interface"
          initial={skipped ? false : { opacity: 0, y: 40, filter: "blur(8px)" }}
          animate={{
            opacity: stage === "home" ? 1 : 0,
            y: stage === "home" ? 0 : 40,
            filter: stage === "home" ? "blur(0px)" : "blur(8px)",
          }}
          transition={{
            opacity: { duration: 1.6, ease: [0.25, 1, 0.5, 1], delay: 0.3 },
            y: { duration: 1.6, ease: [0.25, 1, 0.5, 1], delay: 0.3 },
            filter: { duration: 1.2, ease: "easeOut", delay: 0.3 },
          }}
          style={{ pointerEvents: stage === "home" ? "auto" : "none" }}
          className="relative z-20 flex min-h-screen flex-col"
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
