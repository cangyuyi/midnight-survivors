export type InputState = { x: number; y: number; pointerX: number; pointerY: number; pointerActive: boolean };
export class Input {
  readonly keys = new Set<string>();
  readonly state: InputState = { x: 0, y: 0, pointerX: 0, pointerY: 0, pointerActive: false };
  private pointerDown = false;
  private canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, private changed: (key: string) => void) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.down); window.addEventListener('keyup', this.up);
    canvas.addEventListener('pointermove', this.move); canvas.addEventListener('pointerdown', this.downPointer); window.addEventListener('pointerup', this.upPointer); canvas.addEventListener('pointerleave', this.leave);
  }
  private down = (e: KeyboardEvent) => { const key = e.key.toLowerCase(); if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault(); this.keys.add(key); this.changed(key); };
  private up = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  private move = (e: PointerEvent) => { const r = this.canvas.getBoundingClientRect(); this.state.pointerX = e.clientX-r.left-r.width/2; this.state.pointerY=e.clientY-r.top-r.height/2; this.state.pointerActive=true; };
  private downPointer = (e: PointerEvent) => { if (e.button === 0) this.pointerDown = true; };
  private upPointer = () => { this.pointerDown = false; };
  private leave = () => { if (!this.pointerDown) this.state.pointerActive=false; };
  read(): InputState { let x=(this.keys.has('a')||this.keys.has('arrowleft')?-1:0)+(this.keys.has('d')||this.keys.has('arrowright')?1:0); let y=(this.keys.has('w')||this.keys.has('arrowup')?-1:0)+(this.keys.has('s')||this.keys.has('arrowdown')?1:0); if (!x&&!y&&this.state.pointerActive&&this.pointerDown) { const {pointerX:px,pointerY:py}=this.state; if(Math.hypot(px,py)>26){x=Math.sign(px);y=Math.sign(py);} } const n=Math.hypot(x,y)||1; return { ...this.state, x:x/n, y:y/n }; }
  dispose(): void { window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerdown',this.downPointer);window.removeEventListener('pointerup',this.upPointer);this.canvas.removeEventListener('pointerleave',this.leave); }
}
