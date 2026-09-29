export type WeaponId = '骨钉' | '鞭击' | '旋斧' | '魔典' | '圣环' | '余烬' | '雷罚' | '镰刃' | '丧钟';
export type DifficultyId = 'sleep' | 'normal' | 'long' | 'eternal' | 'frenzy';
export type AiKind = 'chase' | 'swarm' | 'zigzag' | 'charge' | 'ranged' | 'split' | 'drift';
export type RewardId = 'purse' | 'wafer' | 'revelation' | 'requiem' | 'sands';
export type Upgrade = { id: string; name: string; kind: 'weapon' | 'passive'; rarity: 1 | 2 | 3 | 4; desc: string; value: number };

export const DURATION = 720;
export const DIFFICULTIES = [
  { id: 'sleep', name: '安眠', hp: .7, damage: .65, speed: .85, density: .75, gold: .7, rerolls: 3, loop: false },
  { id: 'normal', name: '寻常', hp: 1, damage: 1, speed: 1, density: 1, gold: 1, rerolls: 2, loop: false },
  { id: 'long', name: '长夜', hp: 1.35, damage: 1.25, speed: 1.08, density: 1.35, gold: 1.3, rerolls: 2, loop: false },
  { id: 'eternal', name: '永夜', hp: 1.8, damage: 1.65, speed: 1.15, density: 1.8, gold: 1.7, rerolls: 1, loop: false },
  { id: 'frenzy', name: '狂暴', hp: 2.4, damage: 2.2, speed: 1.2, density: 2.6, gold: 2.2, rerolls: 1, loop: true },
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const WEAPONS: readonly { id: WeaponId; desc: string; base: number; step: number; cooldown: number; reach: number; rarity: 1 | 2 | 3 | 4; count: number; speed: number }[] = [
  { id: '骨钉', desc: '追踪最近目标的穿透骨钉。', base: 18, step: 8, cooldown: .66, reach: 510, rarity: 1, count: 1, speed: 520 },
  { id: '鞭击', desc: '向当前朝向甩出宽阔弧光。', base: 23, step: 10, cooldown: .97, reach: 126, rarity: 1, count: 1, speed: 0 },
  { id: '旋斧', desc: '抛出回旋斧，去时伤人，回来也伤人。', base: 34, step: 13, cooldown: 1.66, reach: 300, rarity: 2, count: 1, speed: 330 },
  { id: '魔典', desc: '环绕法书，让贴身社交变得昂贵。', base: 11, step: 5, cooldown: .22, reach: 95, rarity: 2, count: 1, speed: 0 },
  { id: '圣环', desc: '周期爆发一圈圣光，拒绝被包围。', base: 40, step: 17, cooldown: 2.2, reach: 185, rarity: 2, count: 1, speed: 0 },
  { id: '余烬', desc: '扇形散射火球，留下持续灼烧。', base: 29, step: 12, cooldown: 1.2, reach: 350, rarity: 2, count: 3, speed: 390 },
  { id: '雷罚', desc: '锁定多个目标，闪电不需要视线。', base: 45, step: 18, cooldown: 1.43, reach: 430, rarity: 3, count: 2, speed: 0 },
  { id: '镰刃', desc: '扫出旋转弧刃，角度是建议不是约束。', base: 27, step: 11, cooldown: .75, reach: 230, rarity: 3, count: 2, speed: 0 },
  { id: '丧钟', desc: '重低音冲击波，把周围的烦恼推远。', base: 64, step: 24, cooldown: 2.85, reach: 260, rarity: 4, count: 1, speed: 0 },
];

export const WEAPON_EFFECTS = [
  { shape: 'bolt', color: '#e6e4ff', glow: 12, life: .22 },
  { shape: 'arc', color: '#f1e6ff', glow: 18, life: .28 },
  { shape: 'sweep', color: '#f6ca73', glow: 16, life: .34 },
  { shape: 'orbit', color: '#bda8ff', glow: 13, life: .26 },
  { shape: 'ring', color: '#fff0a6', glow: 22, life: .42 },
  { shape: 'fan', color: '#ff9b50', glow: 18, life: .25 },
  { shape: 'lightning', color: '#9beaff', glow: 24, life: .36 },
  { shape: 'blade', color: '#d5e6ff', glow: 18, life: .3 },
  { shape: 'shockwave', color: '#ffdb91', glow: 26, life: .48 },
] as const;

export const PASSIVES = [
  { name: '威力', desc: '伤害提高 12%', rarity: 1 as const }, { name: '范围', desc: '攻击范围提高 14%', rarity: 1 as const },
  { name: '持续', desc: '灼烧与投射物效果延长', rarity: 2 as const }, { name: '冷却', desc: '武器冷却缩短 9%', rarity: 2 as const },
  { name: '数量', desc: '额外投射物 +1', rarity: 3 as const }, { name: '弹速', desc: '投射物速度提高 18%', rarity: 1 as const },
  { name: '移速', desc: '移动速度提高 7%', rarity: 1 as const }, { name: '拾取', desc: '经验与宝箱拾取范围提高', rarity: 1 as const },
  { name: '护甲', desc: '受到伤害降低 1 点', rarity: 2 as const }, { name: '回复', desc: '每秒恢复 0.12 生命', rarity: 2 as const },
  { name: '运气', desc: '高稀有提案更常出现', rarity: 3 as const }, { name: '筋骨', desc: '最大生命提高 15', rarity: 1 as const },
] as const;
export type PassiveName = (typeof PASSIVES)[number]['name'];

export const CHARACTERS = [
  { name: '守夜人', cost: 0, hp: 100, speed: 205, power: 1, armor: 0, regen: 0, luck: 0, weapon: '骨钉' as WeaponId },
  { name: '钟楼修女', cost: 0, hp: 92, speed: 195, power: 1.15, armor: 0, regen: .04, luck: .12, weapon: '圣环' as WeaponId },
  { name: '失业骑士', cost: 0, hp: 135, speed: 180, power: .92, armor: 1, regen: 0, luck: 0, weapon: '鞭击' as WeaponId },
  { name: '灰烬学徒', cost: 0, hp: 86, speed: 220, power: 1.05, armor: 0, regen: 0, luck: .08, weapon: '余烬' as WeaponId },
] as const;

export const ENEMIES: readonly { name: string; hp: number; speed: number; damage: number; radius: number; ai: AiKind; color: string; xp: number; elite?: boolean; boss?: boolean; ranged?: boolean; split?: boolean; knockback: number }[] = [
  { name: '游魂', hp: 22, speed: 52, damage: 8, radius: 13, ai: 'chase', color: '#9e8fba', xp: 2.3, knockback: 1 },
  { name: '骨犬', hp: 34, speed: 83, damage: 10, radius: 12, ai: 'zigzag', color: '#bbd5c8', xp: 2.3, knockback: 1 },
  { name: '泥偶', hp: 78, speed: 34, damage: 17, radius: 19, ai: 'swarm', color: '#8c795f', xp: 3.5, knockback: .65 },
  { name: '蝠群', hp: 16, speed: 104, damage: 7, radius: 9, ai: 'swarm', color: '#675a87', xp: 2.3, knockback: 1.4 },
  { name: '夜猎者', hp: 90, speed: 60, damage: 18, radius: 16, ai: 'charge', color: '#be6252', xp: 4.6, knockback: .9 },
  { name: '咒术师', hp: 65, speed: 38, damage: 16, radius: 15, ai: 'ranged', color: '#5479a4', xp: 4.6, ranged: true, knockback: 1 },
  { name: '裂变胎', hp: 46, speed: 46, damage: 12, radius: 15, ai: 'split', color: '#a6b966', xp: 3.5, split: true, knockback: 1 },
  { name: '漂流灯', hp: 55, speed: 44, damage: 14, radius: 14, ai: 'drift', color: '#dbb86b', xp: 3.5, knockback: 1 },
  { name: '铁处女', hp: 180, speed: 29, damage: 24, radius: 22, ai: 'chase', color: '#927575', xp: 5.8, knockback: .5 },
  { name: '血誓精英', hp: 520, speed: 55, damage: 28, radius: 26, ai: 'charge', color: '#f15e61', xp: 14, elite: true, knockback: 0 },
  { name: '无面主教', hp: 800, speed: 42, damage: 30, radius: 28, ai: 'ranged', color: '#d8b66d', xp: 18.5, elite: true, ranged: true, knockback: 0 },
  { name: '黎明吞噬者', hp: 6500, speed: 48, damage: 40, radius: 54, ai: 'charge', color: '#f2d184', xp: 92, boss: true, knockback: 0 },
];

export const STAGES = Array.from({ length: 8 }, (_, i) => ({ start: i * 90, end: (i + 1) * 90, rate: .82 + i * .28, pool: [0, 1, ...(i > 0 ? [2, 3] : []), ...(i > 1 ? [4, 5] : []), ...(i > 2 ? [6, 7] : []), ...(i > 3 ? [8] : [])] }));
export const SET_PIECES = [
  { at: 22, kind: 'swarm', size: 18 }, { at: 56, kind: 'wall', size: 28 }, { at: 96, kind: 'encircle', size: 32 },
  { at: 136, kind: 'elite', size: 1 }, { at: 178, kind: 'boss', size: 1 }, { at: 218, kind: 'swarm', size: 36 },
  { at: 258, kind: 'wall', size: 42 }, { at: 298, kind: 'encircle', size: 44 }, { at: 338, kind: 'elite', size: 1 },
  { at: 378, kind: 'swarm', size: 50 }, { at: 418, kind: 'wall', size: 54 }, { at: 458, kind: 'boss', size: 1 },
  { at: 498, kind: 'encircle', size: 58 }, { at: 538, kind: 'elite', size: 1 }, { at: 578, kind: 'swarm', size: 64 }, { at: 630, kind: 'boss', size: 1 },
] as const;
export const REWARDS: readonly { id: RewardId; name: string; desc: string; color: string }[] = [
  { id: 'purse', name: '钱袋', desc: '钱是唯一懂得及时到账的东西。', color: '#ffd477' },
  { id: 'wafer', name: '圣饼', desc: '恢复生命，味道像被原谅。', color: '#fff1c4' },
  { id: 'revelation', name: '启示', desc: '立即获得一次升级提案。', color: '#a9e8ff' },
  { id: 'requiem', name: '安魂', desc: '清空普通敌人，精英与 BOSS 不受影响。', color: '#d5b7ff' },
  { id: 'sands', name: '时之沙', desc: '减缓敌群，并为天亮争取几秒。', color: '#ffad86' },
];
export const xpRequirement = (level: number) => Math.floor(9 + level * 5.4 + level * level * .52);
export const timeHp = (t: number) => 1 + t / 360 + (t / 720) ** 2 * .9;
export const timeDamage = (t: number) => 1 + t / 420 + (t / 720) ** 2 * .85;
export function rarityWeight(rarity: number, luck: number): number { return [0, 58, 27, 11, 4][rarity]! * (1 + luck * (rarity - 1) * .23); }
