import { CHARACTERS, DIFFICULTIES, DURATION, ENEMIES, PASSIVES, REWARDS, SET_PIECES, STAGES, WEAPONS, type Difficulty, type Upgrade, WEAPON_EFFECTS, rarityWeight, timeDamage, timeHp, xpRequirement } from './content';
import type { InputState } from '../engine/input';
import { Random } from '../engine/random';
import { SpatialGrid } from '../engine/grid';

export type Phase = 'title' | 'playing' | 'levelup' | 'paused' | 'dead' | 'won';
export type LootView = { x: number; y: number; kind: number; value: number; active: boolean };
export type Snapshot = {
  phase: Phase; time: number; hp: number; maxHp: number; xp: number; need: number; level: number; gold: number; kills: number;
  difficulty: string; difficultyId: Difficulty['id']; weaponNames: string[]; weaponLevels: number[]; passiveNames: string[];
  options: Upgrade[]; rerolls: number; boss: boolean; bossHp: number; message: string; rewardName: string; rewardColor: string;
  coins: number; playerFacing: number; lowHealth: boolean; pendingLevels: number;
};
export type Receipt = { earned: number; time: number; kills: number; won: boolean };

const ENEMY_CAP = 2600;
const PROJECTILE_CAP = 768;
const ENEMY_SHOT_CAP = 256;
const LOOT_CAP = 1800;
const FX_CAP = 280;
const FLOAT_CAP = 96;
const ATTACK_FX_CAP = 96;
const PLAYER_RADIUS = 14;
const weaponIndex = new Map(WEAPONS.map((w, i) => [w.id, i]));

export class World {
  phase: Phase = 'title'; time = 0; hp = 100; maxHp = 100; xp = 0; level = 1; gold = 0; kills = 0; coins = 0;
  difficulty: Difficulty = DIFFICULTIES[1]!; character: (typeof CHARACTERS)[number] = CHARACTERS[0]!; options: Upgrade[] = []; rerolls = 2; message = ''; rewardName = ''; rewardColor = '#fff';
  private playerX = 0; private playerY = 0; private facing = 0; private walkPhase = 0; private invuln = 0; private slowTime = 0;
  private readonly rng: Random; private messageTimer = 0; private readonly grid = new SpatialGrid(112);
  private separationIndex = -1; private separationX = 0; private separationY = 0; private sweepProjectile = -1;
  private readonly separationVisitor = (index: number) => this.separateFrom(index);
  private readonly projectileVisitor = (index: number) => this.hitProjectile(index);
  private count = 0; private free: number[] = Array.from({ length: ENEMY_CAP }, (_, i) => ENEMY_CAP - i - 1);
  private readonly ex = new Float32Array(ENEMY_CAP); private readonly ey = new Float32Array(ENEMY_CAP); private readonly evx = new Float32Array(ENEMY_CAP); private readonly evy = new Float32Array(ENEMY_CAP);
  private readonly ehp = new Float32Array(ENEMY_CAP); private readonly emax = new Float32Array(ENEMY_CAP); private readonly etype = new Uint8Array(ENEMY_CAP); private readonly eactive = new Uint8Array(ENEMY_CAP);
  private readonly elite = new Uint8Array(ENEMY_CAP); private readonly eradius = new Float32Array(ENEMY_CAP); private readonly eattack = new Float32Array(ENEMY_CAP); private readonly eburn = new Float32Array(ENEMY_CAP); private readonly eflash = new Float32Array(ENEMY_CAP);
  private readonly echarge = new Float32Array(ENEMY_CAP); private readonly eknockX = new Float32Array(ENEMY_CAP); private readonly eknockY = new Float32Array(ENEMY_CAP);
  private spawnClock = 0; private readonly weaponLevels = new Uint8Array(WEAPONS.length); private readonly weaponClock = new Float32Array(WEAPONS.length);
  private readonly passiveLevels = new Uint8Array(PASSIVES.length); private readonly passiveIndex = new Map<string, number>(PASSIVES.map((passive, index) => [passive.name, index])); private pendingLevelups = 0;
  private stats = { power: 1, area: 1, duration: 1, cooldown: 1, speed: 1, pickup: 1, armor: 0, regen: 0, luck: 0, projectiles: 0, projectileSpeed: 1 };
  private readonly px = new Float32Array(PROJECTILE_CAP); private readonly py = new Float32Array(PROJECTILE_CAP); private readonly pang = new Float32Array(PROJECTILE_CAP); private readonly pvx = new Float32Array(PROJECTILE_CAP); private readonly pvy = new Float32Array(PROJECTILE_CAP);
  private readonly pdamage = new Float32Array(PROJECTILE_CAP); private readonly plife = new Float32Array(PROJECTILE_CAP); private readonly pactive = new Uint8Array(PROJECTILE_CAP); private readonly ptype = new Uint8Array(PROJECTILE_CAP); private readonly ppierce = new Uint8Array(PROJECTILE_CAP); private readonly preturn = new Uint8Array(PROJECTILE_CAP);
  private readonly sx = new Float32Array(ENEMY_SHOT_CAP); private readonly sy = new Float32Array(ENEMY_SHOT_CAP); private readonly svx = new Float32Array(ENEMY_SHOT_CAP); private readonly svy = new Float32Array(ENEMY_SHOT_CAP); private readonly sactive = new Uint8Array(ENEMY_SHOT_CAP); private readonly sdamage = new Float32Array(ENEMY_SHOT_CAP);
  private readonly lx = new Float32Array(LOOT_CAP); private readonly ly = new Float32Array(LOOT_CAP); private readonly lv = new Float32Array(LOOT_CAP); private readonly ltype = new Uint8Array(LOOT_CAP); private readonly lactive = new Uint8Array(LOOT_CAP); private lootCount = 0;
  private readonly afx = new Float32Array(ATTACK_FX_CAP); private readonly afy = new Float32Array(ATTACK_FX_CAP); private readonly afr = new Float32Array(ATTACK_FX_CAP); private readonly afa = new Float32Array(ATTACK_FX_CAP); private readonly afl = new Float32Array(ATTACK_FX_CAP); private readonly afmax = new Float32Array(ATTACK_FX_CAP); private readonly aflevel = new Uint8Array(ATTACK_FX_CAP); private readonly aftype = new Uint8Array(ATTACK_FX_CAP); private attackFxCursor = 0;
  private readonly fx = new Float32Array(FX_CAP); private readonly fy = new Float32Array(FX_CAP); private readonly fvx = new Float32Array(FX_CAP); private readonly fvy = new Float32Array(FX_CAP); private readonly flife = new Float32Array(FX_CAP); private readonly fcolor = new Uint8Array(FX_CAP); private fxCursor = 0;
  private readonly tx = new Float32Array(FLOAT_CAP); private readonly ty = new Float32Array(FLOAT_CAP); private readonly tvalue = new Float32Array(FLOAT_CAP); private readonly tlife = new Float32Array(FLOAT_CAP); private readonly tcrit = new Uint8Array(FLOAT_CAP); private textCursor = 0;
  private cycleOrigin = 0; private pieceIndex = 0; private lowEffects = false; private finalised = false; private bossIndex = -1; private bossHp = 0;
  private eventSerial = 0; private eventType = '';

