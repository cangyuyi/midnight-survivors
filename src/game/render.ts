import { bakeSprites } from '../engine/sprites';
import { WEAPON_EFFECTS } from './content';
import type { World } from './world';

const sprites = bakeSprites();
const lootColors = ['#86ecff', '#ffd775', '#ff8b78', '#d9b1ff'];
const TAU = Math.PI * 2;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private lowEffects = false;
  private shake = 0;
  private viewLeft = 0;
  private viewRight = 0;
  private viewTop = 0;
  private viewBottom = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = true;
  }

  setLowEffects(value: boolean): void { this.lowEffects = value; }
  kickShake(power: number): void { if (!this.lowEffects) this.shake = Math.min(18, this.shake + power); }

  draw(world: World): void {
    const c = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    if (this.width !== Math.floor(w * dpr) || this.height !== Math.floor(h * dpr)) {
      this.width = this.canvas.width = Math.floor(w * dpr);
      this.height = this.canvas.height = Math.floor(h * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const s = world.renderState(), cx = w / 2, cy = h / 2;
    this.viewLeft = s.px - cx - 48; this.viewRight = s.px + cx + 48;
    this.viewTop = s.py - cy - 48; this.viewBottom = s.py + cy + 48;
    c.fillStyle = '#10111b'; c.fillRect(0, 0, w, h);
    if (world.phase === 'title') { this.drawVignette(c, w, h); return; }

    this.shake = Math.max(0, this.shake - .55);
    const ox = (Math.random() - .5) * this.shake, oy = (Math.random() - .5) * this.shake;
    c.save(); c.translate(cx - s.px + ox, cy - s.py + oy);
    this.drawGround(c, s.px, s.py, cx, cy);
    this.drawBossAura(c, s);
    this.drawLoot(c, s);
    this.drawEnemyShots(c, s);
    this.drawProjectiles(c, s);
    this.drawEnemies(c, s);
    this.drawWeaponEffects(c, s);
    if (!this.lowEffects) this.drawParticles(c, s);
    this.drawFloats(c, s);
    this.drawPlayer(c, s);
    c.restore();
    this.drawVignette(c, w, h);
    if (!this.lowEffects) {
      c.fillStyle = '#fff'; c.globalAlpha = .018 + Math.random() * .012; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
    }
  }

  private visible(x: number, y: number, pad = 0): boolean {
    return x >= this.viewLeft - pad && x <= this.viewRight + pad && y >= this.viewTop - pad && y <= this.viewBottom + pad;
  }

  private drawGround(c: CanvasRenderingContext2D, px: number, py: number, cx: number, cy: number): void {
    const left = px - cx - 80, right = px + cx + 80, top = py - cy - 80, bottom = py + cy + 80;
    c.strokeStyle = '#a5b8d30a'; c.lineWidth = 1;
    for (let x = Math.floor(left / 64) * 64; x < right; x += 64) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); }
    for (let y = Math.floor(top / 64) * 64; y < bottom; y += 64) { c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke(); }
    c.fillStyle = '#d8ceaa0b';
    const tileX = Math.floor(left / 256) * 256, tileY = Math.floor(top / 256) * 256;
    for (let x = tileX; x < right; x += 256) for (let y = tileY; y < bottom; y += 256) {
      const xx = x + ((Math.floor(x / 256) + Math.floor(y / 256)) % 2) * 128;
      c.beginPath(); c.arc(xx, y, 2, 0, TAU); c.fill();
    }
  }

  private drawPlayer(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    c.save(); c.translate(s.px, s.py); c.rotate(s.facing);
    const bob = Math.sin(s.walkPhase) * 2.5;
    if (s.invuln > 0 && Math.floor(performance.now() / 55) % 2) c.globalAlpha = .42;
    c.drawImage(sprites.characters[s.characterIndex] ?? sprites.characters[0]!, -22, -22 + bob, 44, 44);
    c.fillStyle = '#171521'; c.fillRect(3, -4 + bob, 3, 4);
    c.restore();
  }

  private drawBossAura(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    const i = s.bossIndex;
    if (i < 0 || !s.active[i]) return;
    const x = s.x[i]!, y = s.y[i]!, r = s.radius[i]!, pulse = Math.sin(s.time * 4.2);
    if (!this.visible(x, y, r * 2.2)) return;
    c.save(); c.globalCompositeOperation = 'lighter';
    const glow = c.createRadialGradient(x, y, r * .35, x, y, r * 2.2);
    glow.addColorStop(0, '#ff9b5b32'); glow.addColorStop(.6, '#d94b7840'); glow.addColorStop(1, '#571d4200');
    c.fillStyle = glow; c.beginPath(); c.arc(x, y, r * 2.2, 0, TAU); c.fill();
    for (let ring = 0; ring < 3; ring++) {
      c.beginPath(); c.ellipse(x, y, r * (1.28 + ring * .18) + pulse * 3, r * (.66 + ring * .13), s.time * (.18 + ring * .09), 0, TAU);
      c.strokeStyle = ring === 0 ? '#ffcc7777' : '#db6b7050'; c.lineWidth = ring === 0 ? 2.5 : 1.3; c.setLineDash(ring === 1 ? [5, 8] : []); c.stroke();
    }
    c.setLineDash([]);
    for (let n = 0; n < 6; n++) {
      const a = s.time * .72 + n * TAU / 6, rr = r * 1.48;
      c.save(); c.translate(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .62); c.rotate(a);
      c.fillStyle = n % 2 ? '#ff9b65' : '#ffe39a'; c.beginPath(); c.moveTo(0, -5); c.lineTo(4, 0); c.lineTo(0, 5); c.lineTo(-4, 0); c.closePath(); c.fill(); c.restore();
    }
    c.restore();
  }

  private drawLoot(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    for (let i = 0; i < s.lootActive.length; i++) if (s.lootActive[i]) {
      const x = s.lootX[i]!, y = s.lootY[i]!, kind = s.lootType[i]!, color = lootColors[kind] ?? '#fff';
      if (!this.visible(x, y, 20)) continue;
      const bob = Math.sin(s.time * 5 + i * 1.7) * 2;
      c.save(); c.translate(x, y + bob); c.rotate(s.time * (kind === 3 ? .65 : 1.4) + i);
      c.globalAlpha = .3; c.fillStyle = color; c.beginPath(); c.arc(0, 0, kind === 3 ? 15 : 9, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.shadowColor = color; c.shadowBlur = kind === 3 ? 20 : 10; c.fillStyle = color;
      if (kind === 3) {
        c.fillRect(-8, -6, 16, 13); c.fillStyle = '#fff0c0'; c.fillRect(-2, -4, 4, 5);
        c.strokeStyle = '#fff5c2'; c.lineWidth = 2; c.strokeRect(-8, -6, 16, 13);
      } else {
        c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 0); c.lineTo(0, 8); c.lineTo(-6, 0); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-1, -2, 2, 0, TAU); c.fill();
      }
      c.restore();
    }
  }

  private drawEnemyShots(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    for (let i = 0; i < s.shotActive.length; i++) if (s.shotActive[i]) {
      const x = s.shotX[i]!, y = s.shotY[i]!;
      if (!this.visible(x, y, 20)) continue;
      c.drawImage(sprites.enemyShot, x - 13, y - 13, 26, 26);
      c.strokeStyle = '#ff8a994d'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y + 8); c.lineTo(x - 10, y + 17); c.stroke();
    }
  }

  private drawProjectiles(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    for (let i = 0; i < s.projectileActive.length; i++) if (s.projectileActive[i]) {
      const type = s.projectileType[i]!, x = s.projectileX[i]!, y = s.projectileY[i]!, a = s.projectileAngle[i]!;
      if (!this.visible(x, y, 42)) continue;
      const size = type === 2 ? 39 : type === 5 ? 34 : 30;
      c.save(); c.translate(x, y); c.rotate(a); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = .38; c.fillStyle = type === 5 ? '#ff795a' : '#b9eaff'; c.beginPath(); c.ellipse(-8, 0, size * .52, size * .16, 0, 0, TAU); c.fill();
      c.globalAlpha = 1; c.drawImage(sprites.projectiles[type] ?? sprites.projectiles[0]!, -size * .5, -size * .38, size, size * .76);
      c.restore();
    }
  }

  private drawEnemies(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    for (let i = 0; i < s.active.length; i++) if (s.active[i]) {
      const x = s.x[i]!, y = s.y[i]!, radius = s.radius[i]!, type = s.type[i]!, elite = !!s.elite[i];
      if (!this.visible(x, y, radius * 2.8)) continue;
      const size = type === 11 ? radius * 2.72 : radius * (type === 1 || type === 3 ? 2.48 : 2.25);
      const bob = Math.sin(s.time * (elite ? 5.4 : 3.2) + i * 1.71) * (elite ? 2 : 1.5);
      c.fillStyle = '#070b157c'; c.beginPath(); c.ellipse(x, y + radius * .67, radius * .92, radius * .34, 0, 0, TAU); c.fill();
      c.save(); c.translate(x, y + bob);
      if (type !== 11 && x > s.px) c.scale(-1, 1);
      if (elite) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = .28 + Math.sin(s.time * 7 + i) * .08;
        c.fillStyle = type === 10 ? '#ffe28b' : '#ff546e'; c.beginPath(); c.arc(0, 0, size * .57, 0, TAU); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      const sprite = sprites.enemies[type] ?? sprites.enemies[0]!;
      c.drawImage(sprite, -size / 2, -size / 2, size, size);
      if (s.flash[i]! > 0) {
        c.globalAlpha = Math.min(.78, s.flash[i]! * 8); c.fillStyle = '#fff9e9';
        c.beginPath(); c.arc(0, 0, radius * .7, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
      c.restore();
      if (s.maxHp[i]! > 160) {
        const barWidth = type === 11 ? radius * 2 : radius * 2.1, bx = x - barWidth / 2, by = y - radius - 12;
        c.fillStyle = '#121322dd'; c.fillRect(bx - 1, by - 1, barWidth + 2, 5);
        c.fillStyle = type === 11 ? '#ffb658' : elite ? '#f15e69' : '#df7270'; c.fillRect(bx, by, barWidth * Math.max(0, s.hp[i]! / s.maxHp[i]!), 3);
      }
    }
  }

  private drawWeaponEffects(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    for (let i = 0; i < s.attackLife.length; i++) {
      const life = s.attackLife[i]!;
      if (life <= 0) continue;
      const type = s.attackType[i]!, effect = WEAPON_EFFECTS[type]!;
      const maxLife = s.attackMaxLife[i]!, progress = Math.max(0, Math.min(1, 1 - life / maxLife));
      const eased = 1 - (1 - progress) ** 3;
      if (!this.visible(s.attackX[i]!, s.attackY[i]!, s.attackRadius[i]! * 1.2)) continue;
      const radius = s.attackRadius[i]! * (effect.shape === 'bolt' || effect.shape === 'lightning' || effect.shape === 'blade' ? 1 : .42 + eased * .58);
      const level = s.attackLevel[i]!, pulse = Math.sin(progress * Math.PI);
      const fadeIn = Math.min(1, progress * 10), fadeOut = Math.min(1, life / Math.max(.01, maxLife * .3));
      const alpha = fadeIn * fadeOut * (.82 + Math.min(level, 7) * .035);
      const motion = s.time * (5 + type * .37) + i * .73;
      c.save(); c.translate(s.attackX[i]!, s.attackY[i]!); c.rotate(s.attackAngle[i]!);
      c.globalAlpha = alpha; c.globalCompositeOperation = 'lighter';
      c.strokeStyle = effect.color; c.fillStyle = effect.color;
      c.lineWidth = 2.2 + Math.min(level, 7) * .72; c.shadowColor = effect.color; c.shadowBlur = effect.glow + pulse * 9;
      c.lineCap = 'round'; c.lineJoin = 'round';
      switch (effect.shape) {
        case 'bolt': {
          // Bone nail impact: long luminous shaft, chipped head and a hot contact star.
          const travel = eased * radius * .34;
          c.beginPath(); c.moveTo(-radius * .42 + travel, radius * .08); c.lineTo(radius * .48 + travel, -radius * .04); c.stroke();
          c.fillStyle = '#fff'; c.beginPath(); c.moveTo(radius * .62, 0); c.lineTo(radius * .2, -radius * .23); c.lineTo(radius * .3, 0); c.lineTo(radius * .2, radius * .23); c.closePath(); c.fill();
          c.strokeStyle = '#b9f6ff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-radius * .2, -radius * .13); c.lineTo(radius * .4, -radius * .07); c.moveTo(-radius * .2, radius * .13); c.lineTo(radius * .4, radius * .07); c.stroke();
          this.drawStar(c, radius * (.38 + eased * .12), Math.sin(motion) * 2, Math.max(5, radius * .22), '#eafcff'); break;
        }
        case 'arc': {
          // Broad whip arc with a pale cutting edge and impact flares on its tip.
          const sweep = .18 + eased * .76;
          c.beginPath(); c.arc(0, 0, radius, -sweep, sweep); c.stroke();
          c.strokeStyle = '#fff8e6'; c.lineWidth *= .36; c.beginPath(); c.arc(0, 0, radius * .89, -sweep * .88, sweep * .88); c.stroke();
          c.strokeStyle = effect.color; c.lineWidth = 2; c.beginPath(); c.moveTo(radius * .45, -radius * sweep); c.quadraticCurveTo(radius * 1.12, -radius * .25, radius * 1.08, 0); c.stroke();
          this.drawStar(c, radius * Math.cos(sweep), radius * Math.sin(sweep), 8 + level, '#fff4c9');
          c.globalAlpha = alpha * (.45 + pulse * .4); c.strokeStyle = '#fff8e6'; c.lineWidth = 1.3; c.beginPath(); c.arc(0, 0, radius * (1.08 + progress * .12), -.68, .68); c.stroke(); break;
        }
        case 'sweep': {
          // Returning axe leaves a thick crescent and a directional wind trail.
          c.rotate(Math.sin(progress * Math.PI) * .28);
          const sweep = .28 + eased * .77;
          c.beginPath(); c.arc(0, 0, radius, -sweep, sweep); c.stroke();
          c.strokeStyle = '#fff4ca'; c.lineWidth *= .42; c.beginPath(); c.arc(0, 0, radius * .91, -sweep * .86, sweep * .86); c.stroke();
          c.strokeStyle = effect.color; c.lineWidth = 1.7;
          for (let n = 0; n < 3; n++) { c.beginPath(); c.moveTo(-radius * .4, -8 + n * 8); c.quadraticCurveTo(-radius * .8, -18 + n * 14, -radius * (1.02 + n * .06), -8 + n * 8); c.stroke(); }
          c.fillStyle = '#fff3cb'; c.beginPath(); c.moveTo(radius * .92, 0); c.lineTo(radius * .72, -7); c.lineTo(radius * .58, 0); c.lineTo(radius * .72, 7); c.closePath(); c.fill();
          break;
        }
        case 'orbit': {
          // Arcane folio seals orbit their target and stamp a rotating glyph.
          c.beginPath(); c.arc(0, 0, radius, 0, TAU); c.stroke();
          c.strokeStyle = '#f6edff'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, radius * .66, 0, TAU); c.stroke();
          for (let n = 0; n < 4; n++) { const a = motion + n * Math.PI / 2, x = Math.cos(a) * radius * .82, y = Math.sin(a) * radius * .82; this.drawStar(c, x, y, 4 + level * .45, '#fff'); }
          c.fillStyle = '#fff4b7'; c.beginPath(); c.arc(0, 0, 4 + level, 0, TAU); c.fill();
          c.strokeStyle = '#e8d9ff'; c.lineWidth = 1; for (let n = 0; n < 8; n++) { const a = n * TAU / 8 + motion * .35; c.beginPath(); c.moveTo(Math.cos(a) * radius * .48, Math.sin(a) * radius * .48); c.lineTo(Math.cos(a) * radius * .58, Math.sin(a) * radius * .58); c.stroke(); } break;
        }
        case 'ring': {
          // Holy ring has three expanding rails, segmented like a radiant ward.
          for (let n = 0; n < 3; n++) { c.globalAlpha = alpha * (1 - n * .2); c.lineWidth = n === 0 ? 3.5 : 1.6; const railRadius = radius * (.28 + eased * .72) * (1 - n * .13); c.beginPath(); c.arc(0, 0, railRadius, n * .35 + motion * .08, TAU - n * .35 + motion * .08); c.stroke(); }
          c.globalAlpha = alpha; c.strokeStyle = '#fff6cc'; c.lineWidth = 1.2;
          for (let n = 0; n < 8; n++) { const a = n * TAU / 8 + motion * .12; c.beginPath(); c.moveTo(Math.cos(a) * radius * .72, Math.sin(a) * radius * .72); c.lineTo(Math.cos(a) * (radius + 6), Math.sin(a) * (radius + 6)); c.stroke(); }
          c.strokeStyle = '#fff8d6'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, radius * (.3 + eased * .16), motion, motion + Math.PI * 1.25); c.stroke();
          break;
        }
        case 'fan': {
          // Ember volley: layered cone and three flame tongues.
          c.globalAlpha = alpha * .24; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, radius, -.62, .62); c.closePath(); c.fill();
          c.globalAlpha = alpha; c.beginPath(); c.arc(0, 0, radius, -.62, .62); c.stroke();
          c.strokeStyle = '#fff0aa'; c.lineWidth = 2;
          for (let n = -1; n <= 1; n++) { c.beginPath(); c.moveTo(radius * .25, n * 5); c.quadraticCurveTo(radius * .6, n * 13 - 7 + Math.sin(motion + n) * 5, radius, n * radius * .45); c.stroke(); }
          c.fillStyle = '#ffc36f'; for (let n = 0; n < 5; n++) { const t = (n + eased * 2) / 6; const a = -.62 + t * 1.24; const d = radius * (.45 + ((n % 2) * .18)); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6 + (n % 2), 0, TAU); c.fill(); }
          break;
        }
        case 'lightning': {
          // Thunder strike: branching white-hot bolt, impact ring and forked sparks.
          c.strokeStyle = '#d4f8ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(-radius * .08, -radius * .82); c.lineTo(radius * .12, -radius * .3); c.lineTo(-radius * .14, -radius * .04); c.lineTo(radius * .22, radius * .18); c.lineTo(0, radius * .78); c.stroke();
          c.strokeStyle = effect.color; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-radius * .14, -.04 * radius); c.lineTo(-radius * .55, radius * .02); c.lineTo(-radius * .73, radius * .34); c.moveTo(radius * .15, radius * .12); c.lineTo(radius * .58, -radius * .04); c.lineTo(radius * .68, -radius * .35); c.stroke();
          c.beginPath(); c.arc(0, 0, radius * (.12 + eased * .78), 0, TAU); c.stroke();
          for (let n = 0; n < 4; n++) { const a = n * Math.PI / 2 + motion * .16; c.beginPath(); c.moveTo(Math.cos(a) * radius * .62, Math.sin(a) * radius * .62); c.lineTo(Math.cos(a) * radius * .96, Math.sin(a) * radius * .96); c.stroke(); }
          this.drawStar(c, 0, 0, 9 + level, '#fff'); break;
        }
        case 'blade': {
          // Scythe slash as a heavy crescent with bright metal edge and afterimage.
          const sweep = .28 + eased * 1.04; c.rotate(-.42 + eased * .84);
          c.beginPath(); c.arc(0, 0, radius, -sweep, sweep); c.stroke();
          c.strokeStyle = '#f6fbff'; c.lineWidth = Math.max(1.4, c.lineWidth * .32); c.beginPath(); c.arc(0, 0, radius * .92, -sweep * .9, sweep * .9); c.stroke();
          c.strokeStyle = effect.color; c.lineWidth = 1.4; c.globalAlpha = alpha * .54;
          c.beginPath(); c.arc(-radius * .13, 0, radius * .83, -sweep * .84, sweep * .84); c.stroke();
          c.globalAlpha = alpha * .7; c.strokeStyle = '#a9cfff'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, radius * 1.08, -.92, .38); c.stroke();
          this.drawStar(c, radius * Math.cos(sweep), radius * Math.sin(sweep), 7, '#fff'); break;
        }
        case 'shockwave': {
          // Death bell: heavy expanding rings, cross flare and a deep central flash.
          c.globalAlpha = alpha * .85;
          for (let n = 0; n < 4; n++) { const ring = Math.max(.08, eased - n * .16); c.globalAlpha = alpha * (1 - n * .16) * (1 - progress * .28); c.lineWidth = n === 0 ? 4 : 1.8; c.beginPath(); c.arc(0, 0, radius * ring, 0, TAU); c.stroke(); }
          c.globalAlpha = alpha * .85;
          c.strokeStyle = '#fff3bd'; c.lineWidth = 2; c.beginPath(); c.moveTo(-radius * .34, 0); c.lineTo(radius * .34, 0); c.moveTo(0, -radius * .34); c.lineTo(0, radius * .34); c.stroke();
          c.fillStyle = '#fff8cf'; c.beginPath(); c.arc(0, 0, 4 + level * 1.4, 0, TAU); c.fill();
          c.strokeStyle = '#ffad69'; c.lineWidth = 1.25; c.globalAlpha = alpha * .68; for (let n = 0; n < 12; n++) { const a = n * TAU / 12 + motion * .08; c.beginPath(); c.moveTo(Math.cos(a) * radius * .68, Math.sin(a) * radius * .68); c.lineTo(Math.cos(a) * radius * .84, Math.sin(a) * radius * .84); c.stroke(); }
          break;
        }
      }
      // A hot white core and rotating impact spokes make every hit read at a glance.
      // Keep the shared burst compact so each weapon's silhouette remains distinct.
      if (type !== 3 && type !== 4 && type !== 8) {
        const core = Math.min(13 + level * 1.2, Math.max(7, radius * .22));
        c.globalAlpha = alpha * (.48 + pulse * .42);
        c.strokeStyle = '#fff7d8'; c.lineWidth = 1.5 + level * .18; c.shadowColor = effect.color; c.shadowBlur = 16 + level * 2;
        for (let ray = 0; ray < 8; ray++) {
          const a = ray * TAU / 8 + motion * .14, inner = core * .72, outer = core + 5 + pulse * 8;
          c.beginPath(); c.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); c.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); c.stroke();
        }
        c.fillStyle = '#fff9dd'; c.beginPath(); c.arc(0, 0, Math.max(2, core * .19), 0, TAU); c.fill();
      }
      c.restore();
    }
    c.globalAlpha = 1; c.shadowBlur = 0; c.globalCompositeOperation = 'source-over';
  }

  private drawStar(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    c.save(); c.translate(x, y); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = size * 1.4;
    c.beginPath();
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4, r = n % 2 ? size * .32 : size; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.restore();
  }

  private drawParticles(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    for (let i = 0; i < s.fLife.length; i++) if (s.fLife[i]! > 0) {
      const life = s.fLife[i]!, x = s.fx[i]!, y = s.fy[i]!, size = 1.7 + Math.min(life, .3) * 5;
      if (!this.visible(x, y, 12)) continue;
      c.save(); c.globalAlpha = Math.min(1, life * 3.4); c.translate(x, y); c.rotate(i * 2.399);
      c.fillStyle = s.fColor[i] ? '#fff0a5' : (i % 3 === 0 ? '#ffb477' : '#df4f68');
      if (s.fColor[i]) { c.shadowColor = '#ffdc73'; c.shadowBlur = 9; }
      c.beginPath(); c.moveTo(size * 1.8, 0); c.lineTo(0, size * .55); c.lineTo(-size, 0); c.lineTo(0, -size * .55); c.closePath(); c.fill(); c.restore();
    }
    c.globalAlpha = 1; c.shadowBlur = 0;
  }

  private drawFloats(c: CanvasRenderingContext2D, s: ReturnType<World['renderState']>): void {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < s.tLife.length; i++) if (s.tLife[i]! > 0) {
      if (!this.visible(s.tx[i]!, s.ty[i]!, 32)) continue;
      c.globalAlpha = Math.min(1, s.tLife[i] * 2.2); c.font = s.tCrit[i] ? '1000 17px ui-rounded, system-ui, sans-serif' : '900 13px ui-rounded, system-ui, sans-serif';
      c.lineWidth = s.tCrit[i] ? 4 : 3; c.strokeStyle = '#171523'; c.fillStyle = s.tCrit[i] ? '#fff074' : '#fff2dc';
      c.shadowColor = s.tCrit[i] ? '#ff9c37' : '#263049'; c.shadowBlur = s.tCrit[i] ? 12 : 3;
      const text = String(Math.round(s.tValue[i]!)); c.strokeText(text, s.tx[i]!, s.ty[i]!); c.fillText(text, s.tx[i]!, s.ty[i]!);
    }
    c.globalAlpha = 1; c.shadowBlur = 0;
  }

  private drawVignette(c: CanvasRenderingContext2D, w: number, h: number): void {
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .7);
    g.addColorStop(0, '#0000'); g.addColorStop(1, '#02030ad4'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
}
