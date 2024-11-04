import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

function InventoryDisplay() {
  const { gameState } = useGame()
  const inventoryEntries = Object.entries(gameState.inventory)

  return (
    <Box
      borderDimColor
      flexDirection="column"
      paddingX={1}
      borderStyle="singleDouble"
      minWidth={16}
    >
      <Text bold italic>
        Potion Inventory:
      </Text>
      {inventoryEntries.length > 0 ? (
        inventoryEntries.map(([potion, quantity]) => (
          <Text key={potion}>
            {potion}: {quantity}
          </Text>
        ))
      ) : (
        <Text dimColor>Empty</Text>
      )}
    </Box>
  )
}

export default InventoryDisplay

