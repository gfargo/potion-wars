import { Box, Text, useInput } from 'ink'
import Gradient from 'ink-gradient'
import React from 'react'
import { HELP_TEXT, TITLE_ART } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useUI } from '../contexts/UIContext.js'

function MainMenu() {
  const { showHelp, toggleHelp, setScreen, setQuitConfirmation } = useUI()
  const { handleAction } = useGame()

  useInput((input, key) => {
    if (showHelp) {
      if (key.escape || input.toLowerCase() === 'h') {
        toggleHelp()
      }
    } else {
      switch (input.toLowerCase()) {
        case 'h': {
          toggleHelp()
          break
        }

        case 'q': {
          setQuitConfirmation(true)
          break
        }

        case 's': {
          setScreen('game')
          handleAction('startGame')
          break
        }

        default: {
          break
        }
      }
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
        <Text>{TITLE_ART}</Text>
      </Gradient>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        <Text>Press (S) to start game, (H) for help, (Q) to quit</Text>
      )}
    </Box>
  )
}

export default MainMenu

