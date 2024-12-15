import {
  type CombatAction,
  type CombatResult,
} from '../../types/combat.types.js'
import { type GameState } from '../../types/game.types.js'
import { activatePotionInCombat, calculateDamage } from './actions.js'
import { generateEnemy } from './enemies.js'

export * from './actions.js'
export * from './enemies.js'

export const handleCombat = (state: GameState): CombatResult => {
  const playerLevel = Math.floor(
    (state.strength + state.agility + state.intelligence) / 3
  )
  const enemy = generateEnemy(playerLevel)
  let combatLog = `You've encountered a ${enemy.name}!\n`

  let currentState = { ...state }
  let roundCount = 0

  while (currentState.health > 0 && enemy.health > 0 && roundCount < 10) {
    roundCount++
    combatLog += `\nRound ${roundCount}:\n`

    // Player's turn
    const playerAction: CombatAction =
      Math.random() < 0.7
        ? 'attack'
        : Math.random() < 0.5
          ? 'defend'
          : 'use_potion'

    switch (playerAction) {
      case 'attack': {
        const playerDamage = calculateDamage(currentState, enemy)
        enemy.health -= playerDamage
        combatLog += `You attack and deal ${playerDamage} damage.\n`
        break
      }

      case 'defend': {
        currentState.agility += 2
        combatLog += `You take a defensive stance, increasing your agility by 2.\n`
        break
      }

      case 'use_potion': {
        const potions = Object.keys(currentState.inventory).filter((item) =>
          item.includes('Potion')
        )
        if (potions.length > 0) {
          const chosenPotion =
            potions[Math.floor(Math.random() * potions.length)]!
          const [newState, potionMessage] = activatePotionInCombat(
            currentState,
            chosenPotion
          )
          currentState = newState
          combatLog += potionMessage + '\n'
        } else {
          combatLog += `You try to use a potion, but you don't have any!\n`
        }

        break
      }
    }

    if (enemy.health <= 0) break

    // Enemy's turn
    const enemyDamage = calculateDamage(enemy, currentState)
    currentState.health -= enemyDamage
    combatLog += `${enemy.name} attacks and deals ${enemyDamage} damage.\n`
  }

  if (currentState.health <= 0) {
    combatLog += `\nYou were defeated by the ${enemy.name}!`
    const cashLost = Math.floor(currentState.cash * 0.2)
    const inventoryLost: Record<string, number> = {}

    for (const [potion, quantity] of Object.entries(currentState.inventory)) {
      inventoryLost[potion] = Math.floor(quantity * 0.3)
    }

    currentState.cash -= cashLost
    currentState.inventory = Object.fromEntries(
      Object.entries(currentState.inventory).map(([potion, quantity]) => [
        potion,
        quantity - (inventoryLost[potion] ?? 0),
      ])
    )

    combatLog += ` You lost ${cashLost} gold and some potions.`
  } else {
    combatLog += `\nYou defeated the ${enemy.name}!`
    const goldGained = Math.floor(Math.random() * 100) + 50
    currentState.cash += goldGained
    combatLog += ` You gained ${goldGained} gold.`
  }

  return {
    health: currentState.health,
    cash: currentState.cash,
    inventory: currentState.inventory,
    message: combatLog,
  }
}
