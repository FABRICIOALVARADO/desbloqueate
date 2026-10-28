import {Career} from '../models/planner';
import {normalizeSearch} from '../utils/plan-parser';
import {isClosedCircle} from './circle-gesture';
import {Component,AfterViewInit,OnDestroy,ElementRef,ViewChild,Output,EventEmitter,NgZone,ChangeDetectorRef,Input,HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import type {CampusScene} from './campus-scene';
@Component({selector:'app-experience',standalone:true,imports:[CommonModule],templateUrl:'./experience.component.html',styleUrl:'./experience.component.css'})
export class ExperienceComponent implements AfterViewInit,OnDestroy{
 @ViewChild('world',{static:true}) canvas!:ElementRef<HTMLCanvasElement>;
 @Input() careers:Career[]=[];@Output() chooseCareer=new EventEmitter<string>();@Output() enter=new EventEmitter<string>();
 @ViewChild('careerTrack') careerTrack?:ElementRef<HTMLElement>;
 careerOpen=false;careerQuery='';careerIndex=0;
 facultyName(code:string){return ({EMP:'Ciencias de la Empresa',ING:'Ingeniería',SAL:'Ciencias de la Salud',HUM:'Humanidades',DER:'Derecho'} as Record<string,string>)[code]||code||'Mi plan personal';}
 get careerResults(){return this.careers.filter(c=>normalizeSearch(c.name+' '+this.facultyName(c.faculty)).includes(normalizeSearch(this.careerQuery)));}
 openCareers(){this.careerOpen=true;this.menu=false;this.careerIndex=0;}
 filterCareers(e:Event){this.careerQuery=(e.target as HTMLInputElement).value;this.careerIndex=0;this.careerTrack?.nativeElement.scrollTo({left:0});}
 careerScroll(){const el=this.careerTrack?.nativeElement;if(!el)return;const cards=Array.from(el.children) as HTMLElement[];const center=el.scrollLeft+el.clientWidth/2;let nearest=0,delta=Infinity;cards.forEach((c,i)=>{const d=Math.abs(c.offsetLeft+c.offsetWidth/2-center);if(d<delta){delta=d;nearest=i;}});this.careerIndex=nearest;}
 careerWheel(e:WheelEvent){if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();this.careerTrack?.nativeElement.scrollBy({left:e.deltaY,behavior:'auto'});}}
 moveCareer(delta:number){const cards=this.careerTrack?.nativeElement.children;const i=Math.max(0,Math.min(this.careerResults.length-1,this.careerIndex+delta));(cards?.[i] as HTMLElement|undefined)?.scrollIntoView({behavior:this.reduceMotion?'auto':'smooth',block:'nearest',inline:'center'});}
 selectCareer(id:string){this.chooseCareer.emit(id);this.careerOpen=false;this.leave('courses');}
 activate(){this.current.view==='courses'?this.openCareers():this.leave(this.current.view);}
@Input() reduceMotion=false;@Input() directEntry=true;
 pencilX=0;pencilY=0;pencilVisible=false;
 ready=false;failed=false;started=false;stage=0;visited=new Set<number>();menu=false;audioOn=false;audioError='';drawing=false;trace='';drawingHint='';dragged=false;
 stages=[
 {name:'El comienzo',tag:'TU PRÓXIMA VERSIÓN',title:'Tu futuro empieza',accent:'con un paso.',body:'Un mundo para conectar tus cursos, organizar tus entregas y descubrir de lo que eres capaz.',action:'Entrar a mi espacio',view:'home'},
 {name:'Tus cursos',tag:'01 / ENCUENTRA TU CAMINO',title:'Una carrera.',accent:'Tu propia ruta.',body:'Explora la malla por carrera y ciclo. Elige las asignaturas que forman parte de tu siguiente etapa.',action:'Explorar mi malla',view:'courses'},
 {name:'Tus notas',tag:'02 / DALE CLARIDAD',title:'Menos dudas.',accent:'Más posibilidades.',body:'Encuentra tu curso y calcula cuánto necesitas en las evaluaciones pendientes para alcanzar tu meta.',action:'Calcular mis notas',view:'grades'},
 {name:'Tus entregas',tag:'03 / HAZ QUE SUCEDA',title:'De pendiente',accent:'a conseguido.',body:'Transforma una entrega grande en un primer paso. Organiza tus tareas, archivos y recordatorios.',action:'Ver mis tareas',view:'tasks'},
 {name:'Tu comunidad',tag:'04 / AVANZAMOS JUNTOS',title:'Tu siguiente idea',accent:'puede estar aquí.',body:'Descubre las tareas que otros estudiantes decidieron compartir. Tus trabajos siguen privados hasta que tú elijas.',action:'Explorar comunidad',view:'community'}
 ];
 private scene?:CampusScene;private dead=false;private audio?:AudioContext;private oscillators:OscillatorNode[]=[];private gain?:GainNode;private oldOverflow='';private lastWheel=0;private sx=0;private sy=0;private px=0;private points:[number,number][]=[];
 constructor(private zone:NgZone,private cd:ChangeDetectorRef){}
 async ngAfterViewInit(){this.oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';this.reduceMotion=this.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;try{const {CampusScene}=await import('./campus-scene');if(this.dead)return;this.zone.runOutsideAngular(()=>this.scene=new CampusScene(this.canvas.nativeElement,this.reduceMotion,n=>this.zone.run(()=>this.setStage(n))));this.ready=true;this.cd.detectChanges();}catch{this.failed=true;this.ready=true;this.cd.detectChanges();}}
 get current(){return this.stages[this.stage];}
 begin(){if(!this.ready)return;if(this.directEntry){this.leave('tasks');return;}this.started=true;this.visited.add(0);this.scene?.start();this.trace='';this.drawing=false;this.drawingHint='';}
 setStage(n:number){if(!this.started)this.begin();this.stage=(n+this.stages.length)%this.stages.length;this.visited.add(this.stage);this.scene?.setStage(this.stage);}
 leave(view='home'){this.enter.emit(view);}
 toggleMotion(){this.reduceMotion=!this.reduceMotion;this.scene?.setReduced(this.reduceMotion);}
 wheel(e:WheelEvent){if(!this.started||this.menu||this.careerOpen||Math.abs(e.deltaY)<20)return;e.preventDefault();const now=Date.now();if(now-this.lastWheel<1200)return;this.lastWheel=now;this.setStage(this.stage+(e.deltaY>0?1:-1));}
 @HostListener('window:keydown',['$event']) key(e:KeyboardEvent){if((e.target as HTMLElement).tagName==='INPUT')return;if(this.careerOpen){if(e.key==='Escape')this.careerOpen=false;if(e.key==='ArrowRight'){e.preventDefault();this.moveCareer(1);}if(e.key==='ArrowLeft'){e.preventDefault();this.moveCareer(-1);}return;}if(e.key==='Escape'){this.menu?this.menu=false:this.leave();}if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();this.setStage(this.stage+1);}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();this.setStage(this.stage-1);}}
 pointerDown(e:PointerEvent){this.pencilX=e.offsetX;this.pencilY=e.offsetY;this.pencilVisible=true;this.sx=this.px=e.clientX;this.sy=e.clientY;this.dragged=false;this.drawing=true;this.points=[[e.offsetX,e.offsetY]];this.trace='M '+e.offsetX+' '+e.offsetY;(e.target as HTMLElement).setPointerCapture(e.pointerId);}
 pointerMove(e:PointerEvent){this.pencilX=e.offsetX;this.pencilY=e.offsetY;this.pencilVisible=true;this.scene?.move((e.clientX/innerWidth-.5)*2,(e.clientY/innerHeight-.5)*2);if(!this.drawing)return;if(Math.hypot(e.clientX-this.sx,e.clientY-this.sy)>8)this.dragged=true;if(this.started){this.scene?.orbit((e.clientX-this.px)*.005);this.px=e.clientX;return;}this.points.push([e.offsetX,e.offsetY]);this.trace+=' L '+e.offsetX+' '+e.offsetY;}
 pointerUp(e:PointerEvent){if(!this.drawing)return;this.drawing=false;if(this.started){if(!this.dragged)this.scene?.select(e.clientX,e.clientY);if(e.pointerType==='touch'&&Math.abs(e.clientY-this.sy)>85&&Math.abs(e.clientY-this.sy)>Math.abs(e.clientX-this.sx))this.setStage(this.stage+(e.clientY<this.sy?1:-1));return;}
  if(isClosedCircle(this.points))this.begin();else{this.trace='';this.drawingHint='Cierra el círculo, o pulsa «Comenzar recorrido».';}}
 zoom(delta:number){this.scene?.zoomBy(delta);}
 async toggleAudio(){this.audioError='';try{if(this.audioOn){await this.audio?.suspend();this.audioOn=false;return;}if(!this.audio){this.audio=new AudioContext();this.gain=this.audio.createGain();this.gain.gain.value=.018;this.gain.connect(this.audio.destination);[130.81,196,261.63].forEach((f,i)=>{const o=this.audio!.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=i*3;const g=this.audio!.createGain();g.gain.value=.25/(i+1);o.connect(g);g.connect(this.gain!);o.start();this.oscillators.push(o);});}await this.audio.resume();this.audioOn=true;}catch{this.audioError='El navegador no pudo activar el audio.';this.audioOn=false;}}
 ngOnDestroy(){this.dead=true;this.scene?.dispose();this.oscillators.forEach(o=>o.stop());void this.audio?.close();document.body.style.overflow=this.oldOverflow;}
}
