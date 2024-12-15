import { type Message } from '../../contexts/MessageContext.js'
import { SaveFileManager, SaveFileType } from './utils.js'

const isValidMessage = (message: any): message is Message => {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'number'
  )
}

const isValidMessageArray = (data: any): data is Message[] => {
  return Array.isArray(data) && data.every((message) => isValidMessage(message))
}

export const initializeMessageLog = (slot: number) => {
  SaveFileManager.getInstance().writeSaveFile(slot, SaveFileType.GAME_LOG, [])
}

export const clearMessageLog = (slot: number) => {
  SaveFileManager.getInstance().writeSaveFile(slot, SaveFileType.GAME_LOG, [])
}

export const saveMessages = (messages: Message[], slot: number) => {
  SaveFileManager.getInstance().writeSaveFile(
    slot,
    SaveFileType.GAME_LOG,
    messages
  )
}

export const loadMessages = (slot: number): Message[] => {
  return (
    SaveFileManager.getInstance().readSaveFile<Message[]>(
      slot,
      SaveFileType.GAME_LOG,
      {
        createIfNotExists: true,
        defaultValue: [],
        validator: isValidMessageArray,
      }
    ) ?? []
  )
}
