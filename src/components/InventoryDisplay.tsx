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
