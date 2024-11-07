import { Box, Text, useApp, useInput } from 'ink'
import Gradient from 'ink-gradient'
import { default as React } from 'react'
import EnhancedSelectInput from '../../components/EnhancedSelectInput.js'
import { HELP_TEXT, TITLE_ART } from '../../constants.js'
import { useGame } from '../../contexts/GameContext.js'
import { useUI } from '../../contexts/UIContext.js'
import { TitleScreenAnimation } from './TitleScreenAnimation.js'

function TitleScreen() {
  const { showHelp, toggleHelp, setScreen } = useUI()
  const { handleAction } = useGame()
  const { exit } = useApp()

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
          exit()
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
        <TitleScreenAnimation />
      </Gradient>
      {showHelp ? (
                  <>

          <Text>{HELP_TEXT}</Text>
        </>
      ) : (
        <>
          <Gradient name="pastel">
            <Text>{TITLE_ART}</Text>
          </Gradient>
          <EnhancedSelectInput
            items={[
              {
                label: 'Start Game',
                value: 'startGame',
              },
              {
                label: 'Help',
                value: 'help',
              },
              {
                label: 'Quit',
                value: 'quit',
              },
            ]}
            onSelect={(item) => {
              if (item.value === 'help') {
                toggleHelp()
                return
              }

              handleAction(item.value)
            }}
            orientation="horizontal"
          />
        </>
      )}
    </Box>
  )
}

export default TitleScreen
