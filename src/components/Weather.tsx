import React from 'react'
import { Text } from 'ink'
import { useGame } from '../contexts/GameContext.js'

const Weather: React.FC = () => {
  const { gameState } = useGame()

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny':
        return '☀️'
      case 'rainy':
        return '🌧️'
      case 'stormy':
        return '⛈️'
      case 'windy':
        return '💨'
      case 'foggy':
        return '🌫️'
      default:
        return '❓'
    }
  }

  return (
    <Text>
      Weather: {getWeatherIcon(gameState.weather)} {gameState.weather}
    </Text>
  )
}

export default Weather
