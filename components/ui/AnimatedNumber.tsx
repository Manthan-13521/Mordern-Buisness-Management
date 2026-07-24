"use client";

import CountUp from 'react-countup';
import { motion } from 'framer-motion';

interface AnimatedNumberProps {
  value: string | number;
  prefix?: string;
  className?: string;
  delay?: number;
}

export default function AnimatedNumber({ value, prefix = "", className = "", delay = 0 }: AnimatedNumberProps) {
  // Extract number from string if needed (e.g. "₹1,245")
  let numValue = 0;
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]+/g, ""));
    numValue = isNaN(parsed) ? 0 : parsed;
  }

  // If value is a string and not a number, just render it animated
  const isStringOnly = typeof value === 'string' && isNaN(parseFloat(value.replace(/[^0-9.-]+/g, "")));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {isStringOnly ? (
        value
      ) : (
        <CountUp
          end={numValue}
          duration={2}
          separator=","
          prefix={prefix}
          decimals={numValue % 1 !== 0 ? 2 : 0}
        />
      )}
    </motion.div>
  );
}
