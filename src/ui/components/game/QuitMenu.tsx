import { Box, Text, useInput } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import { useUI } from '../../../contexts/UIContext.js'
import { EnhancedSelectInput } from '../common/index.js'

function QuitMenu() {
  const { handleAction } = useGame()
  const { setQuitConfirmation } = useUI()

  useInput((_, key) => {
    if (key.escape) {
      setQuitConfirmation(false)
    }
  })

  return (
    <Box flexDirection="column" alignItems="center">
      <Text bold color="red">
        Are you sure you want to quit?
      </Text>
      <Box marginY={1}>
        <EnhancedSelectInput
          items={[
            { label: 'No', value: 'no', hotkey: 'n' },
            { label: 'Yes', value: 'yes', hotkey: 'y' },
          ]}
          orientation="horizontal"
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? 'red' : 'gray'}>
              {isSelected ? '✘ ' : '  '}
            </Text>
          )}
          onSelect={({ value }) => {
            if (value === 'yes') {
              handleAction('quit')
            } else {
              setQuitConfirmation(false)
            }
          }}
        />
      </Box>
      <Text dimColor>Press &quot;esc&quot; to cancel</Text>
    </Box>
  )
}

export default QuitMenu
