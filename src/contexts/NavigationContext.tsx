
'use client';
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface NavigationContextType {
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSetIsNavigating = useCallback((navigating: boolean) => {
    setIsNavigating(navigating);
  }, []);

  return (
    <NavigationContext.Provider value={{ isNavigating, setIsNavigating: handleSetIsNavigating }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
