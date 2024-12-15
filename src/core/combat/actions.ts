import { type GameState } from '../../types/game.types.js'

export const calculateDamage = (
  attacker: { strength: number; agility: number },
  defender: { agility: number }
) => {
  const baseDamage = attacker.strength
  const hitChance = 0.5 + (attacker.agility - defender.agility) * 0.05
  return Math.random() < hitChance ? baseDamage : 0
}

export const activatePotionInCombat = (
  state: GameState,
  potionName: string
): [GameState, string] => {
  if (!state.inventory[potionName] || state.inventory[potionName] <= 0) {
    return [state, `You don't have any ${potionName} to use!`]
  }

  const newState = { ...state }
  let message = ''

  switch (potionName) {
    case 'Health Potion': {
      newState.health = Math.min(100, newState.health + 30)
      message = 'You used a Health Potion and restored 30 health!'
      break
    }

    case 'Strength Potion': {
      newState.strength += 5
      message =
        'You used a Strength Potion and gained 5 strength for this battle!'
      break
    }

    case 'Agility Potion': {
      newState.agility += 5
      message =
        'You used an Agility Potion and gained 5 agility for this battle!'
      break
    }

    default: {
      return [state, `${potionName} cannot be used in combat!`]
    }
  }

  newState.inventory = {
    ...newState.inventory,
    [potionName]: (newState.inventory[potionName] ?? 0) - 1,
  }

  return [newState, message]
}
