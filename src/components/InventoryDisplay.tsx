import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const InventoryDisplay: React.FC = () => {
  const { gameState } = useGame()
  const inventoryEntries = Object.entries(gameState.inventory)

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="singleDouble" borderDimColor minWidth={16}>
      <Text bold italic>
        Inventory:
      </Text>
      {inventoryEntries.length > 0 ? (
        inventoryEntries.map(([drug, quantity]) => (
          <Text key={drug}>
            {drug}: {quantity}
          </Text>
        ))
      ) : (
        <Text dimColor>Empty</Text>
      )}
    </Box>
  )
}

export default InventoryDisplay
