/** Inertial horizontal navigation; transforms never drive layout. */
export class CareerMotion {
 private frame=0; private target=0; private last=0; private previous=0; private speed=0;
 private nativeTouch=false; private pointer:number|null=null; private x=0; private origin=0; private dragged=false;
 private handlers:Array<()=>void>=[]; private selected=-1;
 constructor(private el:HTMLElement,private grid:()=>boolean,private reduced:()=>boolean,private change:(index:number)=>void){
  this.target=el.scrollLeft;this.previous=el.scrollLeft;
  this.on('wheel',this.wheel as EventListener,{passive:false});
  this.on('scroll',()=>{if(this.nativeTouch)this.target=el.scrollLeft;if(!this.frame){this.target=el.scrollLeft;this.start();}},{passive:true});
  this.on('pointerdown',this.down as EventListener);this.on('pointermove',this.move as EventListener);
  this.on('pointerup',this.up as EventListener);this.on('pointercancel',this.cancel as EventListener);
  this.on('click',((e:MouseEvent)=>{if(this.dragged){e.preventDefault();e.stopImmediatePropagation();this.dragged=false;}}) as EventListener,true);
  this.on('keydown',()=>{this.dragged=false;});
  window.addEventListener('resize',this.refresh);this.start();
 }
 private on(type:string,fn:EventListener,options?:AddEventListenerOptions|boolean){this.el.addEventListener(type,fn,options);this.handlers.push(()=>this.el.removeEventListener(type,fn,options));}
 private clamp(n:number){return Math.max(0,Math.min(this.el.scrollWidth-this.el.clientWidth,n));}
 private wheel=(event:WheelEvent)=>{if(this.grid()||event.ctrlKey)return;event.preventDefault();this.nativeTouch=false;const unit=event.deltaMode===1?16:event.deltaMode===2?this.el.clientWidth:1;const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;this.target=this.clamp((this.frame?this.target:this.el.scrollLeft)+delta*unit*2.8);this.start();};
 private down=(e:PointerEvent)=>{this.nativeTouch=e.pointerType!=='mouse';if(this.nativeTouch){cancelAnimationFrame(this.frame);this.frame=0;}if(this.grid()||e.pointerType!=='mouse'||e.button!==0)return;this.pointer=e.pointerId;this.origin=this.x=e.clientX;this.target=this.el.scrollLeft;this.dragged=false;};
 private move=(e:PointerEvent)=>{if(e.pointerId!==this.pointer)return;if(Math.abs(e.clientX-this.origin)>6&&!this.dragged){this.dragged=true;this.el.setPointerCapture(e.pointerId);this.el.classList.add('is-dragging');}if(this.dragged){this.target=this.clamp(this.target+(this.x-e.clientX)*2);this.start();}this.x=e.clientX;};
 private up=(e:PointerEvent)=>{if(e.pointerId!==this.pointer)return;this.pointer=null;if(this.el.hasPointerCapture(e.pointerId))this.el.releasePointerCapture(e.pointerId);this.el.classList.remove('is-dragging');};
 private cancel=(e:PointerEvent)=>{this.up(e);this.dragged=false;};
 private refresh=()=>{this.target=this.clamp(this.el.scrollLeft);this.start();};
 reset(){cancelAnimationFrame(this.frame);this.frame=0;this.target=0;this.previous=0;this.el.scrollLeft=0;this.el.scrollTop=0;this.start();}
 step(delta:number){this.nativeTouch=false;const cards=Array.from(this.el.children) as HTMLElement[];const index=Math.max(0,Math.min(cards.length-1,this.selected+delta));const card=cards[index];if(!card)return;if(this.grid()){card.scrollIntoView({block:'nearest',behavior:'auto'});return;}this.target=this.clamp(card.offsetLeft+card.offsetWidth/2-this.el.clientWidth/2);this.start();}
 private start(){if(!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);}}
 private tick=(now:number)=>{
  const dt=Math.min(40,Math.max(1,now-this.last));this.last=now;
  const reduced=this.reduced();const grid=this.grid();
  if(!grid&&!this.nativeTouch){const diff=this.target-this.el.scrollLeft;this.el.scrollLeft=Math.abs(diff)<.6||reduced?this.target:this.el.scrollLeft+diff*(1-Math.exp(-dt/24));}
  const velocity=(this.el.scrollLeft-this.previous)*16.67/dt;this.previous=this.el.scrollLeft;this.speed+=(velocity-this.speed)*.25;
  const center=this.el.scrollLeft+this.el.clientWidth/2;let nearest=0,distance=Infinity;
  Array.from(this.el.children).forEach((child,index)=>{const card=child as HTMLElement;const offset=card.offsetLeft+card.offsetWidth/2-center;const d=Math.abs(offset);if(d<distance){distance=d;nearest=index;}
   if(d>this.el.clientWidth*1.6&&!grid)return;
   const x=Math.max(-2,Math.min(2,offset/this.el.clientWidth*2));const v=reduced?0:Math.max(-1,Math.min(1,this.speed/55));
   card.style.setProperty('--turn',`${grid||reduced?0:-x*30}deg`);card.style.setProperty('--depth',`${grid||reduced?0:-Math.abs(x)*150}px`);card.style.setProperty('--lift',`${grid||reduced?0:Math.sin(x*1.5)*65}px`);card.style.setProperty('--skew',`${grid||reduced?0:-v*3.5}deg`);card.style.setProperty('--parallax',`${grid||reduced?0:x*-24+v*12}px`);card.style.setProperty('--shine',`${50-x*25}%`);
   const flat=grid||reduced;
   card.style.setProperty('--roll',`${flat?0:Math.sin(x*1.25)*12+v*2}deg`);
   card.style.setProperty('--pitch',`${flat?0:Math.sin(x*1.5)*-9}deg`);
   if(flat){card.style.removeProperty('clip-path');}else{
    const top:string[]=[],bottom:string[]=[];
    for(let n=0;n<=24;n++){const u=n/24;const wave=Math.sin(((card.offsetLeft+u*card.offsetWidth-this.el.scrollLeft)/this.el.clientWidth)*Math.PI*2)*2.5;top.push(`${u*100}% ${7+wave}%`);bottom.unshift(`${u*100}% ${93+wave}%`);}
    card.style.clipPath=`polygon(${top.concat(bottom).join(',')})`;
   }

  });
  if(nearest!==this.selected&&!grid){this.selected=nearest;this.change(nearest);}
  this.el.style.setProperty('--travel',`${-this.el.scrollLeft*.12}px`);
  this.frame=0;if(!grid&&(Math.abs(this.target-this.el.scrollLeft)>.6||Math.abs(this.speed)>.12))this.frame=requestAnimationFrame(this.tick);
 };
 dispose(){cancelAnimationFrame(this.frame);this.handlers.forEach(f=>f());window.removeEventListener('resize',this.refresh);}
}