  constructor(private readonly changed: () => void, seed = Date.now()) { this.rng = new Random(seed); }
  setLowEffects(value: boolean): void { this.lowEffects = value; }

  start(difficultyId: string, characterIndex = 0): void {
    this.reset();
    this.difficulty = DIFFICULTIES.find(d => d.id === difficultyId) ?? DIFFICULTIES[1]!;
    this.character = CHARACTERS[characterIndex] ?? CHARACTERS[0]!;
    this.maxHp = this.character.hp; this.hp = this.maxHp; this.stats.power = this.character.power;
    this.stats.armor = this.character.armor; this.stats.regen = this.character.regen; this.stats.luck = this.character.luck;
    const startId = weaponIndex.get(this.character.weapon)!; this.weaponLevels[startId] = 1;
    this.rerolls = this.difficulty.rerolls; this.phase = 'playing'; this.changed();
  }

  private reset(): void {
    this.time = 0; this.hp = 100; this.maxHp = 100; this.xp = 0; this.level = 1; this.gold = 0; this.kills = 0; this.count = 0;
    this.free = Array.from({ length: ENEMY_CAP }, (_, i) => ENEMY_CAP - i - 1); this.eactive.fill(0); this.pactive.fill(0); this.sactive.fill(0); this.lactive.fill(0);
    this.lootCount = 0; this.options = []; this.message = ''; this.messageTimer = 0; this.rewardName = ''; this.rewardColor = '#fff'; this.pendingLevelups = 0; this.finalised = false; this.bossIndex = -1; this.bossHp = 0;
    this.flife.fill(0); this.afl.fill(0); this.tlife.fill(0); this.fxCursor = 0; this.textCursor = 0; this.pang.fill(0); this.eventType = ''; this.eventSerial = 0;
    this.playerX = 0; this.playerY = 0; this.facing = 0; this.walkPhase = 0; this.invuln = 0; this.slowTime = 0; this.spawnClock = 0;
    this.weaponLevels.fill(0); this.weaponClock.fill(0); this.passiveLevels.fill(0); this.stats = { power: 1, area: 1, duration: 1, cooldown: 1, speed: 1, pickup: 1, armor: 0, regen: 0, luck: 0, projectiles: 0, projectileSpeed: 1 };
    this.cycleOrigin = 0; this.pieceIndex = 0; this.eventType = '';
  }

  tick(dt: number, input: InputState): void {
    if (this.phase !== 'playing') return;
    this.time += dt; if (this.messageTimer > 0) { this.messageTimer -= dt; if (this.messageTimer <= 0) this.message = ''; } this.invuln = Math.max(0, this.invuln - dt); this.slowTime = Math.max(0, this.slowTime - dt);
    this.hp = Math.min(this.maxHp, this.hp + this.stats.regen * dt);
    const mx = input.x; const my = input.y;
    this.playerX += mx * this.character.speed * this.stats.speed * dt; this.playerY += my * this.character.speed * this.stats.speed * dt;
    if (mx || my) { this.facing = Math.atan2(my, mx); this.walkPhase += dt * 12 * this.stats.speed; }
    this.spawnClock += dt;
    const stage = STAGES[Math.min(7, Math.floor(this.time / 90))]!;
    const spawnInterval = Math.max(.045, 1 / (stage.rate * this.difficulty.density));
    while (this.spawnClock >= spawnInterval) { this.spawnClock -= spawnInterval; this.spawnEnemy(stage.pool[this.rng.int(stage.pool.length)]!, false, false); }
    this.consumeSetPieces();
    this.grid.clear();
    for (let i = 0; i < ENEMY_CAP; i++) if (this.eactive[i]) this.grid.add(i, this.ex[i]!, this.ey[i]!);
    for (let i = 0; i < ENEMY_CAP; i++) if (this.eactive[i]) this.updateEnemy(i, dt);
    this.updatePlayerShots(dt); this.updateEnemyShots(dt); this.updateOrbitWeapons(); this.updateLoot(dt); this.updateEffects(dt);
    this.updateWeapons(dt); this.collectLoot(); this.checkLevelUps();
    if (this.hp <= 0) { this.hp = 0; this.phase = 'dead'; this.event('death'); this.changed(); }
    else if (this.time >= DURATION) { this.time = DURATION; this.phase = 'won'; this.changed(); }
  }

