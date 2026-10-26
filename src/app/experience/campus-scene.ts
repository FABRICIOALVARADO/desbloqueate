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
 positions.forEach(([x,y],i)=>{const g=new T.Group();g.position.set(x,y,0);g.userData['baseY']=y;g.userData['stage']=i+1;g.rotation.set(.08,i%2?-.2:.2,i%2?.06:-.06);this.world.add(g);this.icons.push(g);
 if(i===0){ // soft stacked books
 for(let j=0;j<3;j++){const book=new T.Group();book.position.set(0,(j-1)*.52,0);book.rotation.y=(j-1)*.12;g.add(book);this.box(book,0,0,0,2.2,.43,1.25,['#b59ae5','#88b7bd','#e8b578'][j]);this.box(book,.08,.015,.045,1.94,.27,1.2,'#fff5e2',.05);}
 }else if(i===1){ // calculator, raised keys and display
 this.box(g,0,0,0,1.65,2.3,.55,'#b4a1df');this.box(g,0,.65,.3,1.25,.43,.08,'#363747',.05);
 for(let row=0;row<3;row++)for(let col=0;col<3;col++)this.box(g,(col-1)*.44,-.05-row*.43,.33,.3,.3,.18,col===2?'#e9bc7c':'#f7efe7',.08);
 this.box(g,.3,.65,.36,.34,.035,.02,'#d6eccb',.01);
 }else if(i===2){ // clipboard with raised check and lines
 this.box(g,0,0,0,1.85,2.3,.25,'#dbb589');this.box(g,0,-.02,.16,1.57,1.98,.08,'#fff5e8',.07);this.box(g,0,1.03,.22,.75,.29,.2,'#b79add',.09);
 for(let row=0;row<3;row++){this.box(g,.22,.48-row*.5,.23,.76,.09,.06,'#ada5be',.03);const tick=this.box(g,-.49,.48-row*.5,.23,.24,.09,.08,'#86b5a0',.03);tick.rotation.z=.6;}
 }else{ // friendly community silhouettes and speech bubble
 for(const [xx,yy,rr,cc] of [[-.65,0,.3,'#9fbac8'],[.65,0,.3,'#dcb68e'],[0,.35,.36,'#b69be5']] as [number,number,number,string][]){this.ball(g,xx,yy+.3,.1,rr,cc);this.box(g,xx,yy-.35,0,rr*1.8,.75,.55,cc,.2);}
 this.box(g,.9,1.15,0,1.05,.62,.3,'#f6efdf',.17);for(let k=0;k<3;k++)this.ball(g,.65+k*.25,1.15,.18,.055,'#9e8bbd');
 }
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
