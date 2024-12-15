import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getActiveSlot } from '../core/persistence/activeSlot.js'
import {
  clearMessageLog,
  loadMessages,
  saveMessages,
} from '../core/persistence/messageStorage.js'

export type MessageType =
  | 'combat'
  | 'sale'
  | 'purchase'
  | 'random_event'
  | 'info'

export type Message = {
  type: MessageType
  content: string
  timestamp: number
}

type MessageContextType = {
  messages: Message[]
  addMessage: (type: MessageType, content: string) => void
  clearMessages: () => void
}

const MessageContext = createContext<MessageContextType | undefined>(undefined)

type MessageProviderProperties = {
  readonly children: React.ReactNode
  readonly initialMessages?: Message[]
}

export function MessageProvider({
  children,
  initialMessages = [],
}: MessageProviderProperties) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const activeSlot = getActiveSlot()

  // Load messages when component mounts or active slot changes
  useEffect(() => {
    if (activeSlot >= 0 && initialMessages.length === 0) {
      const loadedMessages = loadMessages(activeSlot)
      setMessages(loadedMessages)
    }
  }, [activeSlot, initialMessages.length])

  // Save messages whenever they change
  useEffect(() => {
    if (activeSlot >= 0) {
      saveMessages(messages, activeSlot)
    }
  }, [messages, activeSlot])

  const addMessage = useCallback((type: MessageType, content: string) => {
    setMessages((previousMessages) => [
      ...previousMessages,
      { type, content, timestamp: Date.now() },
    ])
  }, [])

  const clearMessages = useCallback(() => {
    if (activeSlot >= 0) {
      clearMessageLog(activeSlot)
    }

    setMessages([])
  }, [activeSlot])

  const contextValue = useMemo(
    () => ({ messages, addMessage, clearMessages }),
    [messages, addMessage, clearMessages]
  )

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  )
}

export const useMessage = () => {
  const context = useContext(MessageContext)
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageProvider')
  }

  return context
}