  private spawnEnemy(type: number, isElite: boolean, isBoss: boolean): number {
    const i = this.free.pop(); if (i === undefined) return -1;
    const def = ENEMIES[type]!; const angle = this.rng.range(0, Math.PI * 2); const distance = this.rng.range(480, 740);
    this.ex[i] = this.playerX + Math.cos(angle) * distance; this.ey[i] = this.playerY + Math.sin(angle) * distance;
    this.evx[i] = this.evy[i] = 0; this.etype[i] = type; this.elite[i] = isElite || isBoss ? 1 : 0;
    this.eradius[i] = def.radius * (isBoss ? 1.42 : isElite ? 1.2 : 1);
    const eliteMult = isBoss ? 1 : isElite ? 2.8 : 1;
    // Difficulty and time curves are frozen at creation; subsequent frames never rescale HP.
    this.emax[i] = def.hp * eliteMult * this.difficulty.hp * (isElite || isBoss ? 1 : timeHp(this.time)); this.ehp[i] = this.emax[i];
    this.eattack[i] = this.rng.range(.4, 1.6); this.eburn[i] = this.eflash[i] = this.echarge[i] = 0; this.eknockX[i] = this.eknockY[i] = 0;
    this.eactive[i] = 1; this.count++;
    if (isBoss) { this.bossIndex = i; this.bossHp = this.emax[i]!; this.message = '黎明吞噬者：早退申请已驳回'; this.messageTimer = 3.5; this.event('boss'); this.changed(); }
    return i;
  }

  private consumeSetPieces(): void {
    if (this.difficulty.loop) {
      while (this.time >= this.cycleOrigin + 180) { this.cycleOrigin += 180; this.pieceIndex = 0; }
      while (this.pieceIndex < SET_PIECES.length && this.time >= this.cycleOrigin + this.pieceIndex * (180 / SET_PIECES.length)) {
        this.runPiece(this.pieceIndex); this.pieceIndex++;
      }
      return;
    }
    while (this.pieceIndex < SET_PIECES.length && this.time >= SET_PIECES[this.pieceIndex]!.at) { this.runPiece(this.pieceIndex); this.pieceIndex++; }
  }

  private runPiece(index: number): void {
    const piece = SET_PIECES[index]!;
    if (piece.kind === 'boss') { this.spawnEnemy(11, false, true); return; }
    if (piece.kind === 'elite') { this.spawnEnemy(index % 2 ? 10 : 9, true, false); return; }
    for (let n = 0; n < piece.size; n++) {
      const type = piece.kind === 'swarm' ? 3 : piece.kind === 'wall' ? (n % 2 ? 0 : 2) : this.rng.int(Math.min(8, 2 + Math.floor(this.time / 90)));
      const angle = piece.kind === 'wall' ? this.facing + Math.PI + (n / piece.size - .5) * 2.4 : undefined;
      this.spawnAt(type, angle, false);
    }
  }

  private spawnAt(type: number, angle: number | undefined, elite: boolean): void {
    if (angle === undefined) { this.spawnEnemy(type, elite, false); return; }
    const i = this.free.pop(); if (i === undefined) return;
    const def = ENEMIES[type]!; const distance = this.rng.range(500, 690);
    this.ex[i] = this.playerX + Math.cos(angle) * distance; this.ey[i] = this.playerY + Math.sin(angle) * distance;
    this.evx[i] = this.evy[i] = 0; this.etype[i] = type; this.elite[i] = elite ? 1 : 0; this.eradius[i] = def.radius;
    this.emax[i] = def.hp * this.difficulty.hp * timeHp(this.time); this.ehp[i] = this.emax[i]; this.eattack[i] = 2; this.eburn[i] = this.eflash[i] = this.echarge[i] = 0;
    this.eknockX[i] = this.eknockY[i] = 0; this.eactive[i] = 1; this.count++;
  }

