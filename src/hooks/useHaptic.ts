import { useCallback, useMemo } from "react";

// Lazy import Capacitor to avoid bundling issues
const getCapacitor = () => {
  try {
    // Dynamic check to avoid breaking when Capacitor is not available
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      return (window as any).Capacitor;
    }
    return null;
  } catch {
    return null;
  }
};

const getHaptics = async () => {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
};

export const useHaptic = () => {
  const isNative = useMemo(() => {
    const cap = getCapacitor();
    return cap?.isNativePlatform?.() ?? false;
  }, []);

  const triggerLight = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.impact({ style: 'Light' as any });
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerMedium = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.impact({ style: 'Medium' as any });
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerHeavy = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.impact({ style: 'Heavy' as any });
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerSuccess = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.notification({ type: 'SUCCESS' as any });
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerWarning = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.notification({ type: 'WARNING' as any });
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerError = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.notification({ type: 'ERROR' as any });
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerSelection = useCallback(async () => {
    if (!isNative) return;
    try {
      const Haptics = await getHaptics();
      if (Haptics) {
        await Haptics.selectionChanged();
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  return {
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSuccess,
    triggerWarning,
    triggerError,
    triggerSelection,
    isNative,
  };
};
