"use client";

import * as React from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  duration = 1.2,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const formatted = useTransform(motionValue, (latest) => {
    const n = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString();
    return `${prefix}${n}${suffix}`;
  });

  React.useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return <motion.span className={className}>{formatted}</motion.span>;
}
