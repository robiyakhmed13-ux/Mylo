import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TelegramAuthScreen } from '@/components/TelegramAuthScreen';

const TelegramAuth: React.FC = () => {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    // Navigate to main app after successful auth
    navigate('/', { replace: true });
  };

  const handleAuthError = (error: string) => {
    console.error('Telegram auth error:', error);
    // Error is handled within TelegramAuthScreen component
  };

  return (
    <TelegramAuthScreen 
      onAuthSuccess={handleAuthSuccess}
      onAuthError={handleAuthError}
    />
  );
};

export default TelegramAuth;
