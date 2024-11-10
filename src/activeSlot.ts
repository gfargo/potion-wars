import fs from 'fs'
import path from 'path'
import { getSaveDirectory } from './saveLoad.js'

const ACTIVE_SLOT_FILE = path.join(getSaveDirectory(), 'activeSlot.json')

export const getActiveSlot = (): number => {
  if (fs.existsSync(ACTIVE_SLOT_FILE)) {
    const data = JSON.parse(fs.readFileSync(ACTIVE_SLOT_FILE, 'utf-8'))
    return data.activeSlot
  }
  return -1 // Default to first slot if file doesn't exist
}

export const setActiveSlot = (slot: number): void => {
  fs.writeFileSync(ACTIVE_SLOT_FILE, JSON.stringify({ activeSlot: slot }))
}
