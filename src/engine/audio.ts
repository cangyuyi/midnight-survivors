export class AudioSynth {
  private ctx?: AudioContext; volume=0.3;
  private get(): AudioContext { return this.ctx ??= new AudioContext(); }
  tone(freq:number,duration=0.08,type:OscillatorType='sine',gain=0.08):void { if(!this.volume)return; const c=this.get(); if(c.state==='suspended') void c.resume(); const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain*this.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+duration);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration); }
  hit():void {this.tone(180,0.045,'triangle',0.06)} level():void {this.tone(520,0.12,'sine',0.08);setTimeout(()=>this.tone(780,0.18,'sine',0.07),70)}
}
