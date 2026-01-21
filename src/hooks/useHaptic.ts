import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useCallback } from "react";

export const useHaptic = () => {
  const isNative = Capacitor.isNativePlatform();

  const triggerLight = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerMedium = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerHeavy = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerSuccess = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerWarning = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerError = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  }, [isNative]);

  const triggerSelection = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionChanged();
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
