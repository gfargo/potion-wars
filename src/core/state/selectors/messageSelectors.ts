import {
  type Message,
  type MessageType,
} from '../../../contexts/MessageContext.js'

export const selectMessageColor = (type: MessageType): string => {
  switch (type) {
    case 'combat': {
      return 'red'
    }

    case 'sale': {
      return 'green'
    }

    case 'purchase': {
      return 'yellow'
    }

    case 'random_event': {
      return 'magenta'
    }

    case 'info': {
      return 'white'
    }
  }
}

export const selectVisibleMessages = (
  messages: Message[],
  currentIndex: number,
  maxHistory: number
): Message[] => messages.slice(currentIndex, currentIndex + maxHistory)

export const selectMessageNavigation = (
  messages: Message[],
  currentIndex: number,
  maxHistory: number
) => ({
  canScrollUp: currentIndex > 0,
  canScrollDown: currentIndex < messages.length - maxHistory,
  startIndex: currentIndex + 1,
  endIndex: Math.min(currentIndex + maxHistory, messages.length),
  total: messages.length,
  hasMoreMessages: messages.length > maxHistory,
})
