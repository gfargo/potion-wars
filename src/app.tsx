import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'
import ActionMenu from './components/ActionMenu.js'
import InventoryDisplay from './components/InventoryDisplay.js'
import PriceList from './components/PriceList.js'
import { HELP_TEXT, drugs, locations } from './constants.js'
import { generatePrices } from './gameData.js'
import {
  GameState,
  buyDrug,
  isGameOver,
  repayDebt,
  sellDrug,
  travel,
} from './gameLogic.js'
import { GameOver } from './screens/GameOver.js'
import MainMenu from './screens/MainMenu.js'

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    cash: 2000,
    debt: 5500,
    health: 100,
    location: 'Bronx',
    inventory: {},
    prices: {},
  })
  const [message, setMessage] = useState(
    'Welcome to Drug Wars! Select an action to begin.'
  )
  const [currentScreen, setGameScreen] = useState<
    'main-menu' | 'game' | 'game-over'
  >('main-menu')
  const [showHelp, setShowHelp] = useState(false)
  const [quitConfirmation, setQuitConfirmation] = useState(false)

  useEffect(() => {
    setGameState((prevState) => ({ ...prevState, prices: generatePrices() }))
  }, [])

  useEffect(() => {
    if (isGameOver(gameState)) {
      setGameScreen('game-over')
      const finalScore = gameState.cash - gameState.debt
      setMessage(`Game Over! Final score: $${finalScore}`)
    }
  }, [gameState])

  useInput((input, _) => {
    if (quitConfirmation) {
      if (input.toLowerCase() === 'y') {
        process.exit()
      } else if (input.toLowerCase() === 'n') {
        handleQuitConfirmation(false)
      }
    }
  })

  const handleAction = (action: string, params?: any) => {
    if (quitConfirmation) {
      return
    }

    switch (action) {
      case 'buy':
        const [newBuyState, buyMessage] = buyDrug(
          gameState,
          params.drug,
          params.quantity
        )
        setGameState(newBuyState)
        setMessage(buyMessage)
        break
      case 'sell':
        const [newSellState, sellMessage] = sellDrug(
          gameState,
          params.drug,
          params.quantity
        )
        setGameState(newSellState)
        setMessage(sellMessage)
        break
      case 'travel':
        const [newTravelState, travelMessage] = travel(gameState, params)
        setGameState(newTravelState)
        setMessage(travelMessage)
        break
      case 'repay':
        const [newRepayState, repayMessage] = repayDebt(
          gameState,
          params.amount
        )
        setGameState(newRepayState)
        setMessage(repayMessage)
        break
      case 'toggleHelp':
        setShowHelp(!showHelp)
        break
      case 'startGame':
        setGameScreen('game')
        break
      case 'quit':
        setQuitConfirmation(true)
        setMessage('Are you sure you want to quit? (Y/N)')
        break
    }
  }

  const handleQuitConfirmation = (confirm: boolean) => {
    if (confirm) {
      process.exit()
    } else {
      setQuitConfirmation(false)
      setMessage('Quit cancelled.')
    }
  }

  if (currentScreen === 'game-over') {
    return <GameOver />
  }

  if (currentScreen === 'main-menu') {
    return (
      <>
        <MainMenu onAction={handleAction} showHelp={showHelp} />
        {quitConfirmation && (
          <Text>
            Are you sure you want to quit? (Y/N)
            <Text color="gray"> Press Y to confirm, N to cancel</Text>
          </Text>
        )}
      </>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Drug Wars</Text>
      <Text>
        Day: {gameState.day}/30 | Cash: ${gameState.cash} | Debt: $
        {gameState.debt} | Health: {gameState.health}%
      </Text>
      <Text>Location: {gameState.location}</Text>
      <Text>Message: {message}</Text>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        !quitConfirmation && (
          <>
            <InventoryDisplay inventory={gameState.inventory} />
            <PriceList prices={gameState.prices} />
            <ActionMenu
              onAction={handleAction}
              drugs={drugs.map((drug) => drug.name)}
              locations={locations}
            />
          </>
        )
      )}
    </Box>
  )
}
