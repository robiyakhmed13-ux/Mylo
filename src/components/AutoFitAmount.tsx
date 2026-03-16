import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface AutoFitAmountProps {
  value: string;
  className?: string;
  /** Base size: 'xl' (20px), 'lg' (18px), 'md' (14px), 'sm' (12px) */
  baseSize?: "xl" | "lg" | "md" | "sm";
}

const SIZE_CONFIG = {
  xl: { base: "text-xl", thresholds: [{ len: 12, cls: "text-lg" }, { len: 16, cls: "text-base" }, { len: 20, cls: "text-sm" }] },
  lg: { base: "text-lg", thresholds: [{ len: 12, cls: "text-base" }, { len: 16, cls: "text-sm" }, { len: 20, cls: "text-xs" }] },
  md: { base: "text-sm", thresholds: [{ len: 14, cls: "text-xs" }, { len: 18, cls: "text-[10px]" }] },
  sm: { base: "text-xs", thresholds: [{ len: 14, cls: "text-[10px]" }, { len: 18, cls: "text-[9px]" }] },
};

export const AutoFitAmount: React.FC<AutoFitAmountProps> = ({ value, className, baseSize = "lg" }) => {
  const sizeClass = useMemo(() => {
    const config = SIZE_CONFIG[baseSize];
    const len = value.length;
    for (const t of config.thresholds) {
      if (len >= t.len) continue;
    }
    // Find the right threshold
    let result = config.base;
    for (const t of config.thresholds) {
      if (len >= t.len) result = t.cls;
    }
    return result;
  }, [value, baseSize]);

  return <span className={cn(sizeClass, "font-bold leading-tight", className)}>{value}</span>;
};
