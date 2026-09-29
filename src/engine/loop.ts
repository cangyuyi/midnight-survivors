export class FixedLoop {
  private raf=0; private last=0; private acc=0; private readonly step=1/60;
  constructor(private update:(dt:number)=>void, private draw:(alpha:number)=>void){}
  start():void { this.last=performance.now(); const frame=(now:number)=>{const elapsed=Math.min((now-this.last)/1000,0.05);this.last=now;this.acc+=elapsed;let n=0;while(this.acc>=this.step&&n<3){this.update(this.step);this.acc-=this.step;n++;}if(n===3)this.acc=Math.min(this.acc,this.step);this.draw(this.acc/this.step);this.raf=requestAnimationFrame(frame)};this.raf=requestAnimationFrame(frame); }
  stop():void {cancelAnimationFrame(this.raf)}
}
