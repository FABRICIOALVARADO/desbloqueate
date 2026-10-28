import {FloatingIcons} from './floating-icons';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader.js';
import {ucMark} from './uc-mark';
export class CampusScene{
 private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(40,1,.1,100);private world=new T.Group();private icons:T.Group[]=[];private logo=new T.Group();private hit:T.Object3D[]=[];private ray=new T.Raycaster();private observer:ResizeObserver;private frame=0;private clock=new T.Clock();private dead=false;private started=false;private stage=0;private zoom=1;private angle=0;private pointer=new T.Vector2();private last=0;private arrival=0;
 constructor(private canvas:HTMLCanvasElement,private reduced:boolean,private pick:(n:number)=>void){
 this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
 this.scene.background=new T.Color('#09090f');this.scene.add(new T.HemisphereLight('#fff4ff','#48415d',2.2));const a=new T.DirectionalLight('#fff3e5',3);a.position.set(-5,8,10);this.scene.add(a);const b=new T.DirectionalLight('#b396ff',3);b.position.set(6,2,1);this.scene.add(b);this.scene.add(this.world);this.build();this.world.visible=false;this.camera.position.set(0,0,22);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();this.animate();}
 private mat(c:string){return new T.MeshStandardMaterial({color:c,roughness:.48,metalness:.03});}
 private box(g:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,c:string,r=.12){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),this.mat(c));m.position.set(x,y,z);g.add(m);return m;}
 private ball(g:T.Object3D,x:number,y:number,z:number,r:number,c:string){const m=new T.Mesh(new T.SphereGeometry(r,24,16),this.mat(c));m.position.set(x,y,z);g.add(m);return m;}
 private build(){
 const data=new SVGLoader().parse(ucMark);for(const p of data.paths)for(const shape of SVGLoader.createShapes(p)){const geo=new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.35,bevelThickness:.35,curveSegments:24});geo.translate(-26.8,-19.5,-1);const m=new T.Mesh(geo,this.mat('#f5efff'));m.scale.set(.075,-.075,.075);this.logo.add(m);}
 this.world.add(this.logo);this.logo.rotation.y=-.14;
 const positions=[[-4.8,2.25],[4.8,2.25],[-4.8,-1.55],[4.8,-1.55]];
 positions.forEach(([x,y],i)=>{const g=new FloatingIcons().create(i);g.position.set(x,y,0);g.userData['baseY']=y;g.userData['stage']=i+1;g.rotation.set(.08,i%2?-.2:.2,i%2?.06:-.06);this.world.add(g);this.icons.push(g);
 g.traverse(o=>{if(o instanceof T.Mesh){o.userData['stage']=i+1;this.hit.push(o);}});
 });
 // A delicate orbital line makes the central relationship clear without a ground plane.
 const orbit=new T.Mesh(new T.TorusGeometry(3.2,.009,6,120),new T.MeshBasicMaterial({color:'#645077',transparent:true,opacity:.4}));orbit.scale.set(1.75,.82,1);orbit.rotation.x=.2;orbit.position.z=-1;this.world.add(orbit);
 }
 start(){this.started=true;this.world.visible=true;this.arrival=0;}
 setStage(n:number){this.stage=n;}
 move(x:number,y:number){this.pointer.set(x,y);}
 orbit(d:number){this.angle=T.MathUtils.clamp(this.angle+d,-.45,.45);}
 zoomBy(d:number){this.zoom=T.MathUtils.clamp(this.zoom+d,.8,1.3);}
 setReduced(v:boolean){this.reduced=v;}
 select(x:number,y:number){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new T.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);const h=this.ray.intersectObjects(this.hit)[0];if(h)this.pick(h.object.userData['stage']);}
 private resize(){this.renderer.setSize(this.canvas.clientWidth,this.canvas.clientHeight,false);this.camera.aspect=this.canvas.clientWidth/this.canvas.clientHeight;this.camera.updateProjectionMatrix();}
 private animate=()=>{if(this.dead)return;this.frame=requestAnimationFrame(this.animate);const t=this.clock.getElapsedTime(),dt=Math.min(.05,t-this.last);this.last=t;if(document.hidden)return;
 if(this.started)this.arrival+=dt;const mobile=this.camera.aspect<.8;this.camera.position.z=T.MathUtils.lerp(this.camera.position.z,(mobile?26:19)*this.zoom,.08);
 this.camera.position.x=this.reduced?0:this.pointer.x*.25;this.camera.position.y=mobile?-1.5:-1.3;this.camera.lookAt(0,mobile?-1.5:-1.3,0);
 this.world.rotation.y=this.reduced?0:this.angle;this.logo.position.y=(mobile?2:1)+(this.reduced?0:Math.sin(t*.8)*.12);this.logo.rotation.y=this.reduced?-.1:Math.sin(t*.4)*.12-.1;
 this.icons.forEach((g,i)=>{const f=this.reduced?1:T.MathUtils.smoothstep(this.arrival-i*.1,0,.85);const s=(this.stage===i+1?1.12:1)*f;g.scale.lerp(new T.Vector3(s,s,s),.15);g.position.x=(i%2?1:-1)*(mobile?2.5:4.8);g.position.y=(i<2?(mobile?4.7:2.25):(mobile?-.6:-1.55))+(this.reduced?0:Math.sin(t*.7+i)*.16);});
 this.renderer.render(this.scene,this.camera);};
 dispose(){this.dead=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.scene.traverse(o=>{const m=o as T.Mesh;m.geometry?.dispose();if(m.material)for(const a of Array.isArray(m.material)?m.material:[m.material])a.dispose();});this.renderer.dispose();}
}
