import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'
import { useGame } from '../contexts/GameContext.js'

type TravelingScreenProperties = { readonly onFinish: () => void }

export function TravelingScreen({ onFinish }: TravelingScreenProperties) {
  const [timeLeft, setTimeLeft] = useState(4)
  const { gameState } = useGame()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1)
    }, 1000)

    return () => {
      clearInterval(timer)
    }
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
