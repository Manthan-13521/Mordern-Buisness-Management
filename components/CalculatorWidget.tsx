"use client";

import { useState } from "react";
import { X, Calculator as CalculatorIcon } from "lucide-react";

export function CalculatorWidget({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Pure mathematical evaluation
  const performCalculation = (op: string, a: number, b: number): number | null => {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? null : a / b;
      default: return b;
    }
  };

  const handleInput = (val: string) => {
    if (display === "Error") {
      setDisplay(val === "." ? "0." : val);
      setWaitingForNewValue(false);
      return;
    }

    if (waitingForNewValue) {
      setDisplay(val === "." ? "0." : val);
      setWaitingForNewValue(false);
    } else {
      if (val === "." && display.includes(".")) return;
      if (display === "0" && val !== ".") {
        setDisplay(val);
      } else {
        setDisplay(display + val);
      }
    }
  };

  const handleOperator = (nextOp: string) => {
    if (display === "Error") {
      setDisplay("0");
      setPreviousValue(null);
      setOperator(null);
      setWaitingForNewValue(false);
      return;
    }

    const currentValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operator && !waitingForNewValue) {
      const result = performCalculation(operator, previousValue, currentValue);
      
      if (result === null) {
        setDisplay("Error");
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(true);
        return;
      }
      
      // Round to prevent floating point issues like 0.1 + 0.2 = 0.30000000000000004
      const finalResult = String(parseFloat(result.toFixed(6)));
      setDisplay(finalResult);
      setPreviousValue(parseFloat(finalResult));
    }

    setOperator(nextOp);
    setWaitingForNewValue(true);
  };

  const calculate = () => {
    if (operator === null || previousValue === null || display === "Error") return;

    const currentValue = parseFloat(display);
    const result = performCalculation(operator, previousValue, currentValue);
    
    if (result === null) {
      setDisplay("Error");
    } else {
      const finalResult = String(parseFloat(result.toFixed(6)));
      setDisplay(finalResult);
    }
    
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNewValue(true);
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const handleDelete = () => {
    if (waitingForNewValue || display === "Error") {
      setDisplay("0");
      return;
    }
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  };

  const equationStr = (previousValue !== null && operator) ? `${previousValue} ${operator}` : "";

  return (
    <div className="fixed top-20 left-4 sm:left-8 z-50 w-[280px] bg-[#020617]/95 backdrop-blur-xl border border-[#1f2937] rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-left-8 fade-in duration-300">
      <div className="flex items-center justify-between p-4 bg-[#0b1220]/80 border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#8b5cf6]/20 rounded-lg">
            <CalculatorIcon className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <h3 className="font-bold text-[#f9fafb] text-sm tracking-wide">Calculator</h3>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 rounded-lg text-[#9ca3af] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-[#0b1220] p-3 rounded-2xl border border-[#1f2937] shadow-inner text-right relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8b5cf6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-xs text-[#9ca3af] min-h-[16px] mb-1 font-mono tracking-wider">{equationStr}</div>
          <div className="text-3xl font-bold text-[#f9fafb] font-mono tracking-tight truncate">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          <button onClick={clear} className="col-span-2 p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 font-bold text-sm hover:bg-rose-500/20 active:scale-95 transition-all">AC</button>
          <button onClick={handleDelete} className="p-3.5 rounded-2xl bg-[#1f2937]/50 text-[#f9fafb] font-bold hover:bg-[#1f2937] active:scale-95 transition-all">C</button>
          <button onClick={() => handleOperator("÷")} className="p-3.5 rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6] font-bold text-lg hover:bg-[#8b5cf6]/20 active:scale-95 transition-all">÷</button>

          <button onClick={() => handleInput("7")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">7</button>
          <button onClick={() => handleInput("8")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">8</button>
          <button onClick={() => handleInput("9")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">9</button>
          <button onClick={() => handleOperator("×")} className="p-3.5 rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6] font-bold text-lg hover:bg-[#8b5cf6]/20 active:scale-95 transition-all">×</button>

          <button onClick={() => handleInput("4")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">4</button>
          <button onClick={() => handleInput("5")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">5</button>
          <button onClick={() => handleInput("6")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">6</button>
          <button onClick={() => handleOperator("−")} className="p-3.5 rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6] font-bold text-lg hover:bg-[#8b5cf6]/20 active:scale-95 transition-all">−</button>

          <button onClick={() => handleInput("1")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">1</button>
          <button onClick={() => handleInput("2")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">2</button>
          <button onClick={() => handleInput("3")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">3</button>
          <button onClick={() => handleOperator("+")} className="p-3.5 rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6] font-bold text-lg hover:bg-[#8b5cf6]/20 active:scale-95 transition-all">+</button>

          <button onClick={() => handleInput("0")} className="col-span-2 p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-semibold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">0</button>
          <button onClick={() => handleInput(".")} className="p-3.5 rounded-2xl bg-[#111827] text-[#f9fafb] font-bold text-lg hover:bg-[#1f2937] active:scale-95 transition-all">.</button>
          <button onClick={calculate} className="p-3.5 rounded-2xl bg-[#8b5cf6] text-white font-bold text-lg hover:bg-[#7c3aed] active:scale-95 transition-all shadow-lg shadow-[#8b5cf6]/25 hover:shadow-[#8b5cf6]/40">=</button>
        </div>
      </div>
    </div>
  );
}
