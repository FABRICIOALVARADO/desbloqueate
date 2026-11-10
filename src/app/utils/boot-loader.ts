let finished=false;
export function bootProgress(value:number,label:string){
 const root=document.getElementById('boot-loader');if(!root||finished)return;
 const percent=Math.max(0,Math.min(100,Math.round(value)));
 document.getElementById('boot-progress')?.setAttribute('aria-valuenow',String(percent));
 const fill=document.getElementById('boot-fill');if(fill)fill.style.width=percent+'%';
 const number=document.getElementById('boot-value');if(number)number.textContent=String(percent);
 const status=document.getElementById('boot-status');if(status)status.textContent=label;
}
export function bootComplete(){bootProgress(100,'Todo listo. Bienvenido a tu espacio.');finished=true;setTimeout(()=>{const root=document.getElementById('boot-loader');root?.classList.add('leaving');setTimeout(()=>root?.remove(),400);},350);}
export function bootError(){const status=document.getElementById('boot-status');if(status)status.textContent='No pudimos preparar tu espacio. Comprueba tu conexión y vuelve a intentarlo.';const retry=document.getElementById('boot-retry');if(retry)retry.hidden=false;}
