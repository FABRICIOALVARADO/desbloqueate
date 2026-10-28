export const calendarScope='https://www.googleapis.com/auth/calendar.app.created';
export const busyScope='https://www.googleapis.com/auth/calendar.freebusy';
export function scopesFor(mode){return ['openid','email','profile',...(['calendar','availability'].includes(mode)?[calendarScope]:[]),...(mode==='availability'?[busyScope]:[])];}
export async function readBusy(client,window){
 if(!(client.credentials.scope||'').split(' ').includes(busyScope))throw Object.assign(Error('Autoriza la consulta de disponibilidad de tu calendario principal.'),{status:409});
 const {data}=await client.request({url:'https://www.googleapis.com/calendar/v3/freeBusy',method:'POST',data:{timeMin:window.start,timeMax:window.end,timeZone:'America/Lima',items:[{id:'primary'}]}});
 const calendar=data.calendars?.primary;
 if(!calendar||calendar.errors?.length)throw Error('Google no pudo consultar tu disponibilidad. No se asumirá que estás libre.');
 return calendar.busy||[];
}
export async function ensureStudyCalendar(client,conn,save){
 if(conn.calendar_id)return conn.calendar_id;
 const {data}=await client.request({url:'https://www.googleapis.com/calendar/v3/calendars',method:'POST',data:{summary:'Desbloquéate · Mis entregas',timeZone:'America/Lima'}});
 await save(data.id);return data.id;
}
export async function publishBlock(client,calendarId,block,title){
 const id=block.id.replaceAll('-',''),url='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId)+'/events';
 const event={summary:'Estudio · '+title,start:{dateTime:block.start,timeZone:'America/Lima'},end:{dateTime:block.end,timeZone:'America/Lima'},visibility:'private',reminders:{useDefault:false,overrides:[{method:'popup',minutes:5}]}};
 try{await client.request({url,method:'POST',data:{id,...event}});}catch(e){if(e.response?.status!==409)throw e;await client.request({url:url+'/'+id,method:'PUT',data:event});}
 return id;
}
