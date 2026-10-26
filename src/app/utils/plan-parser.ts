import { Course, Cycle } from '../models/catalog.model';
export const normalizeSearch=(s:string):string=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const roman:Record<string,number>={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10,xi:11,xii:12,xiii:13,xiv:14,xv:15,xvi:16,xvii:17,xviii:18,xix:19,xx:20};
const words:Record<string,number>={primer:1,primero:1,segundo:2,tercer:3,tercero:3,cuarto:4,quinto:5,sexto:6,septimo:7,octavo:8,noveno:9,decimo:10};
export interface PlanReport {cycles:Cycle[];warnings:string[];duplicates:number;ignored:number;count:number}
export function parsePlanReport(text:string):PlanReport {
 const groups=new Map<number,Course[]>(),warnings:string[]=[];let current=0,last:Course|undefined,duplicates=0,ignored=0;
 const warn=(s:string)=>{if(warnings.length<30)warnings.push(s);};
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 for(let i=0;i<lines.length;i++){
  const line=lines[i].replace(/^[\s•·–*]+/,'').replace(/^-\s+/,'').trim();if(!line)continue;
  const s=normalizeSearch(line).replace(/[º°ª]/g,'').replace(/[:.\-]+$/,'').trim();
  const h=s.match(/^(?:#+\s*|(?:ciclo|semestre)\s+)(\d{1,2}|[ivx]+|primer[o]?|segundo|tercer[o]?|cuarto|quinto|sexto|septimo|octavo|noveno|decimo)$/)||s.match(/^(\d{1,2}|[ivx]+|primer[o]?|segundo|tercer[o]?|cuarto|quinto|quinto|sexto|septimo|octavo|noveno|decimo)\s+(?:ciclo|semestre)$/)||s.match(/^(\d{1,2})$/);
  if(h){const n=Number(h[1])||roman[h[1]]||words[h[1]];last=undefined;current=n>=1&&n<=20?n:0;if(current){if(!groups.has(current))groups.set(current,[]);}else warn('Línea '+(i+1)+': ciclo fuera de rango.');continue;}
  if(/^(ciclo|semestre)\b|\b(ciclo|semestre)$/.test(s)){current=0;last=undefined;ignored++;warn('Línea '+(i+1)+': encabezado no reconocido «'+line+'». Se detiene la asignación al ciclo anterior.');continue;}
  if(/^(total\b|creditos\b|asignatura\s+creditos|curso\s+creditos|pagina\s+\d)/.test(s))continue;
  const credit=line.match(/^C\.?\s*(\d+(?:[.,]\d+)?)$/i);
  if(credit){if(last)last.credits=Number(credit[1].replace(',','.'));else{ignored++;warn('Línea '+(i+1)+': créditos sin curso asociado.');}continue;}
  if(!current){ignored++;continue;}
  const inline=line.match(/^(.*?)\s*(?:\|\s*|\s+C\.\s*|\t+)(\d+(?:[.,]\d+)?)\s*$/i);
  const name=(inline?inline[1]:line).trim();
  if(!/[a-záéíóúñ]/i.test(name)||name.length>200||name.includes('|')||/https?:\/\//i.test(name)){ignored++;warn('Línea '+(i+1)+': contenido ambiguo omitido; revisa el original.');last=undefined;continue;}
  const course:Course={name,credits:inline?Number(inline[2].replace(',','.')):undefined,elective:/electiv/i.test(name)};
  const existing=groups.get(current)!.find(x=>normalizeSearch(x.name)===normalizeSearch(name));
  if(existing){duplicates++;if(existing.credits!==undefined&&course.credits!==undefined&&existing.credits!==course.credits)warn('Ciclo '+current+': créditos contradictorios para «'+name+'».');else if(existing.credits===undefined)existing.credits=course.credits;last=existing;continue;}
  groups.get(current)!.push(course);last=course;
 }
 const cycles=[...groups].sort(([a],[b])=>a-b).map(([number,courses])=>({number,courses}));
 for(const cy of cycles)if(!cy.courses.length)warn('Ciclo '+cy.number+': encabezado detectado sin cursos.');
 if(ignored)warn(ignored+' líneas no interpretadas. La lectura puede ser parcial.');
 const missing=cycles.flatMap(c=>c.courses).filter(c=>c.credits===undefined).length;
 if(missing)warn(missing+' cursos sin créditos identificables; no se han inventado valores.');
 return {cycles,warnings,duplicates,ignored,count:cycles.reduce((n,c)=>n+c.courses.length,0)};
}
export function parsePlan(text:string):Cycle[]{return parsePlanReport(text).cycles;}
