import { Box, Text } from 'ink'
import React from 'react'
import ActionMenu from '../components/ActionMenu.js'
import InventoryDisplay from '../components/InventoryDisplay.js'
import PriceList from '../components/PriceList.js'
import { HELP_TEXT, drugs, locations } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useUI } from '../contexts/UIContext.js'

const GameScreen: React.FC = () => {
  const { showHelp, quitConfirmation } = useUI()
  const { gameState, message } = useGame()

  return (
    <Box flexDirection="column">
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
            <InventoryDisplay />
            <PriceList />
            <ActionMenu
              drugs={drugs.map((drug) => drug.name)}
              locations={locations}
            />
          </>
        )
      )}
    </Box>
  )
}

export default GameScreen
