import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'
import CommandPrompt from './components/CommandPrompt.js'
import InventoryDisplay from './components/InventoryDisplay.js'
import PriceList from './components/PriceList.js'
import { HELP_TEXT, TITLE_ART, drugs, locations } from './constants.js'
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
    'Welcome to Drug Wars! Type (H) for help.'
  )
  const [inputMode, setInputMode] = useState<
    'main' | 'buy' | 'sell' | 'travel' | 'repay'
  >('main')
  const [inputBuffer, setInputBuffer] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    setGameState((prevState) => ({ ...prevState, prices: generatePrices() }))
  }, [])

  useEffect(() => {
    if (isGameOver(gameState)) {
      setGameOver(true)
      const finalScore = gameState.cash - gameState.debt
      setMessage(`Game Over! Final score: $${finalScore}`)
    }
  }, [gameState])

  const handleBuyDrug = (drugName: string, quantity: number) => {
    const [newState, message] = buyDrug(gameState, drugName, quantity)
    setGameState(newState)
    setMessage(message)
  }

  const handleSellDrug = (drugName: string, quantity: number) => {
    const [newState, message] = sellDrug(gameState, drugName, quantity)
    setGameState(newState)
    setMessage(message)
  }

  const handleTravel = (newLocation: string) => {
    const [newState, message] = travel(gameState, newLocation)
    setGameState(newState)
    setMessage(message)
  }

  const handleRepayDebt = (amount: number) => {
    const [newState, message] = repayDebt(gameState, amount)
    setGameState(newState)
    setMessage(message)
  }

  useInput((input, key) => {
    if (gameOver) {
      if (input === 'q') {
        process.exit()
      }
      return
    }

    if (inputMode === 'main') {
      if (input === 'b') {
        setInputMode('buy')
        setMessage('Enter drug name and quantity to buy (e.g., "Cocaine 5"):')
      } else if (input === 's') {
        setInputMode('sell')
        setMessage('Enter drug name and quantity to sell (e.g., "Cocaine 5"):')
      } else if (input === 't') {
        setInputMode('travel')
        setMessage(`Enter location to travel (${locations.join(', ')}):`)
      } else if (input === 'r') {
        setInputMode('repay')
        setMessage('Enter amount to repay:')
      } else if (input === 'h') {
        setShowHelp(!showHelp)
      } else if (input === 'q') {
        setMessage('Thanks for playing!')
        process.exit()
      }
    } else {
      if (key.return) {
        handleCommand(inputMode, inputBuffer)
        setInputBuffer('')
        setInputMode('main')
      } else if (key.backspace || key.delete) {
        setInputBuffer(inputBuffer.slice(0, -1))
      } else {
        setInputBuffer(inputBuffer + input)
      }
    }
  })

  const handleCommand = (mode: string, input: string) => {
    const [command, ...args] = input.split(' ')

    switch (mode) {
      case 'buy':
        if (
          command &&
          drugs.some(
            (drug) => drug.name.toLowerCase() === command.toLowerCase()
          )
        ) {
          const quantity = args[0] ? parseInt(args[0]) : 1
          handleBuyDrug(command, quantity)
        } else {
          setMessage('Invalid drug name')
        }
        break
      case 'sell':
        if (
          command &&
          drugs.some(
            (drug) => drug.name.toLowerCase() === command.toLowerCase()
          )
        ) {
          const quantity = args[0] ? parseInt(args[0]) : 1
          handleSellDrug(command, quantity)
        } else {
          setMessage('Invalid drug name')
        }
        break
      case 'travel':
        if (
          command &&
          locations.some((loc) => loc.toLowerCase() === command.toLowerCase())
        ) {
          handleTravel(command)
        } else {
          setMessage('Invalid location')
        }
        break
      case 'repay':
        const amount = command ? parseInt(command) : NaN
        if (isNaN(amount) || amount <= 0) {
          setMessage('Invalid amount')
        } else {
          handleRepayDebt(amount)
        }
        break
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text>{TITLE_ART}</Text>
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
        <>
          <InventoryDisplay inventory={gameState.inventory} />
          <PriceList prices={gameState.prices} />
          <CommandPrompt inputBuffer={inputBuffer} />
        </>
      )}
      <Text bold>
        Commands: (B)uy, (S)ell, (T)ravel, (R)epay, (H)elp, (Q)uit
      </Text>
      {gameOver && <GameOver />}
    </Box>
  )
}
