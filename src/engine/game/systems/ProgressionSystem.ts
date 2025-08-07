import { System } from '@/engine/core/ecs/System';
import { World } from '@/engine/core/ecs/World';

export interface ProgressionData {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
  prestige: number;
  maxPrestige: number;
}

export interface Unlockable {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'cosmetic' | 'emote' | 'title' | 'banner';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  levelRequired: number;
  xpCost: number;
  currencyCost: number;
  unlocked: boolean;
  equipped: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  reward: {
    xp: number;
    currency: number;
    unlockable?: string;
  };
}

export interface PlayerStats {
  totalGames: number;
  wins: number;
  top3: number;
  top10: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  headshots: number;
  longestKill: number;
  averagePlacement: number;
  playTime: number;
  favoriteWeapon: string;
  bestKillStreak: number;
}

export class ProgressionComponent {
  data: ProgressionData;
  unlockables: Map<string, Unlockable> = new Map();
  achievements: Map<string, Achievement> = new Map();
  stats: PlayerStats;
  currency: number = 0;
  equippedItems: Map<string, string> = new Map(); // type -> itemId

  constructor() {
    this.data = {
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      totalXp: 0,
      prestige: 0,
      maxPrestige: 10
    };

    this.stats = {
      totalGames: 0,
      wins: 0,
      top3: 0,
      top10: 0,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      damageTaken: 0,
      headshots: 0,
      longestKill: 0,
      averagePlacement: 0,
      playTime: 0,
      favoriteWeapon: 'pistol',
      bestKillStreak: 0
    };

    this.initializeUnlockables();
    this.initializeAchievements();
  }

  private initializeUnlockables(): void {
    // Weapons
    this.unlockables.set('weapon_rifle', {
      id: 'weapon_rifle',
      name: 'Assault Rifle',
      description: 'High rate of fire assault rifle',
      type: 'weapon',
      rarity: 'common',
      levelRequired: 1,
      xpCost: 0,
      currencyCost: 0,
      unlocked: true,
      equipped: false
    });

    this.unlockables.set('weapon_sniper', {
      id: 'weapon_sniper',
      name: 'Sniper Rifle',
      description: 'Long-range precision weapon',
      type: 'weapon',
      rarity: 'rare',
      levelRequired: 5,
      xpCost: 500,
      currencyCost: 100,
      unlocked: false,
      equipped: false
    });

    // Cosmetics
    this.unlockables.set('skin_stealth', {
      id: 'skin_stealth',
      name: 'Stealth Suit',
      description: 'Dark tactical outfit',
      type: 'cosmetic',
      rarity: 'rare',
      levelRequired: 3,
      xpCost: 300,
      currencyCost: 50,
      unlocked: false,
      equipped: false
    });

    this.unlockables.set('emote_victory', {
      id: 'emote_victory',
      name: 'Victory Dance',
      description: 'Celebrate your wins',
      type: 'emote',
      rarity: 'epic',
      levelRequired: 10,
      xpCost: 1000,
      currencyCost: 200,
      unlocked: false,
      equipped: false
    });

    this.unlockables.set('title_champion', {
      id: 'title_champion',
      name: 'Champion',
      description: 'Prove your worth',
      type: 'title',
      rarity: 'legendary',
      levelRequired: 20,
      xpCost: 5000,
      currencyCost: 1000,
      unlocked: false,
      equipped: false
    });
  }

  private initializeAchievements(): void {
    this.achievements.set('first_win', {
      id: 'first_win',
      name: 'First Victory',
      description: 'Win your first battle royale',
      progress: 0,
      maxProgress: 1,
      completed: false,
      reward: { xp: 500, currency: 100 }
    });

    this.achievements.set('kill_master', {
      id: 'kill_master',
      name: 'Kill Master',
      description: 'Get 100 kills',
      progress: 0,
      maxProgress: 100,
      completed: false,
      reward: { xp: 2000, currency: 500, unlockable: 'weapon_sniper' }
    });

    this.achievements.set('survivor', {
      id: 'survivor',
      name: 'Survivor',
      description: 'Survive for 10 minutes in a single match',
      progress: 0,
      maxProgress: 1,
      completed: false,
      reward: { xp: 1000, currency: 200 }
    });

    this.achievements.set('headhunter', {
      id: 'headhunter',
      name: 'Headhunter',
      description: 'Get 50 headshots',
      progress: 0,
      maxProgress: 50,
      completed: false,
      reward: { xp: 1500, currency: 300 }
    });
  }

  addXP(amount: number): boolean {
    this.data.xp += amount;
    this.data.totalXp += amount;

    // Check for level up
    if (this.data.xp >= this.data.xpToNextLevel) {
      this.levelUp();
      return true;
    }

    return false;
  }

  private levelUp(): void {
    this.data.level++;
    this.data.xp -= this.data.xpToNextLevel;
    
    // Calculate XP for next level (exponential growth)
    this.data.xpToNextLevel = Math.floor(1000 * Math.pow(1.2, this.data.level - 1));

    // Check for prestige
    if (this.data.level >= 100 && this.data.prestige < this.data.maxPrestige) {
      this.prestige();
    }

    // Check for new unlockables
    this.checkUnlockables();

    this.emit('level-up', this.data.level);
  }

