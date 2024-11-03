import React, { createContext, useContext, useState, useEffect } from 'react';
import { generatePrices } from '../gameData.js';
import {
  GameState,
  buyDrug,
  isGameOver,
  repayDebt,
  sellDrug,
  travel,
} from '../gameLogic.js';

interface GameContextType {
  gameState: GameState;
  message: string;
  handleAction: (action: string, params?: any) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    cash: 2000,
    debt: 5500,
    health: 100,
    location: 'Bronx',
    inventory: {},
    prices: {},
  });

  const [message, setMessage] = useState('Welcome to Drug Wars! Select an action to begin.');

  useEffect(() => {
    setGameState((prevState) => ({ ...prevState, prices: generatePrices() }));
  }, []);

  const handleAction = (action: string, params?: any) => {
    switch (action) {
      case 'buy':
        const [newBuyState, buyMessage] = buyDrug(gameState, params.drug, params.quantity);
        setGameState(newBuyState);
        setMessage(buyMessage);
        break;
      case 'sell':
        const [newSellState, sellMessage] = sellDrug(gameState, params.drug, params.quantity);
        setGameState(newSellState);
        setMessage(sellMessage);
        break;
      case 'travel':
        const [newTravelState, travelMessage] = travel(gameState, params);
        setGameState(newTravelState);
        setMessage(travelMessage);
        break;
      case 'repay':
        const [newRepayState, repayMessage] = repayDebt(gameState, params.amount);
        setGameState(newRepayState);
        setMessage(repayMessage);
        break;
      default:
        setMessage('Invalid action');
    }

    if (isGameOver(gameState)) {
      const finalScore = gameState.cash - gameState.debt;
      setMessage(`Game Over! Final score: $${finalScore}`);
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        message,
        handleAction,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
