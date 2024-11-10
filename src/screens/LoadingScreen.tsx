import { Box, Text, useInput } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect, useState } from 'react'
import { useGame } from '../contexts/GameContext.js'
import { TitleScreenAnimation } from './TitleScreen/TitleScreenAnimation.js'

export const LoadingScreen: React.FC<{ onFinish: () => void }> = ({
  onFinish,
}) => {
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
    <Box
      flexDirection="column"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Gradient name="pastel">
        <TitleScreenAnimation />
      </Gradient>
      <Box flexDirection="column" gap={1} alignItems="center" marginTop={1}>
        <Text>Day {gameState.day}</Text>
        <Text dimColor>Press Enter to skip ({timeLeft}s)</Text>
      </Box>
    </Box>
  )
}
