import { Box, Text, useApp, useInput } from 'ink'
import Gradient from 'ink-gradient'
import React, { useMemo, useState } from 'react'
import { TITLE_ART } from '../../constants.js'
import { useGame } from '../../contexts/GameContext.js'
import { useUI } from '../../contexts/UIContext.js'
import { getSaveSlots } from '../../core/persistence/saveLoad.js'
import { EnhancedSelectInput } from '../../ui/components/common/index.js'

export function TitleScreenMenu() {
  const { toggleHelp, setScreen } = useUI()
  // eslint-disable-next-line react/hook-use-state
  const [displaySaveSlots, toggleSaveSlotDisplay] = useState<
    'load' | 'new' | false
  >(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const { handleAction, activeSlot } = useGame()
  const { exit } = useApp()

  const saveSlots = getSaveSlots()

  useInput((_, key) => {
    if (key.escape) {
      toggleSaveSlotDisplay(false)
      setConfirmOverwrite(false)
    }
  })

  const topLevelMenuItems = useMemo(() => {
    const defaultItems = [
      {
        label: 'New Game',
        value: 'newGame',
        hotkey: 'n',
      },
      {
        label: 'Load Game',
        value: 'load',
        hotkey: 'l',
      },
      {
        label: 'Help',
        value: 'help',
        hotkey: 'h',
      },
      {
        label: 'Quit',
        value: 'quit',
        hotkey: 'q',
      },
    ]

    if (activeSlot < 0) {
      return defaultItems
    }

    return [
      {
        label: 'Continue',
        value: 'continue',
        hotkey: 'c',
      },
      ...defaultItems,
    ]
  }, [activeSlot])

  return (
    <Box paddingX={2}>
      {confirmOverwrite ? (
        <Box flexDirection="column" gap={1} alignItems="center" marginTop={1}>
          <Text dimColor>
            Are you sure you want to overwrite the save slot?
          </Text>
          <EnhancedSelectInput
            items={[
              {
                label: 'No',
                value: 'no',
                hotkey: 'n',
              },
              {
                label: 'Yes',
                value: 'yes',
                hotkey: 'y',
              },
            ]}
            orientation="horizontal"
            onSelect={(item) => {
              console.log(item)

              const slotIndex = Number(item.value.replace('slot-', ''))
              if (item.value === 'yes') {
                setScreen('loading')
                handleAction('startGame', { slot: slotIndex })
              }

              setConfirmOverwrite(false)
            }}
          />
        </Box>
      ) : displaySaveSlots ? (
        <Box flexDirection="column" gap={1} alignItems="center" marginTop={1}>
          <Text dimColor>
            {displaySaveSlots === 'new'
              ? 'Choose a slot for your new adventure'
              : 'Select a saved game to continue'}
          </Text>
          <EnhancedSelectInput
            initialIndex={activeSlot < 0 ? 0 : activeSlot}
            indicatorComponent={({ isSelected, item }) =>
              isSelected && item.value === 'back' ? (
                <Text color="red">✘ </Text>
              ) : isSelected ? (
                <Text color={isSelected ? 'green' : 'gray'}>☛ </Text>
              ) : (
                <Text>{`  `}</Text>
              )
            }
            items={[
              ...saveSlots.map((slot, index) => {
                if (slot === null || slot === undefined) {
                  return {
                    label: 'Empty',
                    value: `slot-${index + 1}`,
                  }
                }

                return {
                  label: `Day ${slot.day} - ${slot.cash}g`,
                  value: `slot-${index + 1}`,
                }
              }),
              {
                label: 'Back',
                value: 'back',
                hotkey: 'esc',
              },
            ]}
            orientation="horizontal"
            onSelect={(item) => {
              if (item.value === 'back') {
                toggleSaveSlotDisplay(false)
                return
              }

              const slotIndex = Number(item.value.replace('slot-', ''))

              if (displaySaveSlots === 'new') {
                if (saveSlots[slotIndex] !== null) {
                  setConfirmOverwrite(true)
                  return
                }

                setScreen('loading')
                handleAction('startGame', { slot: slotIndex })
                return
              }

              setScreen('loading')
              handleAction('loadGame', { slot: slotIndex })
            }}
          />
        </Box>
      ) : (
        <Box flexDirection="column" justifyContent="center" alignItems="center">
          <Gradient name="pastel">
            <Text>{TITLE_ART}</Text>
          </Gradient>
          <EnhancedSelectInput
            items={topLevelMenuItems}
            indicatorComponent={({ isSelected, item }) =>
              isSelected && item.value === 'quit' ? (
                <Text color="red">✘ </Text>
              ) : isSelected ? (
                <Text color={isSelected ? 'green' : 'gray'}>☛ </Text>
              ) : (
                <Text>{`  `}</Text>
              )
            }
            orientation="horizontal"
            onSelect={(item) => {
              if (item.value === 'help') {
                toggleHelp()
                return
              }

              if (item.value === 'quit') {
                exit()
                return
              }

              if (item.value === 'load') {
                toggleSaveSlotDisplay('load')
                return
              }

              if (item.value === 'newGame') {
                toggleSaveSlotDisplay('new')
                return
              }

              if (item.value === 'continue') {
                setScreen('loading')
                handleAction('loadGame', { slot: activeSlot })
              }
            }}
          />
        </Box>
      )}
    </Box>
  )
}