  private updateEnemy(i: number, dt: number): void {
    const def = ENEMIES[this.etype[i]!]!; const dx = this.playerX - this.ex[i]!; const dy = this.playerY - this.ey[i]!; const dist = Math.hypot(dx, dy) || 1;
    const phase = this.time * 2.3 + i * .71; let speed = def.speed * this.difficulty.speed * (this.slowTime > 0 ? .38 : 1);
    let tx = dx / dist; let ty = dy / dist;
    if (def.ai === 'swarm') { tx += Math.sin(phase) * .12; ty += Math.cos(phase) * .12; }
    else if (def.ai === 'zigzag') { tx += Math.sin(phase * 2) * .62; ty += Math.cos(phase * 2) * .62; }
    else if (def.ai === 'charge') { if (this.echarge[i]! > 0) this.echarge[i] = Math.max(0, this.echarge[i]! - dt); else if (dist < 390 && this.rng.next() < dt * .48) this.echarge[i] = .7; if (this.echarge[i]! > .45) speed *= 2.8; }
    else if (def.ai === 'ranged') { const delta = dist - 285; if (delta < -45) { tx = -tx; ty = -ty; speed *= .7; } else if (delta < 45) speed = 0; }
    else if (def.ai === 'drift') { tx = Math.cos(phase) * .72 + tx * .35; ty = Math.sin(phase) * .72 + ty * .35; }
    const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    if (!def.boss && !def.elite) {
      // Reuse one visitor rather than allocating a callback per enemy per tick.
      this.separationIndex = i; this.separationX = tx; this.separationY = ty;
      this.grid.query(this.ex[i]!, this.ey[i]!, this.eradius[i]! + 25, this.separationVisitor);
      tx = this.separationX; ty = this.separationY;
    }
    const knock = Math.max(0, 1 - dt * 6); this.eknockX[i] *= knock; this.eknockY[i] *= knock;
    this.evx[i] = tx * speed + this.eknockX[i]!; this.evy[i] = ty * speed + this.eknockY[i]!;
    this.ex[i] += this.evx[i]! * dt; this.ey[i] += this.evy[i]! * dt;
    this.eburn[i] = Math.max(0, this.eburn[i]! - dt); this.eflash[i] = Math.max(0, this.eflash[i]! - dt);
    if (this.eburn[i]! > 0 && this.rng.next() < dt * 4) this.damageEnemy(i, 2.5 * this.stats.power, false, false);
    this.eattack[i] -= dt;
    if (def.ranged && dist < 460 && this.eattack[i]! <= 0) { this.fireEnemyShot(i, dx / dist, dy / dist); this.eattack[i] = this.rng.range(1.7, 2.8); }
    const contact = dist - (this.eradius[i]! + PLAYER_RADIUS);
    if (contact < 0 && this.invuln <= 0) {
      const damage = Math.max(1, def.damage * this.difficulty.damage * (this.elite[i] ? 1 : timeDamage(this.time)) - this.stats.armor);
      this.hp -= damage; this.invuln = .48; this.event('hurt');
      if (!def.boss && !def.elite) { this.eknockX[i] -= tx * 70; this.eknockY[i] -= ty * 70; }
      this.addFloat(this.playerX, this.playerY - 22, damage, false);
    }
  }

  private separateFrom(j: number): void {
    const i = this.separationIndex;
    if (j === i || !this.eactive[j] || this.elite[j]) return;
    const sx = this.ex[i]! - this.ex[j]!, sy = this.ey[i]! - this.ey[j]!, sd = Math.hypot(sx, sy) || 1;
    const overlap = this.eradius[i]! + this.eradius[j]! - sd;
    if (overlap > 0) { this.separationX += sx / sd * Math.min(.6, overlap * .018); this.separationY += sy / sd * Math.min(.6, overlap * .018); }
  }

  private fireEnemyShot(i: number, dx: number, dy: number): void {
    for (let k = 0; k < ENEMY_SHOT_CAP; k++) if (!this.sactive[k]) { this.sactive[k] = 1; this.sx[k] = this.ex[i]!; this.sy[k] = this.ey[i]!; this.svx[k] = dx * 155; this.svy[k] = dy * 155; this.sdamage[k] = ENEMIES[this.etype[i]!]!.damage * this.difficulty.damage * .72 * (this.elite[i] ? 1 : timeDamage(this.time)); return; }
  }

  private updateEnemyShots(dt: number): void {
    for (let i = 0; i < ENEMY_SHOT_CAP; i++) if (this.sactive[i]) {
      this.sx[i] += this.svx[i]! * dt; this.sy[i] += this.svy[i]! * dt;
      if (Math.hypot(this.sx[i]! - this.playerX, this.sy[i]! - this.playerY) < PLAYER_RADIUS + 5 && this.invuln <= 0) {
        this.hp -= Math.max(1, this.sdamage[i]! - this.stats.armor); this.invuln = .48; this.sactive[i] = 0; this.event('hurt');
      } else if (Math.hypot(this.sx[i]! - this.playerX, this.sy[i]! - this.playerY) > 820) this.sactive[i] = 0;
    }
  }

  private updateWeapons(dt: number): void {
    for (let wi = 0; wi < WEAPONS.length; wi++) {
      const level = this.weaponLevels[wi]!; if (!level) continue;
      this.weaponClock[wi] -= dt; if (this.weaponClock[wi]! > 0) continue;
      const w = WEAPONS[wi]!; const power = (w.base + w.step * (level - 1)) * this.stats.power;
      const amount = Math.min(12, w.count + this.stats.projectiles + (level >= 5 ? 1 : 0));
      this.weaponClock[wi] = Math.max(.075, w.cooldown * this.stats.cooldown);
      switch (w.id) {
        case '骨钉': this.launchHomingNails(wi, amount, power); break;
        case '鞭击': this.addWeaponEffect(wi, this.playerX, this.playerY, w.reach * this.stats.area, level, this.facing); this.whip(power, w.reach * this.stats.area, level); break;
        case '旋斧': this.addWeaponEffect(wi, this.playerX, this.playerY, 92 * this.stats.area, level, this.facing); for (let n = 0; n < amount; n++) this.spawnShot(wi, this.facing + (n - (amount - 1) / 2) * .2, power, w.speed * this.stats.projectileSpeed, w.reach / w.speed * 2.2, 2, true); break;
        case '魔典': this.tomeStrike(wi, power, level); break;
        case '圣环': this.addWeaponEffect(wi, this.playerX, this.playerY, w.reach * this.stats.area, level, this.facing); this.ringBurst(power, w.reach * this.stats.area, level); break;
        case '余烬': this.addWeaponEffect(wi, this.playerX, this.playerY, 82 * this.stats.area, level, this.facing); for (let n = 0; n < amount; n++) this.spawnShot(wi, this.facing + (n - (amount - 1) / 2) * .24, power, w.speed * this.stats.projectileSpeed, w.reach / w.speed, 1, false); break;
        case '雷罚': this.lightning(wi, power, w.reach * this.stats.area, amount + Math.floor(level / 3), level); break;
        case '镰刃': this.scythe(wi, power, w.reach * this.stats.area, amount, level); break;
        case '丧钟': this.addWeaponEffect(wi, this.playerX, this.playerY, w.reach * this.stats.area, level, this.facing); this.bell(power, w.reach * this.stats.area, level); break;
      }
    }
  }

