import {Component,Input,OnInit} from '@angular/core';import {CommonModule} from '@angular/common';import {FormsModule} from '@angular/forms';import {ApiService} from '../../services/api.service';
@Component({selector:'app-learning',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./learning.component.html',styleUrl:'./learning.component.css'})
export class LearningComponent implements OnInit{
 @Input() fileId='';@Input() fileName='';open=false;consent:any={accepted:false,version:'',provider:'gemini'};consentOpen=false;authorized=false;count=5;busy=false;error='';result:any=null;resultId='';answers:number[]=[];review:any=null;history:any[]=[];
 constructor(private api:ApiService){}
 async ngOnInit(){try{this.consent=await this.api.request('/ai/consent');}catch{}}
 async show(){this.open=true;this.error='';try{this.history=await this.api.request<any[]>('/learning/history');}catch(e){this.error=(e as Error).message;}}
 async setConsent(accepted:boolean){try{await this.api.request('/ai/consent','PUT',{version:this.consent.version,accepted});this.consent.accepted=accepted;this.consentOpen=false;}catch(e){this.error=(e as Error).message;}}
 async generate(count:number){if(!this.consent.accepted){this.consentOpen=true;return;}if(!this.authorized){this.error='Selecciona el permiso para enviar este archivo.';return;}this.busy=true;this.error='';this.review=null;try{const r=await this.api.request<any>('/learning/'+this.fileId,'POST',{count,authorizeFile:true});this.result=r.result;this.resultId=r.id;this.answers=Array(r.result.questions.length).fill(-1);}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
 resetQuiz(){this.review=null;this.answers=Array(this.result?.questions.length||0).fill(-1);}
 async submit(){this.busy=true;try{this.review=await this.api.request('/learning/results/'+this.resultId+'/answers','POST',{answers:this.answers});this.history=await this.api.request<any[]>('/learning/history');}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
}
