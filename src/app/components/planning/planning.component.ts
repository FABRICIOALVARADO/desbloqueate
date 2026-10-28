import {Component,Input,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService} from '../../services/api.service';
import {StudyBlock} from '../../domain/planning';
interface SavedBlock extends StudyBlock {id:string;event_id:string|null}
interface Proposal {ranked:{id:string;title:string;reasons:string[];remaining:number}[];blocks:StudyBlock[];replaceIds:string[];steps:{task_id:string;text:string}[];source:string;notice:string;calendarChecked:boolean}
@Component({selector:'app-planning',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./planning.component.html',styleUrl:'./planning.component.css'})
export class PlanningComponent implements OnInit {
 @Input() calendarConnected=false;
 status={enabled:false,provider:'',privacy:''};start='';end='';request='';consent=false;calendarConsent=false;busy=false;error='';notice='';proposal:Proposal|null=null;saved:SavedBlock[]=[];action='organize';
 constructor(private api:ApiService){const d=new Date(Date.now()+5*60000);this.start=this.inputDate(d.toISOString());this.end=this.inputDate(new Date(+d+90*60000).toISOString());}
 async ngOnInit(){try{[this.status,this.saved]=await Promise.all([this.api.request('/ai/status'),this.api.request('/study/blocks')]);}catch(e){this.error=this.message(e);}}
 message(e:unknown){return e instanceof Error?e.message:'No se pudo completar la operación.';}
 inputDate(value:string){if(!value)return "";return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T');}
 iso(value:string){return new Date(value+':00-05:00').toISOString();}
 date(value:string){return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
 edit(block:StudyBlock,key:'start'|'end',value:string){try{block[key]=this.iso(value);this.error='';}catch{block[key]='';this.error='Fecha u hora inválida.';}}
 title(id:string){return this.proposal?.ranked.find(t=>t.id===id)?.title||'Bloque de estudio';}
 async propose(useAI:boolean,action=this.action){this.busy=true;this.error='';this.notice='';this.proposal=null;try{this.proposal=await this.api.request('/study/propose','POST',{start:this.iso(this.start),end:this.iso(this.end),useAI,consent:this.consent,useCalendar:this.calendarConsent,calendarConsent:this.calendarConsent,action,request:this.request});}catch(e){this.error=this.message(e);}finally{this.busy=false;}}
 async accept(){if(!this.proposal)return;this.busy=true;this.error='';try{this.saved=await this.api.request('/study/accept','POST',{blocks:this.proposal.blocks,replaceIds:this.proposal.replaceIds,confirm:true,useCalendar:this.proposal.calendarChecked,calendarConsent:this.calendarConsent});this.proposal=null;this.notice='Bloques guardados en tu cuenta. No se enviaron a Google.';}catch(e){this.error=this.message(e);}finally{this.busy=false;}}
 async publish(){this.busy=true;this.error='';try{const ids=this.saved.filter(b=>!b.event_id&&Date.parse(b.start)>Date.now()).map(b=>b.id);const result=await this.api.request<{count:number}>('/study/publish','POST',{ids,confirm:true,calendarConsent:this.calendarConsent});this.saved=await this.api.request('/study/blocks');this.notice=result.count+' bloques enviados a Google.';}catch(e){this.error=this.message(e);}finally{this.busy=false;}}
 get canPublish(){return this.calendarConnected&&this.saved.some(b=>!b.event_id&&Date.parse(b.start)>Date.now());}
}
