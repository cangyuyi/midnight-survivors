export type SpriteBank = {
  characters: HTMLCanvasElement[];
  enemies: HTMLCanvasElement[];
  projectiles: HTMLCanvasElement[];
  enemyShot: HTMLCanvasElement;
};

const makeCanvas = (size: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(size / 2, size / 2);
  draw(ctx);
  return canvas;
};

const path = (ctx: CanvasRenderingContext2D, points: readonly [number, number][]): void => {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
};

const outline = (ctx: CanvasRenderingContext2D, color = '#101525', width = 4): void => {
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
};

function bakeHero(index: number): HTMLCanvasElement {
  const characterColors = ['#c5a76c', '#8fb5dc', '#d895ae', '#d98b55'];
  const color = characterColors[index]!;
  return makeCanvas(64, ctx => {
    ctx.fillStyle = color; ctx.strokeStyle = '#fff9'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#171521'; ctx.fillRect(-8, -4, 4, 5); ctx.fillRect(5, -4, 4, 5);
    ctx.fillStyle = '#f4e6ce'; ctx.fillRect(8, -2, 13, 4);
  });
}

function bakeEnemy(index: number): HTMLCanvasElement {
  const colors = ['#9184b6','#c5d8c8','#927656','#72619a','#c96055','#5279a1','#a2b85f','#d7b35e','#867777','#e6586a','#d8b365','#f1d38b'];
  const color = colors[index]!;
  const dark = '#17182a';
  return makeCanvas(index === 11 ? 144 : 80, ctx => {
    const r = index === 11 ? 49 : 25;
    const fill = ctx.createRadialGradient(-r * .35, -r * .48, 2, 0, 0, r * 1.25);
    fill.addColorStop(0, '#fff7d2'); fill.addColorStop(.18, color); fill.addColorStop(1, dark);
    ctx.shadowColor = color; ctx.shadowBlur = index >= 9 ? 22 : 9;
    // Main silhouette unique to each enemy family.
    if (index === 0) { // wraith
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(-23, -16); ctx.quadraticCurveTo(-23, -42, 0, -38); ctx.quadraticCurveTo(26, -35, 23, -8); ctx.lineTo(28, 25); ctx.lineTo(13, 16); ctx.lineTo(1, 29); ctx.lineTo(-11, 17); ctx.lineTo(-27, 27); ctx.lineTo(-21, 1); ctx.closePath(); ctx.fill(); outline(ctx, dark, 4);
      ctx.fillStyle = '#ffe8ff'; ctx.fillRect(-12, -12, 8, 4); ctx.fillRect(5, -12, 8, 4);
    } else if (index === 1) { // bone hound
      ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(0, 0, 27, 15, -.1, 0, Math.PI * 2); ctx.fill(); outline(ctx, dark);
      ctx.fillStyle = '#eee3ca'; ctx.beginPath(); ctx.moveTo(12, -7); ctx.lineTo(36, -14); ctx.lineTo(31, 2); ctx.lineTo(15, 9); ctx.closePath(); ctx.fill(); outline(ctx, dark, 3);
      ctx.fillStyle = '#f8e69e'; ctx.fillRect(22, -8, 5, 4);
      ctx.strokeStyle = '#e6dfce'; ctx.lineWidth = 4; [-13, 7].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x - 5, 26); ctx.moveTo(x + 10, 8); ctx.lineTo(x + 14, 23); ctx.stroke(); });
      ctx.strokeStyle = '#fff0c2'; ctx.lineWidth = 2; [-10, -2, 6].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, 10); ctx.stroke(); });
    } else if (index === 2) { // stone golem
      ctx.fillStyle = fill; path(ctx, [[-24,-24],[-9,-34],[7,-27],[23,-20],[27,10],[17,29],[-17,28],[-27,9]]); ctx.fill(); outline(ctx,dark,5);
      ctx.fillStyle = '#d1ad73'; path(ctx,[[-9,-9],[1,-20],[10,-7],[1,2]]); ctx.fill(); path(ctx,[[7,11],[17,5],[20,17],[10,22]]); ctx.fill();
      ctx.fillStyle = '#f5e3a4'; ctx.fillRect(-15,-10,6,5); ctx.fillRect(8,-10,6,5);
    } else if (index === 3) { // bat swarm
      ctx.fillStyle = fill; path(ctx,[[-3,-7],[-14,-27],[-13,-10],[-33,-21],[-26,4],[-14,14],[-20,28],[-3,18],[3,18],[21,29],[16,12],[29,4],[34,-19],[13,-10],[11,-28]]); ctx.fill(); outline(ctx,dark,4);
      ctx.fillStyle = '#f4dcff'; ctx.fillRect(-10,-3,5,4); ctx.fillRect(6,-3,5,4);
    } else if (index === 4 || index === 8 || index === 9) { // armored bruisers
      ctx.fillStyle = fill; path(ctx,[[-21,-20],[-12,-30],[9,-28],[22,-14],[20,14],[11,29],[-15,26],[-25,8]]); ctx.fill(); outline(ctx,dark,5);
      ctx.fillStyle = index === 8 ? '#9b9692' : '#373449'; path(ctx,[[-19,-18],[-8,-31],[12,-26],[20,-14],[3,-8],[-17,-8]]); ctx.fill(); outline(ctx,dark,3);
      ctx.fillStyle = index === 9 ? '#ffe17e' : '#ff716f'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.fillRect(-12,-8,8,4); ctx.fillRect(6,-8,8,4); ctx.shadowBlur = 0;
      ctx.fillStyle = '#d9c4a0'; path(ctx,[[10,7],[34,11],[31,17],[10,15]]); ctx.fill(); outline(ctx,dark,3);
      ctx.fillStyle = color; ctx.fillRect(-20,5,40,5); ctx.fillStyle = '#f9d276'; ctx.fillRect(-3,4,7,7);
    } else if (index === 5 || index === 10) { // robed caster / bishop
      ctx.fillStyle = fill; path(ctx,[[-17,-15],[-21,8],[-34,28],[0,21],[34,28],[19,6],[17,-15]]); ctx.fill(); outline(ctx,dark,4);
      ctx.fillStyle = index === 10 ? '#d5bd8a' : '#344d72'; path(ctx,[[-22,-17],[-10,-38],[11,-39],[23,-16],[10,-10],[-10,-10]]); ctx.fill(); outline(ctx,dark,4);
      ctx.fillStyle = '#171929'; ctx.fillRect(-13,-13,26,8); ctx.fillStyle = '#ff7c72'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.fillRect(-8,-11,5,4); ctx.fillRect(4,-11,5,4); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffe7a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,6,10,0,Math.PI*2); ctx.stroke();
    } else if (index === 6) { // split pod
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0,-35); ctx.bezierCurveTo(34,-12,25,19,0,30); ctx.bezierCurveTo(-25,19,-34,-12,0,-35); ctx.fill(); outline(ctx,dark,4);
      ctx.strokeStyle = '#dfdf8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(-3,-4); ctx.lineTo(10,4); ctx.lineTo(0,25); ctx.stroke();
      ctx.fillStyle = '#ffef9c'; ctx.beginPath(); ctx.arc(-8,-5,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10,-5,4,0,Math.PI*2); ctx.fill();
    } else if (index === 7) { // drifting lantern
      ctx.strokeStyle = '#e7c775'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0,-29); ctx.quadraticCurveTo(23,-8,0,20); ctx.quadraticCurveTo(-23,-8,0,-29); ctx.fill(); outline(ctx,dark,3);
      ctx.fillStyle = '#fff0a5'; ctx.shadowColor = '#ffca64'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(0,-3,7,13,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (index === 11) { // dawn devourer boss
      ctx.fillStyle = '#6f334e'; ctx.beginPath(); ctx.ellipse(0,5,48,51,0,0,Math.PI*2); ctx.fill(); outline(ctx,'#20192c',8);
      ctx.fillStyle = fill; path(ctx,[[-38,-15],[-43,-49],[-23,-38],[-12,-62],[2,-39],[25,-55],[27,-32],[43,-23],[37,22],[20,44],[-17,45],[-39,20]]); ctx.fill(); outline(ctx,'#241b31',5);
      ctx.fillStyle = '#f0c478'; path(ctx,[[-35,-20],[-47,-62],[-18,-39],[-7,-70],[4,-38],[35,-64],[23,-24]]); ctx.fill(); outline(ctx,'#392037',4);
      ctx.fillStyle = '#27182e'; path(ctx,[[-27,-16],[0,-5],[28,-17],[22,15],[0,27],[-24,13]]); ctx.fill();
      ctx.shadowColor = '#ff696c'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff2a5'; ctx.fillRect(-20,-9,12,7); ctx.fillRect(9,-9,12,7); ctx.shadowBlur = 0;
      ctx.fillStyle = '#e65369'; path(ctx,[[-22,18],[0,10],[23,17],[13,35],[0,30],[-13,36]]); ctx.fill();
      ctx.strokeStyle = '#ffe4a3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,2,37,-2.7,-.45); ctx.stroke();
    } else { // puff ghosts
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0,0,23,0,Math.PI*2); ctx.fill(); outline(ctx,dark,4);
    }
    ctx.shadowBlur = 0;
    // Shared sharp eyes and glints for the simpler families.
    if (index !== 0 && index !== 1 && index !== 3 && index !== 4 && index !== 5 && index !== 6 && index !== 7 && index !== 8 && index !== 9 && index !== 10 && index !== 11) {
      ctx.fillStyle = '#fff2ab'; ctx.fillRect(-11,-7,5,4); ctx.fillRect(7,-7,5,4);
    }
    // Elites have a broken gold crown halo, visibly different at a glance.
    if (index === 9 || index === 10) {
      ctx.strokeStyle = '#ffd96d'; ctx.lineWidth = 3; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.arc(0,0,35,Math.PI,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    }
  });
}