  private launchHomingNails(wi: number, amount: number, damage: number): void {
    for (let n = 0; n < amount; n++) {
      const target = this.nearestEnemy(this.playerX, this.playerY, 740);
      const angle = target >= 0 ? Math.atan2(this.ey[target]! - this.playerY, this.ex[target]! - this.playerX) : this.facing;
      this.addWeaponEffect(wi, target >= 0 ? this.ex[target]! : this.playerX + Math.cos(angle) * 42, target >= 0 ? this.ey[target]! : this.playerY + Math.sin(angle) * 42, 24, this.weaponLevels[wi]!, angle);
      this.spawnShot(wi, angle + (n - (amount - 1) / 2) * .09, damage, WEAPONS[wi]!.speed * this.stats.projectileSpeed, 1.65 * this.stats.duration, 3 + Math.floor(this.weaponLevels[wi]! / 3), false);
    }
  }
  private whip(damage: number, reach: number, level: number): void {
    const spread = level >= 4 ? 1.5 : 1.12; this.grid.query(this.playerX, this.playerY, reach, i => {
      if (!this.eactive[i]) return; const dx = this.ex[i]! - this.playerX, dy = this.ey[i]! - this.playerY, d = Math.hypot(dx, dy);
      const diff = Math.atan2(Math.sin(Math.atan2(dy, dx) - this.facing), Math.cos(Math.atan2(dy, dx) - this.facing));
      if (d <= reach && Math.abs(diff) < spread) this.damageEnemy(i, damage, true, false);
    }); this.event('whip');
  }
  private tomeStrike(wi: number, damage: number, level: number): void {
    const orbitCount = Math.min(8, 2 + Math.floor(level / 2) + this.stats.projectiles);
    const orbitRadius = 66 * this.stats.area; const phase = this.time * 2.8;
    for (let n = 0; n < orbitCount; n++) {
      const a = phase + n * Math.PI * 2 / orbitCount; const bx = this.playerX + Math.cos(a) * orbitRadius, by = this.playerY + Math.sin(a) * orbitRadius;
      this.addWeaponEffect(wi, bx, by, 27 * this.stats.area, level, a);
      this.grid.query(bx, by, 27 * this.stats.area, i => { if (this.eactive[i] && Math.hypot(this.ex[i]! - bx, this.ey[i]! - by) < this.eradius[i]! + 20) this.damageEnemy(i, damage, true, false); });
    }
    if (wi === 3) this.event('tome');
  }
  private ringBurst(damage: number, reach: number, level: number): void {
    this.grid.query(this.playerX, this.playerY, reach, i => { if (this.eactive[i] && Math.hypot(this.ex[i]! - this.playerX, this.ey[i]! - this.playerY) < reach + this.eradius[i]!) { this.damageEnemy(i, damage, true, false); this.pushEnemy(i, this.playerX, this.playerY, level > 4 ? 260 : 150); } });
    this.addBurst(this.playerX, this.playerY, 2); this.event('ring');
  }
  private lightning(wi: number, damage: number, reach: number, count: number, level: number): void {
    const used = new Uint8Array(ENEMY_CAP);
    for (let n = 0; n < count; n++) { let best = -1, bestDist = reach;
      for (let i = 0; i < ENEMY_CAP; i++) if (this.eactive[i] && !used[i]) { const d = Math.hypot(this.ex[i]! - this.playerX, this.ey[i]! - this.playerY); if (d < bestDist) { best = i; bestDist = d; } }
      if (best < 0) break; used[best] = 1; this.addWeaponEffect(wi, this.ex[best]!, this.ey[best]!, 40, level, Math.atan2(this.ey[best]! - this.playerY, this.ex[best]! - this.playerX)); this.damageEnemy(best, damage, true, true); this.addBurst(this.ex[best]!, this.ey[best]!, 4);
    } this.event('lightning');
  }
  private scythe(wi: number, damage: number, reach: number, count: number, level: number): void {
    const a0 = this.time * 2.5; for (let n = 0; n < count; n++) { const a = a0 + n * Math.PI * 2 / count; const sx = this.playerX + Math.cos(a) * reach * .55, sy = this.playerY + Math.sin(a) * reach * .55;
      this.addWeaponEffect(wi, sx, sy, reach * .34, level, a + Math.PI / 2);
      this.grid.query(sx, sy, reach * .42, i => { if (this.eactive[i] && Math.hypot(this.ex[i]! - sx, this.ey[i]! - sy) < this.eradius[i]! + reach * .4) this.damageEnemy(i, damage, true, false); }); }
    if (level >= 6) this.addBurst(this.playerX, this.playerY, 2);
  }
  private bell(damage: number, reach: number, level: number): void {
    this.grid.query(this.playerX, this.playerY, reach, i => { const d = Math.hypot(this.ex[i]! - this.playerX, this.ey[i]! - this.playerY); if (this.eactive[i] && d <= reach) { this.damageEnemy(i, damage, true, true); this.pushEnemy(i, this.playerX, this.playerY, 310); } });
    this.addBurst(this.playerX, this.playerY, 3); this.event('bell'); if (level >= 7) this.hp = Math.min(this.maxHp, this.hp + 2);
  }

