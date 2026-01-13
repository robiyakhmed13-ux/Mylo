import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Wallet, AlertCircle, MessageCircle } from 'lucide-react';
import { getTelegramInitData, getTelegramUser, hasTelegramAuth, initTelegramWebApp } from '@/lib/telegram';
import { supabase } from '@/integrations/supabase/client';

interface TelegramAuthScreenProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

export const TelegramAuthScreen: React.FC<TelegramAuthScreenProps> = ({
  onAuthSuccess,
  onAuthError
}) => {
  const [status, setStatus] = useState<'authenticating' | 'error' | 'not-telegram'>('authenticating');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Initialize Telegram WebApp
    initTelegramWebApp();
    
    // Check if we have valid Telegram auth data
    if (!hasTelegramAuth()) {
      setStatus('not-telegram');
      return;
    }

    authenticateWithTelegram();
  }, []);

  const authenticateWithTelegram = async () => {
    try {
      const initData = getTelegramInitData();
      const telegramUser = getTelegramUser();

      if (!initData || !telegramUser) {
        throw new Error('Missing Telegram authentication data');
      }

      // Call edge function to verify and authenticate
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { initData }
      });

      if (error) {
        throw new Error(error.message || 'Authentication failed');
      }

      if (!data?.session) {
        throw new Error('No session returned from authentication');
      }

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      if (sessionError) {
        throw sessionError;
      }

      // Success!
      onAuthSuccess();
    } catch (err: any) {
      console.error('Telegram auth error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
      onAuthError(err.message);
    }
  };

  const retryAuth = () => {
    setStatus('authenticating');
    setErrorMessage('');
    authenticateWithTelegram();
  };

  // Not in Telegram environment
  if (status === 'not-telegram') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-3xl bg-[#0088cc] flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Open in Telegram
          </h1>
          
          <p className="text-muted-foreground mb-8">
            This app is designed to work inside Telegram. Please open it from the Telegram Mini App.
          </p>

          <a
            href="https://t.me/hamyon_uz_aibot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0088cc] text-white font-medium hover:bg-[#0088cc]/90 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Open Telegram Bot
          </a>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Authentication Failed
          </h1>
          
          <p className="text-muted-foreground mb-6">
            {errorMessage || 'Something went wrong. Please try again.'}
          </p>

          <button
            onClick={retryAuth}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Authenticating state
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Wallet className="w-10 h-10 text-primary-foreground" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">MonEX</h1>
        <p className="text-muted-foreground mb-8">Authenticating with Telegram...</p>
        
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 mx-auto"
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TelegramAuthScreen;
