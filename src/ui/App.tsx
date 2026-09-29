import { useEffect, useRef, useState } from 'react';
import { GameHost } from '../game/host';
import { DIFFICULTIES, CHARACTERS, type Upgrade } from '../game/content';
import type { Snapshot } from '../game/world';
import './style.css';

type Save = { coins: number; best: number; runs: number; difficulty: string; character: number; low: boolean; volume: number; unlocked: string[] };
const unlockedDefault = CHARACTERS.map(character => character.name);
const defaults: Save = { coins: 0, best: 0, runs: 0, difficulty: 'normal', character: 0, low: false, volume: .3, unlocked: unlockedDefault };
function readSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem('midnight-save') ?? '{}') as Partial<Save>;
    return {
      coins: Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins!)) : 0,
      best: Number.isFinite(raw.best) ? Math.max(0, raw.best!) : 0,
      runs: Number.isFinite(raw.runs) ? Math.max(0, Math.floor(raw.runs!)) : 0,
      difficulty: DIFFICULTIES.some(item => item.id === raw.difficulty) ? raw.difficulty! : 'normal',
      character: Number.isInteger(raw.character) && raw.character! >= 0 && raw.character! < CHARACTERS.length ? raw.character! : 0,
      low: typeof raw.low === 'boolean' ? raw.low : false,
      volume: Number.isFinite(raw.volume) ? Math.min(1, Math.max(0, raw.volume!)) : .3,
      unlocked: [...new Set([...(Array.isArray(raw.unlocked) ? raw.unlocked.filter((x): x is string => typeof x === 'string' && (unlockedDefault as readonly string[]).includes(x)) : []), ...unlockedDefault])],
    };
  } catch { return { ...defaults, unlocked: [...unlockedDefault] }; }
}

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null); const host = useRef<GameHost | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null); const [save, setSave] = useState(readSave);
  const [character, setCharacter] = useState(save.character);
  useEffect(() => {
    if (!canvas.current) return;
    const game = new GameHost(canvas.current); host.current = game; const unsubscribe = game.subscribe(setSnapshot);
    return () => { unsubscribe(); game.dispose(); host.current = null; };
  }, []);
  useEffect(() => {
    try { localStorage.setItem('midnight-save', JSON.stringify({ ...save, character })); } catch { /* Storage can be disabled in private contexts. */ }
    host.current?.setLowEffects(save.low); host.current?.setVolume(save.volume);
  }, [save, character]);
  const launch = () => { host.current?.start(save.difficulty, character); };
  const finish = () => {
    const receipt = host.current?.leave();
    if (receipt) setSave(current => ({ ...current, coins: current.coins + receipt.earned, best: Math.max(current.best, receipt.time), runs: current.runs + 1 }));
  };
  const restart = () => { finish(); queueMicrotask(launch); };
  const elapsed = snapshot ? `${Math.floor(snapshot.time / 60)}:${String(Math.floor(snapshot.time % 60)).padStart(2, '0')}` : '0:00';
  return <main className="shell">
    <canvas ref={canvas} aria-label="游戏画面" />
    <div className="grain" aria-hidden="true" />
    <header className="brand"><div className="eyebrow">NOCTURNE SURVIVAL · 01</div><div>长夜<span>收割者</span></div></header>
    {snapshot?.phase === 'title' && <section className="title panel">
      <div className="eyebrow">太阳升起之前，别停下来</div>
      <h1>今晚也要<br /><em>活得像个意外</em></h1>
      <p className="sub">武器会自己工作。你只需要比坏消息跑得快。</p>
      <div className="diffs">{DIFFICULTIES.map(difficulty => <button key={difficulty.id} className={`diff ${save.difficulty === difficulty.id ? 'selected' : ''}`} onClick={() => setSave(current => ({ ...current, difficulty: difficulty.id }))}>
        <b>{difficulty.name}</b><small>血 ×{difficulty.hp} · 伤 ×{difficulty.damage}</small><small>移速 ×{difficulty.speed} · 敌潮 ×{difficulty.density}</small><small>金币 ×{difficulty.gold} · 重掷 {difficulty.rerolls}</small>{difficulty.loop && <i>180 秒循环演出</i>}
      </button>)}</div>
      <div className="charrow">{CHARACTERS.map((item, index) => <button key={item.name} className={character === index ? 'chosen' : ''} onClick={() => setCharacter(index)}><b>{item.name}</b><small>HP {item.hp} · 移速 {item.speed}</small><small>起始武器：{item.weapon}</small></button>)}</div>
      <button className="primary" onClick={launch}>开始值夜 <span>↗</span></button>
      <div className="meta"><span>遗产金币 <strong>{save.coins}</strong></span><span>最长存活 {Math.floor(save.best / 60)}:{String(Math.floor(save.best % 60)).padStart(2, '0')} · 出勤 {save.runs} 次</span></div>
      <div className="settings"><label><input type="checkbox" checked={save.low} onChange={event => setSave(current => ({ ...current, low: event.target.checked }))} />低特效</label><label>音量 <input aria-label="音量" type="range" min="0" max="1" step=".05" value={save.volume} onChange={event => setSave(current => ({ ...current, volume: Number(event.target.value) }))} /></label></div>
      <footer>WASD / 方向键移动 · 按住鼠标指向移动 · 武器自动开火 · Esc / P 暂停</footer>
    </section>}

    {snapshot && ['playing', 'paused', 'levelup', 'dead', 'won'].includes(snapshot.phase) && <>
      <div className="hud"><div><strong>{snapshot.difficulty}</strong><span>难度</span></div><div><strong>{elapsed}</strong><span>距天亮</span></div><div><strong>Lv.{snapshot.level}</strong><span>经验等级</span></div><div><strong>{snapshot.kills}</strong><span>清理数</span></div><div><strong>✦ {snapshot.gold}</strong><span>本局金币</span></div><div><strong>{snapshot.hp.toFixed(0)} / {snapshot.maxHp}</strong><span>生命</span></div></div>
      <div className="health"><div className="healthfill" style={{ width: `${Math.max(0, snapshot.hp / snapshot.maxHp * 100)}%` }} /></div><div className="xpbar"><div style={{ width: `${snapshot.xp / snapshot.need * 100}%` }} /></div>
      <div className="weapons">{snapshot.weaponNames.map((weapon, index) => <span key={weapon} title={`${weapon} ${snapshot.weaponLevels[index]}级`}>{weapon} <b>{snapshot.weaponLevels[index]}</b></span>)}{snapshot.passiveNames.map(passive => <span className="passive-pill" key={passive}>{passive}</span>)}</div>
      {snapshot.boss && <div className="bossbar"><b>黎明吞噬者</b><span><i style={{ width: `${Math.max(0, Math.min(100, snapshot.bossHp / 6500 * 100))}%` }} /></span></div>}
      {snapshot.message && <div className="bossmsg" style={{ color: snapshot.rewardColor }}>{snapshot.message}</div>}
      {snapshot.lowHealth && <div className="low-health">血量告急：身体开始提交工单</div>}
    </>}

    {snapshot?.phase === 'levelup' && <div className="modal"><div className="modalbox"><div className="eyebrow">命运又来找你加班 · 尚欠 {snapshot.pendingLevels} 次选择</div><h2>挑一个坏消息</h2><div className="cards">{snapshot.options.map((upgrade, index) => <UpgradeCard key={`${upgrade.kind}-${upgrade.id}`} item={upgrade} index={index} click={() => host.current?.choose(index)} />)}</div><button className="quiet" disabled={!snapshot.rerolls} onClick={() => host.current?.reroll()}>空格重掷 · 余 {snapshot.rerolls}</button></div></div>}
    {snapshot?.phase === 'paused' && <div className="modal"><div className="modalbox compact"><div className="eyebrow">夜班暂歇</div><h2>尸群没有打卡下班</h2><button className="primary" onClick={() => host.current?.pause()}>继续工作</button><button className="quiet" onClick={finish}>回到标题并结算</button></div></div>}
    {(snapshot?.phase === 'dead' || snapshot?.phase === 'won') && <div className="modal"><div className="modalbox compact"><div className="eyebrow">{snapshot.phase === 'won' ? '晨光，终于有人接班' : '人事部已收到你的申请'}</div><h2>{snapshot.phase === 'won' ? '活到天亮' : '值夜结束'}</h2><p>存活 {Math.floor(snapshot.time / 60)} 分 {Math.floor(snapshot.time % 60)} 秒 · 清理 {snapshot.kills} 只 · 本局金币 {snapshot.gold}</p><div className="settlement">结算遗产 +{Math.floor((snapshot.gold + snapshot.kills * .12 + snapshot.time * .2) * (DIFFICULTIES.find(d => d.id === snapshot.difficultyId)?.gold ?? 1))}</div><button className="primary" onClick={restart}>再值一班</button><button className="quiet" onClick={finish}>回到标题</button></div></div>}
  </main>;
}

function UpgradeCard({ item, index, click }: { item: Upgrade; index: number; click: () => void }) {
  const colors = ['#9ab4d9', '#65d2c0', '#c08dff', '#ffca6a'];
  return <button className="upgrade" onClick={click} style={{ '--rarity': colors[item.rarity - 1] } as React.CSSProperties}><span className="number">0{index + 1}</span><span className="rarity">{'✦'.repeat(item.rarity)} · R{item.rarity}</span><b>{item.name}</b><small>{item.desc}</small></button>;
}
