import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import { selectWeatherUI } from '../../../core/state/index.js'

function Weather() {
  const { gameState } = useGame()
  const { icon, color, text } = selectWeatherUI(gameState)

  return (
    <Box width={9}>
      <Text color={color}>
        {icon}
        {` `}
        {text}
      </Text>
    </Box>
  )
}

export default Weather
