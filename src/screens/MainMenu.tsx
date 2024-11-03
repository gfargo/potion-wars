import React from 'react'
import { Box, Text, useInput } from 'ink'
import { TITLE_ART, HELP_TEXT } from '../constants.js'
import { useUI } from '../contexts/UIContext.js'
import { useGame } from '../contexts/GameContext.js'

const MainMenu: React.FC = () => {
  const { showHelp, toggleHelp, setScreen, setQuitConfirmation } = useUI()
  const { handleAction } = useGame()

  useInput((input, key) => {
    if (showHelp) {
      if (key.escape || input.toLowerCase() === 'h') {
        toggleHelp()
      }
    } else {
      switch (input.toLowerCase()) {
        case 'h':
          toggleHelp()
          break
        case 'q':
          setQuitConfirmation(true)
          break
        case 's':
          setScreen('game')
          handleAction('startGame')
          break
      }
    }
  })

  return (
    <Box flexDirection="column">
      <Text>{TITLE_ART}</Text>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        <Text>
          Press (S) to start game, (H) for help, (Q) to quit
        </Text>
      )}
    </Box>
  )
}

export default MainMenu
