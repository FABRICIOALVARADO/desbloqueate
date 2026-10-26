export function isClosedCircle(pts:readonly (readonly [number,number])[]):boolean{
 if(pts.length<16)return false;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
 if(w<70||h<70||w/h<.55||w/h>1.8)return false;
 const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
 const sectors=new Set(pts.map(p=>Math.floor((Math.atan2(p[1]-cy,p[0]-cx)+Math.PI)/(Math.PI*2)*12)));
 const radii=pts.map(p=>Math.hypot((p[0]-cx)/(w/2),(p[1]-cy)/(h/2)));
 const first=pts[0],last=pts[pts.length-1];
 return sectors.size>=10&&radii.filter(r=>r>.65&&r<1.25).length/pts.length>.85&&Math.hypot(first[0]-last[0],first[1]-last[1])<Math.max(w,h)*.3;
}
