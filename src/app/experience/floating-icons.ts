import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export class FloatingIcons {
 private mat(c:string){return new T.MeshStandardMaterial({color:c,roughness:.48,metalness:.03});}
 private box(g:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,c:string,r=.12){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),this.mat(c));m.position.set(x,y,z);g.add(m);return m;}
 private ball(g:T.Object3D,x:number,y:number,z:number,r:number,c:string){const m=new T.Mesh(new T.SphereGeometry(r,24,16),this.mat(c));m.position.set(x,y,z);g.add(m);return m;}
create(i:number){const g=new T.Group();
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
return g;}
}
export function iconImages():string[]{const canvas=document.createElement('canvas'),r=new T.WebGLRenderer({canvas,antialias:true,alpha:true});r.setSize(128,128);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.25;const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,20);camera.position.set(0,0,4.5);scene.add(new T.HemisphereLight('#fff4ff','#48415d',2.2));const light=new T.DirectionalLight('#fff3e5',3);light.position.set(-5,8,10);scene.add(light);const factory=new FloatingIcons(),images:string[]=[];for(let i=0;i<4;i++){const icon=factory.create(i);icon.rotation.set(.08,-.2,-.05);scene.add(icon);r.render(scene,camera);images.push(canvas.toDataURL('image/png'));scene.remove(icon);icon.traverse(o=>{const m=o as T.Mesh;m.geometry?.dispose();if(m.material)for(const a of Array.isArray(m.material)?m.material:[m.material])a.dispose();});}r.dispose();return images;}
