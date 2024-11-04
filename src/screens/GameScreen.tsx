import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React from 'react'
import ActionMenu from '../components/ActionMenu.js'
import Day from '../components/Day.js'
import InventoryDisplay from '../components/InventoryDisplay.js'
import Location from '../components/Location.js'
import Message from '../components/Message.js'
import PlayerStatus from '../components/PlayerStatus.js'
import PriceList from '../components/PriceList.js'
import Weather from '../components/Weather.js'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useUI } from '../contexts/UIContext.js'
import { useGame } from '../contexts/GameContext.js'

function GameScreen() {
  const { showHelp, quitConfirmation } = useUI()
  const { gameState, handleEventChoice } = useGame()

  return (
    <Box flexDirection="column" height="100%">
      <Box
        marginTop={1}
        alignItems="center"
        width="100%"
        justifyContent="space-between"
      >
        <Box alignItems="center">
          <Box marginRight={3}>
            <Gradient name="pastel">
              <Text bold dimColor>
                Potion Wars
              </Text>
            </Gradient>
          </Box>
          <Day />
          <PlayerStatus />
          <Weather />
        </Box>
      </Box>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        !quitConfirmation && (
          <>
            <Box flexDirection="column">
              <Box>
                <InventoryDisplay />
                <PriceList />
                <Location />
              </Box>
              <Message />
            </Box>
            <Box flexDirection="column" justifyContent="flex-end" minHeight={9}>
              <Box>
                <ActionMenu
                  potions={potions.map((potion) => potion.name)}
                  locations={locations}
                />
              </Box>
            </Box>
          </>
        )
      )}
    </Box>
  )
}

export default GameScreen