  private prestige(): void {
    this.data.prestige++;
    this.data.level = 1;
    this.data.xp = 0;
    this.data.xpToNextLevel = 1000;

    // Prestige rewards
    this.currency += 1000;
    
    this.emit('prestige', this.data.prestige);
  }

  private checkUnlockables(): void {
    for (const [id, unlockable] of this.unlockables) {
      if (!unlockable.unlocked && this.data.level >= unlockable.levelRequired) {
        unlockable.unlocked = true;
        this.emit('unlockable-unlocked', unlockable);
      }
    }
  }

  unlockItem(itemId: string): boolean {
    const item = this.unlockables.get(itemId);
    if (!item || item.unlocked) return false;

    // Check if player has enough XP and currency
    if (this.data.xp < item.xpCost || this.currency < item.currencyCost) {
      return false;
    }

    // Spend resources
    this.data.xp -= item.xpCost;
    this.currency -= item.currencyCost;
    item.unlocked = true;

    this.emit('item-unlocked', item);
    return true;
  }

  equipItem(itemId: string): boolean {
    const item = this.unlockables.get(itemId);
    if (!item || !item.unlocked) return false;

    // Unequip current item of same type
    for (const [id, existingItem] of this.unlockables) {
      if (existingItem.type === item.type && existingItem.equipped) {
        existingItem.equipped = false;
      }
    }

    // Equip new item
    item.equipped = true;
    this.equippedItems.set(item.type, itemId);

    this.emit('item-equipped', item);
    return true;
  }

  updateAchievement(achievementId: string, progress: number): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.completed) return false;

    achievement.progress = Math.min(progress, achievement.maxProgress);

    if (achievement.progress >= achievement.maxProgress && !achievement.completed) {
      achievement.completed = true;
      this.grantAchievementReward(achievement);
      this.emit('achievement-completed', achievement);
      return true;
    }

    return false;
  }

  private grantAchievementReward(achievement: Achievement): void {
    this.addXP(achievement.reward.xp);
    this.currency += achievement.reward.currency;

    if (achievement.reward.unlockable) {
      const unlockable = this.unlockables.get(achievement.reward.unlockable);
      if (unlockable) {
        unlockable.unlocked = true;
      }
    }
  }

  updateStats(stats: Partial<PlayerStats>): void {
    Object.assign(this.stats, stats);
    
    // Update achievements based on stats
    this.updateAchievement('first_win', this.stats.wins);
    this.updateAchievement('kill_master', this.stats.kills);
    this.updateAchievement('headhunter', this.stats.headshots);
  }

  getProgressSummary(): any {
    return {
      level: this.data.level,
      xp: this.data.xp,
      xpToNextLevel: this.data.xpToNextLevel,
      progress: (this.data.xp / this.data.xpToNextLevel) * 100,
      prestige: this.data.prestige,
      currency: this.currency,
      unlockedItems: Array.from(this.unlockables.values()).filter(item => item.unlocked).length,
      totalItems: this.unlockables.size,
      completedAchievements: Array.from(this.achievements.values()).filter(achievement => achievement.completed).length,
      totalAchievements: this.achievements.size
    };
  }

  toJSON() {
    return {
      data: this.data,
      currency: this.currency,
      equippedItems: Object.fromEntries(this.equippedItems),
      stats: this.stats,
      unlockables: Object.fromEntries(this.unlockables),
      achievements: Object.fromEntries(this.achievements)
    };
  }

  fromJSON(json: any) {
    this.data = json.data;
    this.currency = json.currency;
    this.equippedItems = new Map(Object.entries(json.equippedItems || {}));
    this.stats = json.stats;
    this.unlockables = new Map(Object.entries(json.unlockables || {}));
    this.achievements = new Map(Object.entries(json.achievements || {}));
  }
}

export class ProgressionSystem extends System {
  constructor() {
    super('ProgressionSystem', 'low', { all: ['ProgressionComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;

    for (const entityId of this.entities) {
      const progression = world.getComponent<ProgressionComponent>(entityId, 'ProgressionComponent');
      if (!progression) continue;

      // Update play time
      progression.stats.playTime += deltaTime;
    }
  }

  // Public API for other systems
  addXP(playerId: string, amount: number): boolean {
    const world = (this as any).world as World;
    const progression = world.getComponent<ProgressionComponent>(playerId, 'ProgressionComponent');
    if (!progression) return false;

    return progression.addXP(amount);
  }

  updatePlayerStats(playerId: string, stats: Partial<PlayerStats>): void {
    const world = (this as any).world as World;
    const progression = world.getComponent<ProgressionComponent>(playerId, 'ProgressionComponent');
    if (!progression) return;

    progression.updateStats(stats);
  }

  unlockItem(playerId: string, itemId: string): boolean {
    const world = (this as any).world as World;
    const progression = world.getComponent<ProgressionComponent>(playerId, 'ProgressionComponent');
    if (!progression) return false;

    return progression.unlockItem(itemId);
  }

  equipItem(playerId: string, itemId: string): boolean {
    const world = (this as any).world as World;
    const progression = world.getComponent<ProgressionComponent>(playerId, 'ProgressionComponent');
    if (!progression) return false;

    return progression.equipItem(itemId);
  }

  getPlayerProgress(playerId: string): any {
    const world = (this as any).world as World;
    const progression = world.getComponent<ProgressionComponent>(playerId, 'ProgressionComponent');
    if (!progression) return null;

    return progression.getProgressSummary();
  }
}