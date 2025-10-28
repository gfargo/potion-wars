import { type RivalAlchemist, RivalAlchemistManager } from './RivalAlchemist.js'

export class RivalDataLoader {
  private static instance: RivalDataLoader
  private loaded = false

  static getInstance(): RivalDataLoader {
    if (!RivalDataLoader.instance) {
      RivalDataLoader.instance = new RivalDataLoader()
    }
    return RivalDataLoader.instance
  }

  async loadRivals(): Promise<void> {
    if (this.loaded) return

    const rivals = this.getDefaultRivals()
    const manager = RivalAlchemistManager.getInstance()

    for (const rival of rivals) {
      manager.registerRival(rival)
    }

    this.loaded = true
  }

  private getDefaultRivals(): RivalAlchemist[] {
    return [
      {
        id: 'marcus_the_ruthless',
        type: 'aggressive',
        personality: {
          name: 'Marcus the Ruthless',
          description: 'A brutal competitor who will stop at nothing to dominate the potion trade',
          greeting: 'Well, well... if it isn\'t my favorite competition. Ready to lose?',
          victory: 'Hah! I told you I was better. This market belongs to me now!',
          defeat: 'This isn\'t over! I\'ll be back, and next time you won\'t be so lucky!',
          threat: 'You\'d better watch your back. Accidents happen to careless alchemists...',
          bribe: 'Your gold won\'t save you from what\'s coming, but I\'ll take it anyway.'
        },
        strength: 8,
        cunning: 6,
        wealth: 5,
        reputation: 20,
        activeLocations: ["Alchemist's Quarter", "Merchant's District", 'Peasant Village'],
        encounterHistory: []
      },
      {
        id: 'elena_shadowmix',
        type: 'cunning',
        personality: {
          name: 'Elena Shadowmix',
          description: 'A clever alchemist who prefers subtlety and manipulation to direct confrontation',
          greeting: 'Oh my, another alchemist in town. How... interesting.',
          victory: 'Did you really think you could outsmart me? How delightfully naive.',
          defeat: 'Clever... very clever. I underestimated you. It won\'t happen again.',
          threat: 'Threats are so crude. I prefer more... elegant solutions to problems.',
          bribe: 'How refreshingly direct. I do appreciate someone who understands business.'
        },
        strength: 4,
        cunning: 9,
        wealth: 7,
        reputation: 35,
        activeLocations: ['Royal Castle', 'Enchanted Forest', "Alchemist's Quarter"],
        encounterHistory: []
      },
      {
        id: 'goldbeard_trader',
        type: 'merchant',
        personality: {
          name: 'Goldbeard the Trader',
          description: 'A wealthy merchant alchemist who uses his vast resources to control markets',
          greeting: 'Ah, a fellow entrepreneur! Perhaps we can come to a mutually beneficial arrangement?',
          victory: 'Nothing personal, just business. The market has spoken, and it chose me.',
          defeat: 'Well played! I respect a good business mind. Perhaps we should work together?',
          threat: 'Violence is bad for business, friend. Surely we can resolve this civilly?',
          bribe: 'Now you\'re speaking my language! Gold opens all doors, doesn\'t it?'
        },
        strength: 5,
        cunning: 7,
        wealth: 9,
        reputation: 45,
        activeLocations: ["Alchemist's Quarter", "Merchant's District", 'Royal Castle'],
        encounterHistory: []
      },
      {
        id: 'vex_the_saboteur',
        type: 'saboteur',
        personality: {
          name: 'Vex the Saboteur',
          description: 'A mysterious figure who specializes in disrupting competitors through sabotage',
          greeting: 'Fancy meeting you here... what a coincidence.',
          victory: 'Oops! Did something go wrong with your operation? How unfortunate...',
          defeat: 'You got lucky this time. But luck runs out eventually.',
          threat: 'Careful where you step. These streets can be dangerous for the unwary.',
          bribe: 'Interesting proposition. But some things are worth more than gold.'
        },
        strength: 6,
        cunning: 8,
        wealth: 4,
        reputation: 15,
        activeLocations: ['Peasant Village', "Merchant's District", "Alchemist's Quarter"],
        encounterHistory: []
      },
      {
        id: 'professor_blackwater',
        type: 'cunning',
        personality: {
          name: 'Professor Blackwater',
          description: 'A former university professor turned rival, using academic knowledge for competitive advantage',
          greeting: 'Ah, a practitioner of the alchemical arts. How... pedestrian.',
          victory: 'Theory trumps practice once again. Perhaps you should have studied harder.',
          defeat: 'Fascinating! Your practical approach has merit. I must reconsider my theories.',
          threat: 'Knowledge is power, and I have knowledge you cannot imagine.',
          bribe: 'Money? How base. I deal in information and influence, not mere coin.'
        },
        strength: 3,
        cunning: 10,
        wealth: 6,
        reputation: 40,
        activeLocations: ['Enchanted Forest', 'Royal Castle', "Alchemist's Quarter"],
        encounterHistory: []
      },
      {
        id: 'iron_fist_boris',
        type: 'aggressive',
        personality: {
          name: 'Iron Fist Boris',
          description: 'A former enforcer turned alchemist, who solves problems with intimidation',
          greeting: 'You picked the wrong territory, little alchemist.',
          victory: 'That\'s what happens when you mess with the wrong person!',
          defeat: 'Impossible! No one beats Iron Fist Boris! This must be some trick!',
          threat: 'I\'ve broken bigger alchemists than you. Don\'t test me.',
          bribe: 'Ha! You think your pathetic coins can buy me off? Think again!'
        },
        strength: 10,
        cunning: 3,
        wealth: 4,
        reputation: 10,
        activeLocations: ['Peasant Village', "Merchant's District", "Alchemist's Quarter"],
        encounterHistory: []
      }
    ]
  }

  isLoaded(): boolean {
    return this.loaded
  }

  // For testing purposes - reset loader state
  reset(): void {
    this.loaded = false
  }

  // Method to add custom rivals (for future expansion)
  addCustomRival(rival: RivalAlchemist): void {
    const manager = RivalAlchemistManager.getInstance()
    manager.registerRival(rival)
  }

  // Method to get rival by location for testing/debugging
  getRivalsInLocation(location: string): RivalAlchemist[] {
    const manager = RivalAlchemistManager.getInstance()
    return manager.getAllRivals().filter(rival => 
      rival.activeLocations.includes(location)
    )
  }
}