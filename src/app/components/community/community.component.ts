import {DomSanitizer,SafeResourceUrl} from '@angular/platform-browser';
import {Component,Input,Output,EventEmitter,OnInit,OnChanges,SimpleChanges,HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';import {FormsModule} from '@angular/forms';
import {ApiService} from '../../services/api.service';import {Career,Course,User,Task} from '../../models/planner';
@Component({selector:'app-community',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./community.component.html',styleUrl:'./community.component.css'})
export class CommunityComponent implements OnInit,OnChanges{
 @Input() user:User|null=null;@Input() careers:Career[]=[];@Input() courses:Course[]=[];@Input() career='';@Input() sharedTask:Task|null=null;@Output() login=new EventEmitter<void>();
 posts:any[]=[];comments:any[]=[];notices:any[]=[];blocks:any[]=[];active:any=null;profile:any=null;more=false;loading=false;error='';message='';query='';filter='';course='';offset=0;composer=false;preview=false;saving=false;editId='';reply='';parent:string|null=null;files:File[]=[];selectedFiles:string[]=[];confirmPublic=false;
 draft={title:'',body:'',career_id:'',course_id:'',tags:''};
 attachment:any=null;previewUrl:SafeResourceUrl|null=null;
 constructor(private api:ApiService,private sanitizer:DomSanitizer){}
 get filterCourses(){return this.courses.filter(c=>c.careerId===this.career);}
 openAttachment(f:any){this.attachment=f;this.previewUrl=f.mime==='application/pdf'?this.sanitizer.bypassSecurityTrustResourceUrl('/api/social/files/'+encodeURIComponent(f.id)+'?preview=1'):null;}
 chooseCourse(id:string){this.course=id;void this.load();}

 async ngOnInit(){if(this.sharedTask){this.newPost();this.draft={title:this.sharedTask.title,body:this.sharedTask.description,career_id:this.sharedTask.course.careerId||'',course_id:this.sharedTask.course_id,tags:''};}if(this.user){await this.load();await this.loadNotices();await this.openLink();}}
 ngOnChanges(changes:SimpleChanges){if(changes['user']&&!changes['user'].firstChange&&this.user){void this.load();void this.loadNotices();void this.openLink();}}
 get careerCourses(){return this.courses.filter(c=>!this.draft.career_id||c.careerId===this.draft.career_id);}
 @HostListener('window:scroll') onFeedScroll(){if(this.more&&!this.loading&&!this.error&&!this.active&&!this.composer&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-600)void this.load(true);}
 async load(append=false){if(!this.user||this.loading)return;this.loading=true;this.error='';const next=append?this.offset+20:0;try{const r=await this.api.request<any>('/social/posts?'+new URLSearchParams({career:this.career,q:this.query,course:this.course,filter:this.filter,offset:String(next)}));this.posts=append?[...this.posts,...r.items.filter((p:any)=>!this.posts.some(old=>old.id===p.id))]:r.items;this.offset=next;this.more=r.more;}catch(e){this.error=String((e as Error).message);}finally{this.loading=false;}}
 newPost(){if(!this.user){this.login.emit();return;}this.composer=true;this.editId='';this.confirmPublic=false;this.files=[];this.selectedFiles=[];this.draft={title:'',body:'',career_id:this.career,course_id:'',tags:''};}
 edit(p:any){this.editId=p.id;this.draft={title:p.title,body:p.body,career_id:p.career_id,course_id:p.course_id,tags:p.tags};this.files=[];this.composer=true;this.confirmPublic=false;}
 chooseFiles(e:Event){this.files=Array.from((e.target as HTMLInputElement).files||[]);if(this.files.length>8||this.files.some(f=>f.size>10*1024*1024)){this.error='Máximo 8 archivos de 10 MB.';this.files=[];}}
 selectFile(id:string,selected:boolean){this.selectedFiles=selected?[...this.selectedFiles,id]:this.selectedFiles.filter(x=>x!==id);}
 async publish(){if(!this.confirmPublic)return;this.saving=true;this.error='';try{const p=await this.api.request<any>('/social/posts'+(this.editId?'/'+this.editId:''),this.editId?'PATCH':'POST',{...this.draft,confirmPublic:true});this.editId=p.id;for(const f of [...this.files]){const data=new FormData();data.append('file',f);await this.api.request('/social/posts/'+p.id+'/files','POST',data);this.files=this.files.filter(x=>x!==f);}if(this.selectedFiles.length){await this.api.request('/social/posts/'+p.id+'/task-files','POST',{ids:this.selectedFiles,confirmPublic:true});this.selectedFiles=[];}this.composer=false;this.message='Publicación guardada. Tu tarea original conserva su privacidad.';await this.load();}catch(e){this.error=(this.editId?'El texto ya está guardado; revisa los adjuntos: ':'')+(e as Error).message;}finally{this.saving=false;}}
 async open(p:any){try{this.active=p;this.comments=await this.api.request<any[]>('/social/posts/'+p.id+'/comments');this.reply='';this.parent=null;}catch(e){this.error=(e as Error).message;}}
 async comment(){await this.action(async()=>{await this.api.request('/social/posts/'+this.active.id+'/comments','POST',{body:this.reply,parent_id:this.parent});await this.open(this.active);await this.load();});}
 async action(fn:()=>Promise<any>){this.error='';try{await fn();}catch(e){this.error=(e as Error).message;}}
 async mark(p:any,kind:string){await this.action(async()=>{await this.api.request('/social/posts/'+p.id+'/marks','PUT',{kind,active:!p.marks.includes(kind)});await this.load();});}
 async useful(c:any){await this.action(async()=>{await this.api.request('/social/comments/'+c.id+'/useful','PUT',{});this.comments=await this.api.request<any[]>('/social/posts/'+this.active.id+'/comments');});}
 async remove(p:any){if(!confirm('¿Eliminar esta publicación y sus respuestas públicas? Tu tarea original se conserva.'))return;await this.action(async()=>{await this.api.request('/social/posts/'+p.id,'DELETE');this.active=null;await this.load();});}
 async removeComment(c:any){if(!confirm('¿Eliminar este comentario y sus respuestas?'))return;await this.action(async()=>{await this.api.request('/social/comments/'+c.id,'DELETE');await this.open(this.active);});}
 async report(p:any){const reason=prompt('Describe el motivo del reporte. Puedes indicar qué respuesta deseas reportar.');if(reason)await this.action(async()=>{await this.api.request('/social/posts/'+p.id+'/report','POST',{reason});this.message='Reporte registrado para revisión.';});}
 async block(id:string){if(!confirm('¿Bloquear a este usuario? Dejarán de ver sus publicaciones y respuestas entre sí al iniciar sesión.'))return;await this.action(async()=>{await this.api.request('/social/blocks/'+id,'PUT',{active:true});this.active=null;await this.load();});}
 async showBlocks(){await this.action(async()=>this.blocks=await this.api.request<any[]>('/social/blocks'));}
 async unblock(id:string){await this.action(async()=>{await this.api.request('/social/blocks/'+id,'PUT',{active:false});await this.showBlocks();await this.load();});}
 async showProfile(id:string){await this.action(async()=>this.profile=await this.api.request('/social/profiles/'+id));}
 async link(p:any){await this.action(async()=>{await navigator.clipboard.writeText(location.origin+'/?post='+p.id);this.message='Enlace copiado. Se requiere cuenta para abrirlo.';});}
 async loadNotices(){await this.action(async()=>this.notices=await this.api.request<any[]>('/social/notices'));}
 async readNotices(){await this.action(async()=>{await this.api.request('/social/notices/read','POST',{});await this.loadNotices();});}
 async openLink(){const id=new URLSearchParams(location.search).get('post');if(id)await this.action(async()=>this.open(await this.api.request('/social/posts/'+encodeURIComponent(id))));}
}
