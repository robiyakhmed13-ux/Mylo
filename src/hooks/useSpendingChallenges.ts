import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { safeJSON } from "@/lib/storage";

export interface Challenge {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetDays: number;
  completedDays: string[];
  failedDays: string[];
  category?: string;
  isActive: boolean;
}

// Local storage key for offline/guest users
const LOCAL_STORAGE_KEY = "mylo_spending_challenges";

export const useSpendingChallenges = () => {
  const { user, isAuthenticated } = useApp();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load challenges from local storage (for offline/guest support)
  const loadFromLocal = useCallback(() => {
    const saved = safeJSON.get(LOCAL_STORAGE_KEY, []) as Challenge[];
    return saved;
  }, []);

  // Save challenges to local storage
  const saveToLocal = useCallback((data: Challenge[]) => {
    safeJSON.set(LOCAL_STORAGE_KEY, data);
  }, []);

  // Load challenges from Supabase
  const loadFromServer = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('spending_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading challenges from server:', error);
        return null;
      }

      return data?.map((c: any) => ({
        id: c.id,
        name: c.name,
        startDate: c.start_date,
        endDate: c.end_date,
        targetDays: c.target_days,
        completedDays: c.completed_days || [],
        failedDays: c.failed_days || [],
        category: c.category,
        isActive: c.is_active,
      })) || [];
    } catch (e) {
      console.error('Error loading challenges:', e);
      return null;
    }
  }, [isAuthenticated, user?.id]);

  // Save a single challenge to Supabase
  const saveToServer = useCallback(async (challenge: Challenge) => {
    if (!isAuthenticated || !user?.id) return false;

    try {
      const { error } = await (supabase as any)
        .from('spending_challenges')
        .upsert({
          id: challenge.id,
          user_id: user.id,
          name: challenge.name,
          start_date: challenge.startDate,
          end_date: challenge.endDate,
          target_days: challenge.targetDays,
          completed_days: challenge.completedDays,
          failed_days: challenge.failedDays,
          category: challenge.category,
          is_active: challenge.isActive,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error saving challenge to server:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error saving challenge:', e);
      return false;
    }
  }, [isAuthenticated, user?.id]);

  // Delete a challenge from Supabase
  const deleteFromServer = useCallback(async (challengeId: string) => {
    if (!isAuthenticated || !user?.id) return false;

    try {
      const { error } = await supabase
        .from('spending_challenges')
        .delete()
        .eq('id', challengeId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting challenge from server:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error deleting challenge:', e);
      return false;
    }
  }, [isAuthenticated, user?.id]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      
      if (isAuthenticated && user?.id) {
        // Try to load from server first
        const serverData = await loadFromServer();
        
        if (serverData !== null) {
          setChallenges(serverData);
          saveToLocal(serverData); // Cache locally
        } else {
          // Fall back to local storage
          const localData = loadFromLocal();
          setChallenges(localData);
        }
      } else {
        // Not authenticated, use local storage
        const localData = loadFromLocal();
        setChallenges(localData);
      }
      
      setIsLoading(false);
    };

    load();
  }, [isAuthenticated, user?.id, loadFromServer, loadFromLocal, saveToLocal]);

  // Sync local data to server when user logs in
  useEffect(() => {
    const syncToServer = async () => {
      if (!isAuthenticated || !user?.id) return;
      
      const localData = loadFromLocal();
      if (localData.length === 0) return;

      setIsSyncing(true);
      
      // Sync each local challenge to server
      for (const challenge of localData) {
        await saveToServer(challenge);
      }
      
      // Reload from server to get merged data
      const serverData = await loadFromServer();
      if (serverData !== null) {
        setChallenges(serverData);
        saveToLocal(serverData);
      }
      
      setIsSyncing(false);
    };

    syncToServer();
  }, [isAuthenticated, user?.id, loadFromLocal, loadFromServer, saveToLocal, saveToServer]);

  // Add a new challenge
  const addChallenge = useCallback(async (challenge: Omit<Challenge, 'id'>) => {
    const newChallenge: Challenge = {
      ...challenge,
      id: crypto.randomUUID(),
    };

    // Deactivate existing active challenges
    const updated = challenges.map(c => ({ ...c, isActive: false }));
    const newChallenges = [...updated, newChallenge];
    
    setChallenges(newChallenges);
    saveToLocal(newChallenges);

    // Save to server
    if (isAuthenticated && user?.id) {
      // Update existing challenges to inactive
      for (const c of updated) {
        if (c.isActive === false) {
          await saveToServer(c);
        }
      }
      // Save new challenge
      await saveToServer(newChallenge);
    }

    return newChallenge;
  }, [challenges, isAuthenticated, user?.id, saveToLocal, saveToServer]);

  // Update a challenge
  const updateChallenge = useCallback(async (id: string, updates: Partial<Challenge>) => {
    const updated = challenges.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    
    setChallenges(updated);
    saveToLocal(updated);

    // Save to server
    if (isAuthenticated && user?.id) {
      const challenge = updated.find(c => c.id === id);
      if (challenge) {
        await saveToServer(challenge);
      }
    }
  }, [challenges, isAuthenticated, user?.id, saveToLocal, saveToServer]);

  // Delete a challenge
  const deleteChallenge = useCallback(async (id: string) => {
    const filtered = challenges.filter(c => c.id !== id);
    
    setChallenges(filtered);
    saveToLocal(filtered);

    // Delete from server
    if (isAuthenticated && user?.id) {
      await deleteFromServer(id);
    }
  }, [challenges, isAuthenticated, user?.id, saveToLocal, deleteFromServer]);

  // Mark a day as completed or failed
  const markDay = useCallback(async (challengeId: string, date: string, success: boolean) => {
    const updated = challenges.map(c => {
      if (c.id !== challengeId) return c;
      
      if (success) {
        return {
          ...c,
          completedDays: [...c.completedDays, date],
          failedDays: c.failedDays.filter(d => d !== date),
        };
      } else {
        return {
          ...c,
          failedDays: [...c.failedDays, date],
          completedDays: c.completedDays.filter(d => d !== date),
        };
      }
    });
    
    setChallenges(updated);
    saveToLocal(updated);

    // Save to server
    if (isAuthenticated && user?.id) {
      const challenge = updated.find(c => c.id === challengeId);
      if (challenge) {
        await saveToServer(challenge);
      }
    }
  }, [challenges, isAuthenticated, user?.id, saveToLocal, saveToServer]);

  // Get active challenge
  const activeChallenge = challenges.find(c => c.isActive);
  
  // Get completed challenges
  const completedChallenges = challenges.filter(c => !c.isActive && c.completedDays.length > 0);

  return {
    challenges,
    activeChallenge,
    completedChallenges,
    isLoading,
    isSyncing,
    addChallenge,
    updateChallenge,
    deleteChallenge,
    markDay,
  };
};
