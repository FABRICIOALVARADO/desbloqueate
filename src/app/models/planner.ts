export interface Course {id:string;name:string;credits:number|null;elective:boolean;careerId?:string;career?:string;cycle?:number}
export interface Career {id:string;name:string;faculty:string;modalities:string[];sourceUrl:string;consultedAt:string;cycles:{number:number;courses:Course[]}[];status:string}
export interface Preferences {theme:string;accent:string;compact:boolean;reduceMotion:boolean;careerId:string;cycle:number}
export interface User {id:string;name:string;email:string;verified:boolean;googleLinked:boolean;preferences:Partial<Preferences>;calendarConnected:boolean}
export interface Attachment {id:string;name:string;size:number;mime?:string}
export interface Task {difficulty?:number;progress?:number;id:string;title:string;description:string;course_id:string;course:Course;due_at:string;status:'pending'|'working'|'done';visibility:'private'|'public';effort:number;importance:number;reminder:number;created_at:string;completed_at:string|null;attachments:Attachment[];author?:string;priority:number}
export interface Grade {name:string;weight:number;grade:number|null}
export interface Notice {id:string;title:string;task_id:string;seen:number;created_at:string}
