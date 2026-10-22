/**
 * ARQUITECTURA (capa de datos y lógica de negocio)
 * - Único "dueño" del estado: los componentes NO tocan LocalStorage ni ordenan nada.
 * - Estado reactivo con BehaviorSubject (RxJS): cualquier cambio se emite a todos los
 *   componentes suscritos (flujo unidireccional: acción -> servicio -> observable -> vista).
 * - Estado inmutable: cada operación crea un arreglo nuevo, lo que hace predecible la
 *   detección de cambios de Angular y evita errores por mutación compartida.
 */
import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { CourseRef, Task, UrgencyLevel } from '../models/task.model';
import { newId } from '../utils/id';

const STORAGE_KEY = 'desbloqueate.tasks.v1'; // "v1" permite migrar el formato en el futuro
const SOON_THRESHOLD_DAYS = 3;               // hasta 3 días = "entrega próxima" (amarillo)

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly tasksSubject = new BehaviorSubject<Task[]>(this.load());

  /** Tareas tal cual se guardaron. */
  readonly tasks$: Observable<Task[]> = this.tasksSubject.asObservable();

  /** Tareas ya priorizadas: lo que consume la interfaz. */
  readonly prioritizedTasks$: Observable<Task[]> = this.tasks$.pipe(
    map((tasks) => TaskService.prioritize(tasks)),
  );

  /**
   * ALGORITMO DE PRIORIZACIÓN CRONOLÓGICA
   * Criterios, en orden de importancia:
   *  1) Pendientes antes que completadas (lo hecho no compite por tu atención).
   *  2) Fecha de entrega ascendente: la más cercana primero. Las vencidas tienen fechas
   *     pasadas, así que quedan arriba de forma natural, sin caso especial.
   *  3) Desempate por fecha de creación: la más antigua primero (evita que se "olvide").
   * Se compara el texto ISO "YYYY-MM-DD", que coincide con el orden cronológico.
   * Coste: O(n log n). Array.sort es estable (ES2019); se ordena una copia, no el original.
   */
  static prioritize(tasks: readonly Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const byDueDate = a.dueDate.localeCompare(b.dueDate);
      if (byDueDate !== 0) return byDueDate;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  /** Días entre hoy y la entrega, comparando días calendario (negativo = vencida). */
  daysUntilDue(task: Task): number {
    return dayjs(task.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  }

  /** Clasifica la urgencia; la vista la traduce a color e icono. */
  getUrgency(task: Task): UrgencyLevel {
    if (task.completed) return 'done';
    const days = this.daysUntilDue(task);
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    return days <= SOON_THRESHOLD_DAYS ? 'soon' : 'comfortable';
  }

  // ---- Operaciones (CRUD) ----

  add(title: string, dueDate: string, ref?: CourseRef): Task {
    const task: Task = {
      id: newId(),
      title: title.trim(),
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      ...(ref ?? {}),
    };
    this.commit([...this.tasksSubject.value, task]);
    return task; // el formulario lo necesita para asociar los adjuntos
  }

  toggle(id: string): void {
    this.commit(this.tasksSubject.value.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  remove(id: string): void {
    this.commit(this.tasksSubject.value.filter((t) => t.id !== id));
  }

  /** Elimina las completadas y devuelve sus ids (para borrar también sus adjuntos). */
  clearCompleted(): string[] {
    const removed = this.tasksSubject.value.filter((t) => t.completed).map((t) => t.id);
    this.commit(this.tasksSubject.value.filter((t) => !t.completed));
    return removed;
  }

  /** Carga entregas de ejemplo (con cursos de Ingeniería de Sistemas): útil para demostraciones. */
  addDemo(): void {
    const day = (n: number) => dayjs().add(n, 'day').format('YYYY-MM-DD');
    const demo = [
      ['Informe de Base de Datos', -1, 'Base de Datos 1', 3], ['Exposición de Redes', 0, 'Redes de Computadoras', 7],
      ['Práctica de Cálculo', 2, 'Cálculo Integral', 4], ['Proyecto de Ingeniería de Software', 9, 'Ingeniería de Software', 7],
    ] as const;
    const now = Date.now();
    this.commit([...this.tasksSubject.value, ...demo.map(([title, n, course, cycle], i): Task => ({
      id: newId(), title, dueDate: day(n), completed: false, createdAt: new Date(now + i).toISOString(),
      course, careerId: 'sistemas', cycle,
    }))]);
  }

  // ---- Persistencia (encapsula la API de LocalStorage) ----

  /** Emite el nuevo estado y lo guarda: un solo punto de escritura. */
  private commit(tasks: Task[]): void {
    this.tasksSubject.next(tasks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.warn('No se pudo guardar en LocalStorage (¿modo privado o lleno?)', error);
    }
  }

  /** Lee y valida lo guardado; si el dato está corrupto, arranca con un tablero vacío. */
  private load(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(TaskService.isTask) : [];
    } catch {
      return [];
    }
  }

  private static isTask(value: unknown): value is Task {
    const t = value as Partial<Task> | null;
    return !!t && typeof t.id === 'string' && typeof t.title === 'string' &&
      typeof t.dueDate === 'string' && typeof t.completed === 'boolean' && typeof t.createdAt === 'string';
  }
}
