import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { build } = await import(new URL('../../../esbuild/lib/main.js', pathToFileURL(require.resolve('vite'))));

const bundle = await build({ entryPoints: { world: 'src/game/world.ts', content: 'src/game/content.ts' }, bundle: true, platform: 'node', format: 'esm', outdir: '/tmp/nocturne-upgrade-tests', write: false });
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const [{ World }, { WEAPONS, CHARACTERS, ENEMIES, SET_PIECES }] = await Promise.all([import(moduleUrl(bundle.outputFiles.find((file) => file.path.endsWith('world.js')).text)), import(moduleUrl(bundle.outputFiles.find((file) => file.path.endsWith('content.js')).text))]);
{
  const makeWorld = (character = 0) => { const world = new World(() => {}, 12345); world.start('normal', character); return world; };
  const targetX = [22, 32, 24, 66, 24, 24, 24, 126, 24];

  // A run must begin with its character's automatic weapon already equipped and firing.
  const characterWeaponIndexes = [0, 4, 1, 5];
  for (let character = 0; character < CHARACTERS.length; character++) {
    const world = makeWorld(character); const wi = characterWeaponIndexes[character];
    assert.equal(world.phase, 'playing');
    assert.equal(world.weaponLevels[wi], 1, `${CHARACTERS[character].name} did not start with ${CHARACTERS[character].weapon}`);
    world.ex[0] = targetX[wi]; world.ey[0] = 0; world.ehp[0] = world.emax[0] = 100000;
    world.etype[0] = 0; world.eradius[0] = 13; world.eactive[0] = 1; world.count = 1;
    world.grid.clear(); world.grid.add(0, world.ex[0], world.ey[0]);
    world.updateWeapons(1 / 60);
    for (let frame = 0; frame < 8; frame++) {
      world.grid.clear(); world.grid.add(0, world.ex[0], world.ey[0]);
      world.updatePlayerShots(1 / 60);
    }
    const state = world.renderState();
    assert.ok(100000 - world.ehp[0] > 0, `${CHARACTERS[character].weapon} starting attack did not damage a target`);
    assert.ok(state.attackLife.some((life, i) => life > 0 && state.attackType[i] === wi), `${CHARACTERS[character].weapon} starting attack had no visible effect`);
  }

  for (let wi = 0; wi < WEAPONS.length; wi++) {
    const world = makeWorld();
    world.weaponLevels.fill(0);
    world.phase = 'levelup'; world.pendingLevelups = 1;
    world.options = [{ id: WEAPONS[wi].id, name: WEAPONS[wi].id, kind: 'weapon', rarity: 1, desc: '', value: 0 }];
    world.choose(0);
    assert.equal(world.weaponLevels[wi], 1, `${WEAPONS[wi].id} was not acquired through the upgrade choice`);
    world.ex[0] = targetX[wi]; world.ey[0] = 0; world.ehp[0] = world.emax[0] = 100000;
    world.etype[0] = 0; world.eradius[0] = 13; world.eactive[0] = 1; world.count = 1;
    world.grid.clear(); world.grid.add(0, world.ex[0], world.ey[0]);
    world.updateWeapons(1 / 60);
    for (let frame = 0; frame < 8; frame++) {
      world.grid.clear(); world.grid.add(0, world.ex[0], world.ey[0]);
      world.updatePlayerShots(1 / 60);
    }
    const levelOneDamage = 100000 - world.ehp[0];
    let state = world.renderState();
    assert.ok(state.attackLife.some((life, i) => life > 0 && state.attackType[i] === wi && state.attackLevel[i] === 1), `${WEAPONS[wi].id} emitted no visible level-1 attack effect`);
    assert.ok(levelOneDamage > 0, `${WEAPONS[wi].id} did not damage a nearby target`);

    world.phase = 'levelup'; world.pendingLevelups = 1; world.options = [{ id: WEAPONS[wi].id, name: WEAPONS[wi].id, kind: 'weapon', rarity: 1, desc: '', value: 1 }]; world.choose(0);
    assert.equal(world.weaponLevels[wi], 2, `${WEAPONS[wi].id} failed to level up`);
    world.weaponClock[wi] = 0; world.ehp[0] = 100000; world.pactive.fill(0); world.afl.fill(0);
    world.grid.clear(); world.grid.add(0, world.ex[0], world.ey[0]); world.updateWeapons(1 / 60);
    for (let frame = 0; frame < 8; frame++) { world.grid.clear(); world.grid.add(0, world.ex[0], world.ey[0]); world.updatePlayerShots(1 / 60); }
    const levelTwoDamage = 100000 - world.ehp[0]; state = world.renderState();
    assert.ok(levelTwoDamage > levelOneDamage, `${WEAPONS[wi].id} level-up did not increase actual damage (${levelOneDamage} -> ${levelTwoDamage})`);
    assert.ok(state.attackLife.some((life, i) => life > 0 && state.attackType[i] === wi && state.attackLevel[i] === 2), `${WEAPONS[wi].id} level-up did not scale attack feedback`);
  }

  const passiveExpectations = [
    ['威力', 'power', 1.12], ['范围', 'area', 1.14], ['持续', 'duration', 1.18], ['冷却', 'cooldown', .91],
    ['数量', 'projectiles', 1], ['弹速', 'projectileSpeed', 1.18], ['移速', 'speed', 1.07], ['拾取', 'pickup', 1.22],
    ['护甲', 'armor', 1], ['回复', 'regen', .12], ['运气', 'luck', .12],
  ];
  for (const [name, stat, expected] of passiveExpectations) {
    const world = makeWorld(); world.phase = 'levelup'; world.options = [{ id: name, name, kind: 'passive', rarity: 1, desc: '', value: 0 }];
    world.choose(0);
    assert.ok(Math.abs(world.stats[stat] - expected) < 1e-6, `${name} failed to update ${stat}: ${world.stats[stat]}`);
  }
  const sturdy = makeWorld(); const oldMax = sturdy.maxHp; sturdy.phase = 'levelup';
  sturdy.options = [{ id: '筋骨', name: '筋骨', kind: 'passive', rarity: 1, desc: '', value: 0 }]; sturdy.choose(0);
  assert.equal(sturdy.maxHp, oldMax + 15, '筋骨 failed to increase maximum HP');
  assert.equal(sturdy.hp, oldMax + 15, '筋骨 failed to grant the new HP');

  const scaled = makeWorld(); scaled.weaponLevels.fill(0); scaled.weaponLevels[4] = 2;
  scaled.ex[0] = 24; scaled.ey[0] = 0; scaled.ehp[0] = scaled.emax[0] = 100000; scaled.etype[0] = 0; scaled.eradius[0] = 13; scaled.eactive[0] = 1; scaled.count = 1;
  scaled.grid.clear(); scaled.grid.add(0, scaled.ex[0], scaled.ey[0]);
  scaled.phase = 'levelup'; scaled.options = [{ id: '范围', name: '范围', kind: 'passive', rarity: 1, desc: '', value: 0 }]; scaled.choose(0);
  scaled.updateWeapons(1 / 60);
  const scaledFx = scaled.renderState();
  const fxIndex = [...scaledFx.attackLife].findIndex((life, i) => life > 0 && scaledFx.attackType[i] === 4);
  assert.notEqual(fxIndex, -1, 'range passive test did not emit the ring attack');
  assert.ok(scaledFx.attackRadius[fxIndex] > 185, 'range passive did not enlarge the next weapon attack');

  // Difficulty HP is applied to actual entities at spawn time, not just to config labels.
  const hpWorld = (difficulty) => { const world = new World(() => {}, 777); world.start(difficulty); world.time = 240; world.spawnEnemy(0, false, false); return world; };
  const normalHp = hpWorld('normal').inspectEntities().maxHpByType[0];
  const frenzyHp = hpWorld('frenzy').inspectEntities().maxHpByType[0];
  assert.ok(Math.abs(frenzyHp / normalHp - 2.4) < 1e-6, `Frenzy spawned HP ratio should be 2.4, got ${frenzyHp / normalHp}`);
  assert.ok(Math.abs(normalHp - ENEMIES[0].hp * (1 + 240 / 360 + (240 / 720) ** 2 * .9)) < 1e-4, 'normal entity HP did not freeze the time curve at spawn');

  // Frenzy consumes each cycle once, advances its origin, then starts the next set-piece round.
  const loop = new World(() => {}, 888); loop.start('frenzy'); loop.time = 179.99; loop.consumeSetPieces();
  let loopState = loop.inspectEntities();
  assert.equal(loopState.cycleOrigin, 0, 'cycle origin advanced before the 180-second boundary');
  assert.equal(loopState.pieceIndex, SET_PIECES.length, 'first cycle did not consume all scheduled set pieces');
  loop.time = 180; loop.consumeSetPieces(); loopState = loop.inspectEntities();
  assert.equal(loopState.cycleOrigin, 180, 'cycle origin did not advance by exactly 180 seconds');
  assert.equal(loopState.pieceIndex, 1, 'second cycle did not resume at the first piece');
  loop.time = 180 + 180 / SET_PIECES.length; loop.consumeSetPieces(); loopState = loop.inspectEntities();
  assert.equal(loopState.pieceIndex, 2, 'second cycle failed to consume its next scheduled piece');

  // Leaving a death result books the run once; retrying preserves booked meta currency.
  const settlement = makeWorld(); settlement.phase = 'dead'; settlement.time = 100; settlement.gold = 55; settlement.kills = 10;
  const receipt = settlement.leave();
  assert.equal(receipt.earned, 76, 'death settlement did not calculate run currency');
  assert.equal(settlement.coins, 76, 'death settlement did not book currency');
  assert.equal(settlement.leave(), null, 'same run was settled more than once');
  settlement.start('normal');
  assert.equal(settlement.coins, 76, 'retry erased previously settled currency');

  console.log(`Combat and progression regression checks passed: 4 starting attacks, ${WEAPONS.length} weapons, ${passiveExpectations.length + 1} passives, difficulty HP, loop rollover, one-time settlement.`);
}
