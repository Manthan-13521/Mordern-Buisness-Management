"use client";

import { motion, useMotionValue, useTransform, useSpring, useScroll } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { 
  TrendingUp, Users, FileText, ScanLine, Activity, CreditCard, 
  ArrowUpRight, DollarSign, BarChart3, PieChart
} from "lucide-react";

export function HeroShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mouse parallax tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    mouseX.set(x * 20); // max rotation/translation factor
    mouseY.set(y * 20);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Parallax transforms
  const rotateX = useTransform(smoothMouseY, [-10, 10], [10, -10]);
  const rotateY = useTransform(smoothMouseX, [-10, 10], [-10, 10]);
  const translateX1 = useTransform(smoothMouseX, [-10, 10], [-30, 30]);
  const translateY1 = useTransform(smoothMouseY, [-10, 10], [-30, 30]);
  const translateX2 = useTransform(smoothMouseX, [-10, 10], [40, -40]);
  const translateY2 = useTransform(smoothMouseY, [-10, 10], [40, -40]);
  
  // Counters
  const [revenue, setRevenue] = useState(0);
  const [members, setMembers] = useState(0);

  useEffect(() => {
    const revInterval = setInterval(() => {
      setRevenue(prev => {
        if (prev >= 124580) return 124580;
        return prev + Math.floor(Math.random() * 5000);
      });
    }, 50);

    const memInterval = setInterval(() => {
      setMembers(prev => {
        if (prev >= 1248) return 1248;
        return prev + Math.floor(Math.random() * 20);
      });
    }, 30);

    return () => {
      clearInterval(revInterval);
      clearInterval(memInterval);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[600px] sm:h-[700px] md:h-[800px] mt-16 perspective-[2000px] flex items-center justify-center overflow-hidden rounded-[32px]"
    >
      {/* Aurora & Grid Backgrounds */}
      <div className="absolute inset-0 bg-[#070B18] overflow-hidden rounded-[32px] border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dzb1z8lvx/image/upload/v1704283838/grid_fbdp6o.svg')] opacity-[0.05]" />
        
        {/* Animated Radial Gradients */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 100, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[#7C5CFF]/30 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            y: [0, -100, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#3B82F6]/30 blur-[120px]"
        />
      </div>

      {/* Connection Lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ filter: "drop-shadow(0 0 8px rgba(124,92,255,0.4))" }}>
        <defs>
          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Animated Path 1 */}
        <motion.path 
          d="M 30% 30% Q 50% 20% 70% 40%" 
          fill="none" 
          stroke="url(#lineGrad1)" 
          strokeWidth="2"
          strokeDasharray="10 10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
        />
        
        {/* Animated Path 2 */}
        <motion.path 
          d="M 70% 40% Q 60% 70% 40% 70%" 
          fill="none" 
          stroke="url(#lineGrad2)" 
          strokeWidth="2"
          strokeDasharray="10 10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
        />
      </svg>

      {/* Floating Elements Container */}
      <motion.div 
        style={{ rotateX, rotateY }}
        className="relative w-full h-full flex items-center justify-center transform-style-3d z-20"
      >

        {/* 1. Main Dashboard / Revenue Card */}
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute z-30 flex flex-col p-6 rounded-2xl bg-[#101828]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] w-[320px] sm:w-[380px]"
          style={{ x: translateX1, y: translateY1, translateZ: 50 }}
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7C5CFF]/20 to-[#3B82F6]/20 border border-white/5">
                <TrendingUp className="w-5 h-5 text-[#7C5CFF]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Total Revenue</h3>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 18.6%
            </div>
          </div>
          
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-3xl font-bold text-white tracking-tight">₹{revenue.toLocaleString()}</span>
          </div>

          {/* Animated Bar Chart */}
          <div className="h-16 flex items-end gap-1.5 w-full">
            {[40, 70, 45, 90, 65, 80, 100, 75, 50, 85].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 1, delay: 0.5 + (i * 0.05), type: "spring" }}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-[#3B82F6] to-[#7C5CFF] opacity-80 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
        </motion.div>

        {/* 2. Customer Insights Card */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute -left-[5%] md:left-[10%] top-[15%] z-20 flex flex-col p-5 rounded-2xl bg-[#101828]/70 backdrop-blur-md border border-white/5 shadow-2xl w-[240px]"
          style={{ x: translateX2, y: translateY2, translateZ: 30 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-medium text-gray-300">Active Members</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-2">{members.toLocaleString()}</div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "85%" }}
              transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#38BDF8] to-[#3B82F6]"
            />
          </div>
        </motion.div>

        {/* 3. Invoice / Recent Transactions */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="absolute -right-[5%] md:right-[10%] top-[40%] z-40 flex flex-col p-4 rounded-xl bg-[#101828]/80 backdrop-blur-xl border border-white/10 shadow-2xl w-[260px]"
          style={{ x: translateX2, y: translateY1, translateZ: 80 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Recent Invoices</h3>
            <FileText className="w-4 h-4 text-[#F59E0B]" />
          </div>
          
          <div className="space-y-3">
            {[
              { name: "Rahul Pools", amt: "45,600", stat: "Paid", color: "text-green-400" },
              { name: "Elite Hostel", amt: "12,450", stat: "Pending", color: "text-[#F59E0B]" },
              { name: "Aqua Club", amt: "28,340", stat: "Paid", color: "text-green-400" },
            ].map((inv, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + (i * 0.1) }}
                className="flex items-center justify-between group cursor-default"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-300 font-bold border border-gray-700">
                    {inv.name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{inv.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">₹{inv.amt}</div>
                  <div className={`text-[10px] ${inv.color}`}>{inv.stat}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 4. Scanner / Entry Point */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="absolute left-[15%] bottom-[10%] z-20 flex items-center gap-4 p-4 rounded-2xl bg-[#101828]/60 backdrop-blur-md border border-white/5 shadow-xl"
          style={{ x: translateX1, y: translateY2, translateZ: 40 }}
        >
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 overflow-hidden">
            <ScanLine className="w-6 h-6 text-green-400 relative z-10" />
            <motion.div 
              animate={{ top: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 w-full h-[2px] bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] z-20"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Fast Entry</h3>
            <p className="text-xs text-gray-500">QR Scanner Active</p>
          </div>
        </motion.div>

        {/* 5. Business Health / Analytics */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="absolute right-[15%] bottom-[15%] z-30 p-5 rounded-2xl bg-[#101828]/70 backdrop-blur-lg border border-white/10 shadow-2xl w-[200px]"
          style={{ x: translateX2, y: translateY2, translateZ: 60 }}
        >
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-medium text-gray-300">Health</h3>
             <Activity className="w-4 h-4 text-[#EF4444]" />
          </div>
          
          <div className="relative w-24 h-24 mx-auto">
            {/* SVG Donut Chart */}
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1f2937" strokeWidth="12" />
              <motion.circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#7C5CFF" 
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="251.2"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 60 }}
                transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
              />
              <motion.circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#3B82F6" 
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="251.2"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 200 }}
                transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-xl font-bold text-white">80%</span>
              <span className="text-[8px] text-gray-400 uppercase tracking-wider">Margin</span>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
