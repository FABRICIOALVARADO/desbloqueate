import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import pg from 'pg';
pg.types.setTypeParser(20,Number);
export function postgresSQL(sql){
 let n=0,quoted=false,result='';
 for(let i=0;i<sql.length;i++){const c=sql[i];if(c==="'"){if(quoted&&sql[i+1]==="'"){result+="''";i++;continue;}quoted=!quoted;}result+=c==='?'&&!quoted?'$'+(++n):c;}
 result=result.replace("substr(t.course_id,1,instr(t.course_id,':')-1)","split_part(t.course_id,':',1)");
 if(result.startsWith('INSERT OR IGNORE '))result=result.replace('INSERT OR IGNORE ','INSERT ')+' ON CONFLICT DO NOTHING';
 return result;
}
export async function openDatabase(root,dataDir){
 if(!process.env.DATABASE_URL){
  if(process.env.RENDER==='true')throw Error('La publicación gratuita requiere DATABASE_URL persistente; no se permite SQLite temporal.');
  const local=new DatabaseSync(dataDir+'/desbloqueate.sqlite');local.exec(readFileSync(root+'/server/schema.sql','utf8'));local.exec(readFileSync(root+'/server/schema-v024.sql','utf8'));
  return {one:async(sql,...p)=>local.prepare(sql).get(...p),all:async(sql,...p)=>local.prepare(sql).all(...p),run:async(sql,...p)=>local.prepare(sql).run(...p),close:async()=>local.close(),batch:async(statements)=>{local.exec('BEGIN');try{for(const [sql,...p] of statements)local.prepare(sql).run(...p);local.exec('COMMIT');}catch(e){local.exec('ROLLBACK');throw e;}}};
 }
 const url=new URL(process.env.DATABASE_URL);url.searchParams.delete('sslmode');url.searchParams.delete('sslrootcert');
 const pool=new pg.Pool({connectionString:url.toString(),max:3,idleTimeoutMillis:30000,connectionTimeoutMillis:12000,ssl:{rejectUnauthorized:true,...(process.env.DATABASE_SSL_CA?{ca:process.env.DATABASE_SSL_CA.replaceAll('\\n','\n')}:{ca:readFileSync(root+'/server/certs/supabase-ca.crt','utf8')})},options:'-c search_path=planner -c statement_timeout=15000'});
 pool.on('error',()=>console.error('Conexión PostgreSQL interrumpida.'));
 await pool.query('SELECT 1 FROM planner.users LIMIT 1');
 const query=async(sql,args)=>pool.query(postgresSQL(sql),args);
 return {one:async(sql,...p)=>(await query(sql,p)).rows[0],all:async(sql,...p)=>(await query(sql,p)).rows,run:async(sql,...p)=>query(sql,p),close:()=>pool.end(),batch:async(statements)=>{const client=await pool.connect();try{await client.query('BEGIN');for(const [sql,...p] of statements)await client.query(postgresSQL(sql),p);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};
}