  private spawnShot(type: number, angle: number, damage: number, speed: number, life: number, pierce: number, returning: boolean): void {
    for (let i = 0; i < PROJECTILE_CAP; i++) if (!this.pactive[i]) { this.pactive[i] = 1; this.px[i] = this.playerX; this.py[i] = this.playerY; this.pang[i] = angle; this.pvx[i] = Math.cos(angle) * speed; this.pvy[i] = Math.sin(angle) * speed; this.pdamage[i] = damage; this.plife[i] = life; this.ptype[i] = type; this.ppierce[i] = pierce; this.preturn[i] = returning ? 1 : 0; return; }
  }
  private updatePlayerShots(dt: number): void {
    for (let i = 0; i < PROJECTILE_CAP; i++) if (this.pactive[i]) {
      this.plife[i] -= dt;
      if (this.preturn[i]) {
        const dx = this.playerX - this.px[i]!, dy = this.playerY - this.py[i]!, d = Math.hypot(dx, dy) || 1;
        if (this.plife[i]! < .7) { this.pvx[i] = dx / d * 390; this.pvy[i] = dy / d * 390; }
        if (d < 27 && this.plife[i]! < .7) { this.pactive[i] = 0; continue; }
      }
      this.px[i] += this.pvx[i]! * dt; this.py[i] += this.pvy[i]! * dt;
      if (this.plife[i]! <= 0) { this.pactive[i] = 0; continue; }
      this.sweepProjectile = i; this.grid.query(this.px[i]!, this.py[i]!, 24, this.projectileVisitor);
      if (Math.hypot(this.px[i]! - this.playerX, this.py[i]! - this.playerY) > 880) this.pactive[i] = 0;
    }
  }

  private hitProjectile(j: number): void {
    const i = this.sweepProjectile;
    if (!this.pactive[i] || !this.eactive[j]) return;
    if (Math.hypot(this.ex[j]! - this.px[i]!, this.ey[j]! - this.py[i]!) < this.eradius[j]! + 7) {
      this.damageEnemy(j, this.pdamage[i]!, true, this.rng.next() < .12 + this.stats.luck * .12);
      if (this.ptype[i] === 5) this.eburn[j] = 2.2 * this.stats.duration;
      if (this.ppierce[i]! > 0) this.ppierce[i]--; else this.pactive[i] = 0;
    }
  }

  private updateOrbitWeapons(): void { /* Orbiting tomes are evaluated during their cooldown pulse in tomeStrike. */ }
  private nearestEnemy(x: number, y: number, range: number): number { let best = -1, bestD = range; for (let i = 0; i < ENEMY_CAP; i++) if (this.eactive[i]) { const d = Math.hypot(this.ex[i]! - x, this.ey[i]! - y); if (d < bestD) { bestD = d; best = i; } } return best; }

  private damageEnemy(i: number, amount: number, showText: boolean, critical: boolean): void {
    if (!this.eactive[i]) return; const dealt = critical ? amount * 1.8 : amount;
    this.ehp[i] -= dealt; this.eflash[i] = .08;
    if (showText && (critical || this.rng.next() < .24)) this.addFloat(this.ex[i]!, this.ey[i]!, dealt, critical);
    if (critical) this.addBurst(this.ex[i]!, this.ey[i]!, 5);
    if (this.ehp[i]! <= 0) this.killEnemy(i);
    else if (i === this.bossIndex) this.bossHp = this.ehp[i]!;
  }
  private killEnemy(i: number): void {
    if (!this.eactive[i]) return; const type = this.etype[i]!, def = ENEMIES[type]!; const x = this.ex[i]!, y = this.ey[i]!;
    this.eactive[i] = 0; this.free.push(i); this.count--; this.kills++; this.addLoot(x, y, 0, def.xp); this.addBurst(x, y, this.elite[i] ? 9 : 6); this.event('kill');
    if (this.elite[i]) { this.addLoot(x + 7, y, 1, 12 + this.rng.int(8)); this.addLoot(x - 8, y, 3, 0); }
    else if (this.rng.next() < .012) this.addLoot(x, y, 2, 0);
    if (this.rng.next() < .0018 && !this.elite[i]) this.addLoot(x, y, 3, 0);
    if (def.split && this.time < DURATION - 1) for (let n = 0; n < 2; n++) this.spawnEnemy(3, false, false);
    if (i === this.bossIndex) { this.bossIndex = -1; this.bossHp = 0; this.bossIndex = -1; this.message = '黎明吞噬者已提交离职'; this.messageTimer = 3.5; this.event('bosskill'); this.changed(); }
  }
  private pushEnemy(i: number, fromX: number, fromY: number, force: number): void { if (this.elite[i]) return; const dx = this.ex[i]! - fromX, dy = this.ey[i]! - fromY, d = Math.hypot(dx, dy) || 1; this.eknockX[i] += dx / d * force; this.eknockY[i] += dy / d * force; }

