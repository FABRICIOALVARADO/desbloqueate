/** Metadatos de un archivo adjunto. El contenido (Blob) vive aparte, en IndexedDB. */
export interface Attachment {
  id: string;
  taskId: string;   // entrega a la que pertenece
  name: string;
  type: string;     // tipo MIME
  size: number;     // bytes
  addedAt: string;  // ISO 8601
}
