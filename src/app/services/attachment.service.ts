/**
 * ARQUITECTURA (almacenamiento de archivos)
 * LocalStorage solo admite ~5 MB de texto, así que los archivos se guardan como Blob en
 * IndexedDB (API estándar del navegador, cientos de MB, sin servidor).
 * - Los metadatos (nombre, tamaño...) se exponen como observable para pintar la lista.
 * - El contenido solo se lee cuando el usuario pulsa "descargar".
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Attachment } from '../models/attachment.model';
import { newId } from '../utils/id';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB por archivo
export const MAX_FILES_PER_TASK = 8;

interface StoredFile extends Attachment { blob: Blob; }
export interface AddResult { added: number; rejected: string[]; }

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly dbPromise = this.openDb();
  private readonly subject = new BehaviorSubject<Attachment[]>([]);
  readonly attachments$: Observable<Attachment[]> = this.subject.asObservable();

  constructor() { void this.refresh(); }

  /** Guarda archivos validando tamaño y cantidad; devuelve qué se añadió y qué se rechazó. */
  async add(taskId: string, files: File[]): Promise<AddResult> {
    const rejected: string[] = [];
    let added = 0;
    let slots = MAX_FILES_PER_TASK - this.subject.value.filter((a) => a.taskId === taskId).length;

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) { rejected.push(`${file.name} supera los 10 MB`); continue; }
      if (slots <= 0) { rejected.push(`Máximo ${MAX_FILES_PER_TASK} archivos por entrega`); continue; }
      const record: StoredFile = {
        id: newId(), taskId, name: file.name, type: file.type, size: file.size,
        addedAt: new Date().toISOString(), blob: file,
      };
      try {
        await this.request('readwrite', (s) => s.put(record));
        slots--; added++;
      } catch {
        rejected.push(`${file.name}: no se pudo guardar (almacenamiento lleno o bloqueado)`);
      }
    }
    await this.refresh();
    return { added, rejected };
  }

  async download(attachment: Attachment): Promise<void> {
    const record = await this.request<StoredFile | undefined>('readonly', (s) => s.get(attachment.id));
    if (!record) return;
    const url = URL.createObjectURL(record.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = record.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async remove(id: string): Promise<void> {
    try { await this.request('readwrite', (s) => s.delete(id)); } catch (e) { console.warn(e); }
    await this.refresh();
  }

  /** Borra todos los adjuntos de las entregas indicadas (al eliminar una entrega). */
  async removeByTasks(taskIds: string[]): Promise<void> {
    const ids = this.subject.value.filter((a) => taskIds.includes(a.taskId)).map((a) => a.id);
    for (const id of ids) {
      try { await this.request('readwrite', (s) => s.delete(id)); } catch (e) { console.warn(e); }
    }
    if (ids.length) await this.refresh();
  }

  // ---- Capa mínima sobre IndexedDB (convierte sus eventos en Promesas) ----

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB no disponible')); return; }
      const req = indexedDB.open('desbloqueate', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Resuelve al completar la transacción, así se garantiza que el dato quedó guardado. */
  private async request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.dbPromise;
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction('files', mode);
      const req = run(tx.objectStore('files'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private async refresh(): Promise<void> {
    try {
      const all = await this.request<StoredFile[]>('readonly', (s) => s.getAll());
      this.subject.next(all.map(({ blob: _blob, ...meta }) => meta));
    } catch (e) {
      console.warn('No se pudieron leer los adjuntos', e);
    }
  }
}
