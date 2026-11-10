import {Component,ElementRef,ViewChild,Input,AfterViewInit,OnChanges,OnDestroy} from '@angular/core';
import type {AnimationItem} from 'lottie-web';
@Component({selector:'app-academic-book',standalone:true,template:`<div #canvas class="book-animation" aria-hidden="true"></div>`,styles:[`:host{display:block;width:100%;height:260px}.book-animation{width:100%;height:100%}`]})
export class AcademicBookComponent implements AfterViewInit,OnChanges,OnDestroy{
 @ViewChild('canvas',{static:true}) canvas!:ElementRef<HTMLDivElement>;
 @Input() opened=false;@Input() reduceMotion=false;
 private animation?:AnimationItem;private destroyed=false;
 async ngAfterViewInit(){try{const [module,response]=await Promise.all([import('lottie-web'),fetch('/assets/academic-book.json')]);if(!response.ok)throw Error('Libro no disponible');const data=await response.json();if(this.destroyed)return;
 // Catalog-backed controls remain real HTML; the generated book is decorative.
 data.layers=data.layers.filter((layer:any)=>!(/^(label_|milestone_|timeline_line_|meta_|inicio_|course_button_)/.test(layer.nm)));
 this.animation=module.default.loadAnimation({container:this.canvas.nativeElement,renderer:'svg',loop:false,autoplay:false,animationData:data});this.animation.addEventListener('DOMLoaded',()=>this.update());}catch{if(!this.destroyed)this.canvas.nativeElement.textContent='📖';}}
 ngOnChanges(){this.update();}
 private update(){if(!this.animation)return;const reduced=this.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;if(!this.opened)this.animation.goToAndStop(0,true);else if(reduced)this.animation.goToAndStop(89,true);else this.animation.goToAndPlay(0,true);}
 ngOnDestroy(){this.destroyed=true;this.animation?.destroy();}
}
