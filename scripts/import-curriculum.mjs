import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const campus='https://ucontinental.edu.pe/campus/huancayo/';
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#8211;/g,'–').trim();
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${r.status} ${url}`);return r.text()}
const html=await get(campus),careers=new Map();
for(const m of html.matchAll(/<a\b([^>]*href="(https:\/\/ucontinental.edu.pe\/carrera\/[^"#]+)"[^>]*)>([\s\S]*?)<\/a>/g)){
 const mode=m[1].match(/modalidad === '([^']+)'/)?.[1];if(!mode)continue;
 const id=m[2].split('/').filter(Boolean).pop(),name=decode(m[3]),faculty=m[1].match(/data-facultad="([^"]+)"/)?.[1]||'';
 if(careers.has(id))careers.get(id).modalities.push(mode);else careers.set(id,{id,name,faculty,modalities:[mode],sourceUrl:m[2]+'plan-de-estudios/',cycles:[]});
}
const list=[...careers.values()],errors=[];
for(let k=0;k<list.length;k+=4){await Promise.all(list.slice(k,k+4).map(async c=>{
 try{const page=await get(c.sourceUrl);const chunks=[...page.matchAll(/<p class="h3[^\"]*">(\d+)<\/p>([\s\S]*?)(?=<p class="h3|$)/g)];
 for(const m of chunks){const courses=[...m[2].matchAll(/<div class="ml-4">([\s\S]*?)<\/div>\s*<div>C\.([\d.]*)<\/div>/g)].map(n=>({name:decode(n[1]),credits:n[2]?+n[2]:null,elective:/electiv/i.test(n[1])}));if(courses.length)c.cycles.push({number:+m[1],courses});}
 c.status=c.cycles.length>=8?'verified':'needs-review';c.consultedAt='2026-10-23';console.log(c.id,c.cycles.length,c.cycles.reduce((n,x)=>n+x.courses.length,0));
 }catch(e){c.status='unavailable';errors.push({career:c.id,error:e.message});}
}));}
const catalog={institution:'Universidad Continental',campus:'Huancayo',sourceUrl:campus,consultedAt:'2026-10-23',version:'Mallas publicadas en la web UC',careers:list,electiveGuidance:{sourceUrl:'https://tramites.ucontinental.edu.pe/es_ES/matricula/que-debo-considerar-antes-de-matricularme-en-una-asignatura-electiva',text:'Los grupos electivos de la malla no son una oferta de matrícula. Consulta las asignaturas disponibles, requisitos y créditos de tu plan en Vida Académica del Portal del Estudiante.',portalUrl:'https://estudiantes.continental.edu.pe/'},grading:{minimum:10.5,scale:20,sourceUrl:'https://ucontinental.edu.pe/documentos/informacion_institucional/reglamento-academico.pdf',articles:[81,84],note:'La nota mínima final es 10,50. Los pesos de evaluación corresponden al sílabo de cada asignatura. Ingresa las notas publicadas en tu portal.'},errors};
await mkdir(root+'src/assets',{recursive:true});await writeFile(root+'src/assets/curriculum.json',JSON.stringify(catalog,null,2));
const logo=html.match(/<img[^>]*src="([^"]+)"[^>]*alt="logo"/);if(logo){const u=new URL(logo[1],campus);await writeFile(root+'src/assets/uc-logo.svg',await get(u));await writeFile(root+'src/assets/uc-logo-source.txt',u.href+'\nConsultado: 2026-10-23\nMarca propiedad de Universidad Continental. Proyecto estudiantil independiente.\n');}
console.log(JSON.stringify({careers:list.length,courses:list.reduce((n,c)=>n+c.cycles.reduce((s,x)=>s+x.courses.length,0),0),errors}));