  private addLoot(x: number, y: number, kind: number, value: number): void {
    if (this.lootCount >= LOOT_CAP) return;
    for (let i = 0; i < LOOT_CAP; i++) if (!this.lactive[i]) { this.lactive[i] = 1; this.lx[i] = x; this.ly[i] = y; this.lv[i] = value; this.ltype[i] = kind; this.lootCount++; return; }
  }
  private updateLoot(dt: number): void {
    const radius = 172 * this.stats.pickup;
    for (let i = 0; i < LOOT_CAP; i++) if (this.lactive[i]) {
      const dx = this.playerX - this.lx[i]!, dy = this.playerY - this.ly[i]!, d = Math.hypot(dx, dy) || 1;
      if (d < radius && d > 4) { const pull = (1 - d / radius) * 320 + 90; this.lx[i] += dx / d * pull * dt; this.ly[i] += dy / d * pull * dt; }
    }
  }
  private collectLoot(): void {
    for (let i = 0; i < LOOT_CAP; i++) if (this.lactive[i] && Math.hypot(this.lx[i]! - this.playerX, this.ly[i]! - this.playerY) < (this.ltype[i] === 3 ? 42 : 29) * this.stats.pickup) {
      const kind = this.ltype[i]!, x = this.lx[i]!, y = this.ly[i]!, value = this.lv[i]!; this.lactive[i] = 0; this.lootCount--;
      if (kind === 0) this.xp += value;
      else if (kind === 1) this.gold += value;
      else if (kind === 2) { this.hp = Math.min(this.maxHp, this.hp + 24); this.message = '野餐时间：仅限 0.4 秒'; this.messageTimer = .85; this.event('food'); }
      else if (kind === 3) this.openChest(x, y);
    }
  }
  private openChest(x: number, y: number): void {
    const reward = REWARDS[this.rng.int(REWARDS.length)]!; this.rewardName = reward.name; this.rewardColor = reward.color; this.message = `宝箱：${reward.name} · ${reward.desc}`; this.messageTimer = 3.2; this.event('chest');
    switch (reward.id) {
      case 'purse': { const coins = 60 + this.rng.int(121); this.gold += coins; this.addFloat(x, y, coins, true); break; }
      case 'wafer': this.hp = Math.min(this.maxHp, this.hp + Math.max(30, this.maxHp * .45)); break;
      case 'revelation': this.level++; this.pendingLevelups++; break;
      case 'requiem': for (let i = 0; i < ENEMY_CAP; i++) if (this.eactive[i] && !this.elite[i]) this.killEnemy(i); this.addBurst(x, y, 14); break;
      case 'sands': this.slowTime = Math.max(this.slowTime, 12); this.time = Math.max(0, this.time - 8); break;
    }
    this.changed();
  }

  private checkLevelUps(): void {
    if (this.phase !== 'playing') return;
    while (this.xp >= xpRequirement(this.level)) { this.xp -= xpRequirement(this.level); this.level++; this.pendingLevelups++; }
    if (this.pendingLevelups > 0) { this.offerUpgrades(); this.phase = 'levelup'; this.event('level'); this.changed(); }
  }
  private offerUpgrades(): void {
    const candidates: Upgrade[] = [];
    for (let i = 0; i < WEAPONS.length; i++) { const lv = this.weaponLevels[i]!; if ((lv && lv < 7) || (!lv && this.weaponLevels.reduce((a, b) => a + b, 0) < 6)) { const w = WEAPONS[i]!; candidates.push({ id: w.id, name: w.id, kind: 'weapon', rarity: w.rarity, desc: lv ? `${w.desc}（${lv} → ${lv + 1} 级）` : w.desc, value: lv }); } }
    for (let i = 0; i < PASSIVES.length; i++) { const p = PASSIVES[i]!; const lv = this.passiveLevels[i]!; if ((lv && lv < 5) || (!lv && this.passiveLevels.reduce((a, b) => a + b, 0) < 6)) candidates.push({ id: p.name, name: p.name, kind: 'passive', rarity: p.rarity, desc: lv ? `${p.desc}（${lv} → ${lv + 1} 级）` : p.desc, value: lv }); }
    if (!candidates.length) candidates.push({ id: '最后的体面', name: '最后的体面', kind: 'passive', rarity: 4, desc: '恢复 35% 最大生命。毕竟还要继续值夜。', value: 0 });
    this.options = [];
    for (let n = 0; n < Math.min(3, candidates.length); n++) { const total = candidates.reduce((sum, c) => sum + rarityWeight(c.rarity, this.stats.luck), 0); let roll = this.rng.next() * total; let idx = 0; while (idx < candidates.length - 1 && roll >= rarityWeight(candidates[idx]!.rarity, this.stats.luck)) roll -= rarityWeight(candidates[idx++]!.rarity, this.stats.luck); this.options.push(candidates.splice(idx, 1)[0]!); }
  }
  choose(index: number): void {
    if (this.phase !== 'levelup') return; const upgrade = this.options[index]; if (!upgrade) return;
    if (upgrade.kind === 'weapon') { const i = weaponIndex.get(upgrade.id as (typeof WEAPONS)[number]['id']); if (i !== undefined) this.weaponLevels[i] = Math.min(7, this.weaponLevels[i]! + 1); }
    else if (upgrade.id === '最后的体面') this.hp = Math.min(this.maxHp, this.hp + this.maxHp * .35);
    else { const i = this.passiveIndex.get(upgrade.id); if (i !== undefined) { this.passiveLevels[i] = Math.min(5, this.passiveLevels[i]! + 1); this.applyPassive(upgrade.id); } }
    this.pendingLevelups = Math.max(0, this.pendingLevelups - 1);
    if (this.pendingLevelups) this.offerUpgrades(); else this.phase = 'playing'; this.changed();
  }
  private applyPassive(id: string): void {
    switch (id) {
      case '威力': this.stats.power += .12; break; case '范围': this.stats.area += .14; break; case '持续': this.stats.duration += .18; break;
      case '冷却': this.stats.cooldown *= .91; break; case '数量': this.stats.projectiles++; break; case '弹速': this.stats.projectileSpeed += .18; break;
      case '移速': this.stats.speed += .07; break; case '拾取': this.stats.pickup += .22; break; case '护甲': this.stats.armor++; break;
      case '回复': this.stats.regen += .12; break; case '运气': this.stats.luck += .12; break; case '筋骨': this.maxHp += 15; this.hp += 15; break;
    }
  }
  reroll(): void { if (this.phase === 'levelup' && this.rerolls > 0) { this.rerolls--; this.offerUpgrades(); this.changed(); } }
  pause(): void { if (this.phase === 'playing') this.phase = 'paused'; else if (this.phase === 'paused') this.phase = 'playing'; this.changed(); }
  leave(): Receipt | null { if (this.finalised || this.phase === 'title') { this.phase = 'title'; this.changed(); return null; } this.finalised = true; const earned = Math.floor((this.gold + this.kills * .12 + this.time * .2) * this.difficulty.gold); this.coins += earned; const receipt = { earned, time: this.time, kills: this.kills, won: this.phase === 'won' }; this.phase = 'title'; this.changed(); return receipt; }
  event(type: string): void { this.eventType = type; this.eventSerial++; }
  consumeEvent(after: number): { serial: number; type: string } { return { serial: this.eventSerial, type: this.eventSerial !== after ? this.eventType : '' }; }