function bakeProjectile(index: number): HTMLCanvasElement {
  const colors = ['#e8f4ff','#e7d5ff','#ffd375','#c1aaff','#fff0a0','#ff8e45','#9beaff','#d7ecff','#ffdf86'];
  const color = colors[index]!;
  return makeCanvas(48, ctx => {
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    if (index === 0) { path(ctx,[[-18,0],[10,-6],[21,0],[10,6]]); ctx.fillStyle = '#d9e8f1'; ctx.fill(); outline(ctx,'#253047',3); ctx.fillStyle = '#fff'; ctx.fillRect(-6,-2,15,2); }
    else if (index === 2) { ctx.fillStyle='#785642';ctx.fillRect(-2,-17,5,34);ctx.fillStyle='#f8d16d';path(ctx,[[-8,-5],[13,-14],[20,-12],[4,2],[-8,1]]);ctx.fill();outline(ctx,'#30263a',3); }
    else if (index === 5) { const g=ctx.createRadialGradient(-3,-5,1,0,0,14);g.addColorStop(0,'#fff9bf');g.addColorStop(.3,'#ffbd55');g.addColorStop(1,'#ed4f45');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-19);ctx.bezierCurveTo(19,-3,13,14,0,16);ctx.bezierCurveTo(-15,11,-16,-3,0,-19);ctx.fill();outline(ctx,'#652d45',3);ctx.fillStyle='#fff3b0';ctx.beginPath();ctx.arc(0,2,4,0,Math.PI*2);ctx.fill(); }
    else { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,15,8,0,0,Math.PI*2);ctx.fill();outline(ctx,'#29243e',3);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(2,-2,7,3,0,0,Math.PI*2);ctx.fill(); }
    ctx.shadowBlur=0;
  });
}

export function bakeSprites(): SpriteBank {
  return {
    characters: Array.from({ length: 4 }, (_, i) => bakeHero(i)),
    enemies: Array.from({ length: 12 }, (_, i) => bakeEnemy(i)),
    projectiles: Array.from({ length: 9 }, (_, i) => bakeProjectile(i)),
    enemyShot: makeCanvas(32, ctx => {
      ctx.shadowColor = '#ff647b'; ctx.shadowBlur = 14;
      const g=ctx.createRadialGradient(-3,-4,1,0,0,12);g.addColorStop(0,'#fff6d0');g.addColorStop(.35,'#ff8693');g.addColorStop(1,'#ba315e');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(11,-3);ctx.lineTo(7,10);ctx.lineTo(-5,12);ctx.lineTo(-12,1);ctx.closePath();ctx.fill();outline(ctx,'#451d39',3);
    }),
  };
}
