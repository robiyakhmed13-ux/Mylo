import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { safeJSON } from "@/lib/storage";

export type HapticIntensity = "off" | "light" | "medium";

interface HapticContextType {
  hapticIntensity: HapticIntensity;
  setHapticIntensity: (intensity: HapticIntensity) => void;
}

const HapticContext = createContext<HapticContextType | null>(null);

export const useHapticSettings = () => {
  const ctx = useContext(HapticContext);
  if (!ctx) throw new Error("useHapticSettings must be used within HapticProvider");
  return ctx;
};

export const HapticProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hapticIntensity, setHapticIntensityState] = useState<HapticIntensity>(() => 
    safeJSON.get("mylo_haptic_intensity", "light") as HapticIntensity
  );

  const setHapticIntensity = useCallback((intensity: HapticIntensity) => {
    setHapticIntensityState(intensity);
    safeJSON.set("mylo_haptic_intensity", intensity);
  }, []);

  return (
    <HapticContext.Provider value={{ hapticIntensity, setHapticIntensity }}>
      {children}
    </HapticContext.Provider>
  );
};
