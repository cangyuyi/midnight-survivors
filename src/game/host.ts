import { AudioSynth } from '../engine/audio';
import { Input } from '../engine/input';
import { FixedLoop } from '../engine/loop';
import { Renderer } from './render';
import { World, type Receipt, type Snapshot } from './world';

export class GameHost {
  private readonly world: World; private readonly input: Input; private readonly renderer: Renderer; private readonly loop: FixedLoop;
  private readonly audio = new AudioSynth(); private lastPush = 0; private lastEvent = 0; private snapshot: Snapshot;
  private callbacks = new Set<(snapshot: Snapshot) => void>();
  constructor(canvas: HTMLCanvasElement) {
    this.world = new World(() => this.push(true)); this.snapshot = this.world.snapshot(); this.input = new Input(canvas, key => this.key(key)); this.renderer = new Renderer(canvas);
    this.loop = new FixedLoop(dt => this.world.tick(dt, this.input.read()), () => { this.renderer.draw(this.world); if (performance.now() - this.lastPush > 66) this.push(false); }); this.loop.start();
  }
  subscribe(callback: (snapshot: Snapshot) => void): () => void { this.callbacks.add(callback); callback(this.snapshot); return () => this.callbacks.delete(callback); }
  private push(force: boolean): void {
    const now = performance.now(); if (!force && now - this.lastPush < 66) return; this.lastPush = now; this.snapshot = this.world.snapshot();
    const event = this.world.consumeEvent(this.lastEvent); if (event.type) { this.lastEvent = event.serial; this.playEvent(event.type); }
    for (const callback of this.callbacks) callback(this.snapshot);
  }
  private playEvent(type: string): void {
    if (type === 'kill') { this.audio.hit(); this.renderer.kickShake(1.1); }
    else if (type === 'hurt') { this.audio.tone(105, .16, 'sawtooth', .05); this.renderer.kickShake(5); }
    else if (type === 'level' || type === 'chest') this.audio.level();
    else if (type === 'boss') { this.audio.tone(72, .65, 'triangle', .1); this.renderer.kickShake(8); }
    else if (type === 'bosskill' || type === 'bell') { this.audio.tone(220, .3, 'sine', .08); this.renderer.kickShake(4); }
  }
  private key(key: string): void {
    if (key === 'escape' || key === 'p') this.world.pause();
    if (this.world.phase === 'levelup') { if (/^[1-3]$/.test(key)) this.world.choose(Number(key) - 1); if (key === ' ') this.world.reroll(); }
  }
  start(difficulty: string, character: number): void { this.audio.tone(390, .11, 'triangle', .045); this.world.start(difficulty, character); }
  choose(index: number): void { this.world.choose(index); }
  reroll(): void { this.world.reroll(); }
  pause(): void { this.world.pause(); }
  leave(): Receipt | null { return this.world.leave(); }
  setLowEffects(value: boolean): void { this.renderer.setLowEffects(value); this.world.setLowEffects(value); }
  setVolume(value: number): void { this.audio.volume = value; }
  inspectEntities(): ReturnType<World['inspectEntities']> { return this.world.inspectEntities(); }
  dispose(): void { this.loop.stop(); this.input.dispose(); }
}
