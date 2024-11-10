import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { useInput } from 'ink'
import { useGame } from '../contexts/GameContext.js'

const TravelingScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(4)
  const { gameState } = useGame()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (timeLeft === 0) {
      onFinish()
    }
  }, [timeLeft, onFinish])

  useInput((input) => {
    if (input === '\r') {
      onFinish()
    }
  })

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Text>Day {gameState.day}</Text>
      <Text>Traveling to {gameState.location.name}</Text>
      <Text>Press Enter to skip ({timeLeft}s)</Text>
    </Box>
  )
}

export default TravelingScreen
