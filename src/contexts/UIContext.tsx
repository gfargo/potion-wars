import React, { createContext, useContext, useState } from 'react';

type Screen = 'main-menu' | 'game' | 'game-over';

interface UIContextType {
  currentScreen: Screen;
  showHelp: boolean;
  quitConfirmation: boolean;
  setScreen: (screen: Screen) => void;
  toggleHelp: () => void;
  setQuitConfirmation: (value: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main-menu');
  const [showHelp, setShowHelp] = useState(false);
  const [quitConfirmation, setQuitConfirmation] = useState(false);

  const setScreen = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const toggleHelp = () => {
    setShowHelp((prev) => !prev);
  };

  return (
    <UIContext.Provider
      value={{
        currentScreen,
        showHelp,
        quitConfirmation,
        setScreen,
        toggleHelp,
        setQuitConfirmation,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
