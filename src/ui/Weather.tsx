import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const Weather: React.FC = () => {
  const { gameState } = useGame()

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny':
        return '☀️'
      case 'rainy':
        return '🌧️ '
      case 'stormy':
        return '⛈️ '
      case 'windy':
        return '💨'
      case 'foggy':
        return '🌁'
      default:
        return '❓'
    }
  }

  return (
    <Box width={9}>
      <Text
        color={
          gameState.weather === 'sunny'
            ? 'yellow'
            : gameState.weather === 'rainy'
            ? 'blue'
            : gameState.weather === 'stormy'
            ? 'grey'
            : gameState.weather === 'windy'
            ? 'cyan'
            : gameState.weather === 'foggy'
            ? 'grey'
            : 'white'
        }
      >
        {getWeatherIcon(gameState.weather)}
        {` `}
        {gameState.weather}
      </Text>
    </Box>
  )
}

export default Weather
