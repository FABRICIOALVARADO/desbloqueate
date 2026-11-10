import {parentPort,workerData} from 'node:worker_threads';
import mammoth from 'mammoth';
try{const r=await mammoth.extractRawText({buffer:Buffer.from(workerData)});parentPort.postMessage({text:r.value});}catch{parentPort.postMessage({error:true});}
