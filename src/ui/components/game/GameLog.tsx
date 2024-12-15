import { Box, Text, useInput } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'
import { useMessage } from '../../../contexts/MessageContext.js'
import {
  selectMessageColor,
  selectMessageNavigation,
  selectVisibleMessages,
} from '../../../core/state/selectors/messageSelectors.js'

const MAX_HISTORY = 6

function GameLog() {
  const { messages } = useMessage()
  const [currentIndex, setCurrentIndex] = useState(0)

  useInput((input) => {
    const { canScrollUp, canScrollDown } = selectMessageNavigation(
      messages,
      currentIndex,
      MAX_HISTORY
    )
    if (input === ',' && canScrollUp) {
      setCurrentIndex(currentIndex - 1)
    } else if (input === '.' && canScrollDown) {
      setCurrentIndex(currentIndex + 1)
    }
  })

  useEffect(() => {
    setCurrentIndex(Math.max(0, messages.length - MAX_HISTORY))
  }, [messages.length])

  const visibleMessages = selectVisibleMessages(
    messages,
    currentIndex,
    MAX_HISTORY
  )
  const navigation = selectMessageNavigation(
    messages,
    currentIndex,
    MAX_HISTORY
  )

  const displayMessages = useMemo(
    () =>
      visibleMessages.map((message, index) => (
        <Box key={`${message.timestamp}_index_${index}`}>
          <Text
            dimColor
            color={selectMessageColor(message.type)}
            bold={index === MAX_HISTORY - 1}
          >
            [{new Date(message.timestamp).toLocaleTimeString()}]{' '}
          </Text>
          <Text color={selectMessageColor(message.type)}>
            {message.content}
          </Text>
        </Box>
      )),
    [visibleMessages]
  )

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" height={6} overflow="hidden">
        {displayMessages}
      </Box>

      {navigation.hasMoreMessages && (
        <Text dimColor italic>
          Use &apos;,&apos; to scroll back up and &apos;.&apos; to scroll down (
          {navigation.startIndex}-{navigation.endIndex} of {navigation.total})
        </Text>
      )}
    </Box>
  )
}

export default GameLog