  private addBurst(x: number, y: number, count: number): void {
    if (this.lowEffects) return;
    for (let n = 0; n < count; n++) { const i = this.fxCursor++ % FX_CAP; const a = this.rng.range(0, Math.PI * 2), speed = this.rng.range(25, 170); this.fx[i] = x; this.fy[i] = y; this.fvx[i] = Math.cos(a) * speed; this.fvy[i] = Math.sin(a) * speed; this.flife[i] = this.rng.range(.22, .58); this.fcolor[i] = 0; }
  }
  private addWeaponEffect(type: number, x: number, y: number, radius: number, level: number, angle: number): void {
    if (this.lowEffects) return;
    const i = this.attackFxCursor++ % ATTACK_FX_CAP;
    this.afx[i] = x; this.afy[i] = y; this.afr[i] = radius; this.afa[i] = angle; this.afl[i] = this.afmax[i] = WEAPON_EFFECTS[type]!.life; this.aflevel[i] = level; this.aftype[i] = type;
  }
  private addFloat(x: number, y: number, value: number, critical: boolean): void { const i = this.textCursor++ % FLOAT_CAP; this.tx[i] = x; this.ty[i] = y; this.tvalue[i] = value; this.tlife[i] = .72; this.tcrit[i] = critical ? 1 : 0; }
  private updateEffects(dt: number): void { for (let i = 0; i < ATTACK_FX_CAP; i++) if (this.afl[i]! > 0) this.afl[i] -= dt; for (let i = 0; i < FX_CAP; i++) if (this.flife[i]! > 0) { this.flife[i] -= dt; this.fx[i] += this.fvx[i]! * dt; this.fy[i] += this.fvy[i]! * dt; this.fvx[i] *= .96; this.fvy[i] *= .96; } for (let i = 0; i < FLOAT_CAP; i++) if (this.tlife[i]! > 0) { this.tlife[i] -= dt; this.ty[i] -= 24 * dt; } }

  snapshot(): Snapshot {
    const weapons: string[] = [], levels: number[] = []; for (let i = 0; i < WEAPONS.length; i++) if (this.weaponLevels[i]) { weapons.push(WEAPONS[i]!.id); levels.push(this.weaponLevels[i]!); }
    const passives: string[] = []; for (let i = 0; i < PASSIVES.length; i++) if (this.passiveLevels[i]) passives.push(PASSIVES[i]!.name);
    return { phase: this.phase, time: this.time, hp: this.hp, maxHp: this.maxHp, xp: this.xp, need: xpRequirement(this.level), level: this.level, gold: this.gold, kills: this.kills,
      difficulty: this.difficulty.name, difficultyId: this.difficulty.id, weaponNames: weapons, weaponLevels: levels, passiveNames: passives, options: this.options.slice(), rerolls: this.rerolls,
      boss: this.bossIndex >= 0, bossHp: this.bossHp, message: this.message, rewardName: this.rewardName, rewardColor: this.rewardColor, coins: this.coins,
      playerFacing: this.facing, lowHealth: this.hp / this.maxHp < .25, pendingLevels: this.pendingLevelups };
  }
  renderState() { return { time: this.time, px: this.playerX, py: this.playerY, facing: this.facing, characterIndex: CHARACTERS.indexOf(this.character), walkPhase: this.walkPhase, invuln: this.invuln, count: this.count,
    x: this.ex, y: this.ey, hp: this.ehp, maxHp: this.emax, type: this.etype, active: this.eactive, radius: this.eradius, elite: this.elite, flash: this.eflash,
    projectileX: this.px, projectileY: this.py, projectileAngle: this.pang, projectileActive: this.pactive, projectileType: this.ptype,
    shotX: this.sx, shotY: this.sy, shotActive: this.sactive,
    lootX: this.lx, lootY: this.ly, lootValue: this.lv, lootType: this.ltype, lootActive: this.lactive,
    attackX: this.afx, attackY: this.afy, attackRadius: this.afr, attackAngle: this.afa, attackLife: this.afl, attackMaxLife: this.afmax, attackLevel: this.aflevel, attackType: this.aftype, fx: this.fx, fy: this.fy, fLife: this.flife, fColor: this.fcolor, tx: this.tx, ty: this.ty, tValue: this.tvalue, tLife: this.tlife, tCrit: this.tcrit,
    cycleOrigin: this.cycleOrigin, pieceIndex: this.pieceIndex, stats: this.stats, weaponLevels: this.weaponLevels, bossIndex: this.bossIndex };
  }
  inspectEntities(): { count: number; maxHpByType: number[]; cycleOrigin: number; pieceIndex: number } {
    const maxHpByType = ENEMIES.map(() => 0); let count = 0;
    for (let i = 0; i < ENEMY_CAP; i++) if (this.eactive[i]) { count++; maxHpByType[this.etype[i]!] = Math.max(maxHpByType[this.etype[i]!]!, this.emax[i]!); }
    return { count, maxHpByType, cycleOrigin: this.cycleOrigin, pieceIndex: this.pieceIndex };
  }
}
