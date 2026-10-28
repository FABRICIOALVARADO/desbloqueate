import {Injectable} from '@angular/core';
@Injectable({providedIn:'root'})
export class ApiService {
 async request<T=any>(path:string,method='GET',body?:unknown):Promise<T>{
  const response=await fetch('/api'+path,{method,credentials:'same-origin',signal:AbortSignal.timeout(25000),headers:{'X-Requested-With':'Desbloqueate',...(!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw Error('El servidor no respondió correctamente. Intenta de nuevo en unos segundos.');}
  if(!response.ok)throw Error(data.error||'No se pudo completar la operación.');return data;
 }
}
