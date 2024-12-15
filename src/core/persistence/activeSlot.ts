import { SaveFileManager } from './utils.js'

export const getActiveSlot = (): number => {
  return SaveFileManager.getInstance().getActiveSlot()
}

export const setActiveSlot = (slot: number): void => {
  SaveFileManager.getInstance().setActiveSlot(slot)
}
