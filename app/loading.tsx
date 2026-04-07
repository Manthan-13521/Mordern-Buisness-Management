"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
      <div className="relative">
        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-blue-500"
        />
        {/* Inner Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-zinc-800 border-b-cyan-400 absolute top-1/2 left-1/2 -mt-5 -ml-5"
        />
      </div>
      <p className="mt-6 text-sm font-medium text-zinc-400 tracking-wider uppercase">Loading AquaSync</p>
    </div>
  );
}
