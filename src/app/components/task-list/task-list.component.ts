/**
 * ARQUITECTURA (componente "inteligente" de listado)
 * Construye un único "view model" (vm$) combinando cuatro flujos RxJS:
 *   1) tareas priorizadas (TaskService), 2) adjuntos (AttachmentService), 3) filtro elegido,
 *   4) un reloj de 60 s para que las etiquetas ("Vence hoy" -> "Venció ayer") se actualicen
 * al pasar la medianoche. La plantilla solo pinta ese vm con el pipe async.
 */
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { BehaviorSubject, Observable, combineLatest, map, timer } from 'rxjs';
import { Attachment } from '../../models/attachment.model';
import { Task, TaskFilter, UrgencyLevel } from '../../models/task.model';
import { AttachmentService } from '../../services/attachment.service';
import { TaskService } from '../../services/task.service';
import { formatSize } from '../../utils/format';
import { toast } from '../../utils/notify';

interface TaskView { task: Task; urgency: UrgencyLevel; badge: string; icon: string; dateLabel: string; files: Attachment[]; }

interface ListVm {
  items: TaskView[];
  nextId: string | null; // la entrega más urgente: se destaca para evitar la parálisis por análisis
  counts: Record<TaskFilter, number>;
  percent: number;
  filter: TaskFilter;
  emptyTitle: string;
  emptyText: string;
  courses: string[];     // cursos que aparecen en las entregas (para el filtro)
  courseFilter: string;
  isBlank: boolean;      // no hay ninguna entrega registrada
}

const ICONS: Record<UrgencyLevel, string> = {
  overdue: 'bi-exclamation-triangle-fill',
  today: 'bi-alarm-fill',
  soon: 'bi-hourglass-split',
  comfortable: 'bi-calendar-check',
  done: 'bi-check2-all',
};

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent {
  private readonly service = inject(TaskService);
  private readonly attachments = inject(AttachmentService);
  private readonly filter$ = new BehaviorSubject<TaskFilter>('all');
  private readonly courseFilter$ = new BehaviorSubject<string>('');

  /** Ids en animación de salida / de "recién completada" (solo efectos visuales). */
  readonly leaving = new Set<string>();
  readonly justDone = new Set<string>();
  readonly size = formatSize;

  readonly filters: { value: TaskFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'completed', label: 'Completadas' },
  ];

  readonly vm$: Observable<ListVm> = combineLatest([
    this.service.prioritizedTasks$, this.attachments.attachments$, this.filter$, this.courseFilter$, timer(0, 60_000),
  ]).pipe(map(([tasks, files, filter, course]) => this.buildVm(tasks, files, filter, course)));

  setFilter(filter: TaskFilter): void { this.filter$.next(filter); }
  setCourse(course: string): void { this.courseFilter$.next(course); }
  addDemo(): void { this.service.addDemo(); }

  toggle(task: Task): void {
    this.service.toggle(task.id);
    if (!task.completed) {
      this.justDone.add(task.id);
      setTimeout(() => this.justDone.delete(task.id), 700);
      toast('success', '¡Entrega completada! Una menos.');
    }
  }

  async remove(task: Task): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar esta entrega?',
      text: `"${task.title}" y sus archivos se borrarán de tu tablero.`, // `text` se escapa: no admite HTML
      icon: 'warning', showCancelButton: true, reverseButtons: true, focusCancel: true,
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B42332', cancelButtonColor: '#4B5563',
    });
    if (!result.isConfirmed) return;
    this.leaving.add(task.id); // espera a que termine la animación antes de borrar
    setTimeout(() => {
      this.service.remove(task.id);
      void this.attachments.removeByTasks([task.id]);
      this.leaving.delete(task.id);
    }, 260);
  }

  async clearCompleted(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Limpiar las completadas?', text: 'Se eliminarán de forma permanente, con sus archivos.',
      icon: 'question', showCancelButton: true, reverseButtons: true,
      confirmButtonText: 'Sí, limpiar', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#111827', cancelButtonColor: '#4B5563',
    });
    if (!result.isConfirmed) return;
    void this.attachments.removeByTasks(this.service.clearCompleted());
    toast('success', 'Tablero limpio');
  }

  // ---- Adjuntos ----

  async attach(task: Task, input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    const result = await this.attachments.add(task.id, files);
    if (result.rejected.length) toast('warning', result.rejected[0]);
    else toast('success', result.added === 1 ? 'Archivo adjuntado' : `${result.added} archivos adjuntados`);
  }

  download(file: Attachment): void { void this.attachments.download(file); }

  async removeFile(file: Attachment): Promise<void> {
    const result = await Swal.fire({
      title: '¿Quitar este archivo?', text: file.name, icon: 'question',
      showCancelButton: true, reverseButtons: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#111827', cancelButtonColor: '#4B5563',
    });
    if (result.isConfirmed) void this.attachments.remove(file.id);
  }

  // ---- Construcción del view model ----

  private buildVm(tasks: Task[], files: Attachment[], filter: TaskFilter, course: string): ListVm {
    const byTask = new Map<string, Attachment[]>();
    for (const f of files) byTask.set(f.taskId, [...(byTask.get(f.taskId) ?? []), f]);

    const everything = tasks.map((t) => this.toView(t, byTask.get(t.id) ?? []));
    const courses = [...new Set(tasks.flatMap((t) => (t.course ? [t.course] : [])))].sort((a, b) => a.localeCompare(b, 'es'));
    const courseFilter = courses.includes(course) ? course : ''; // si el curso ya no existe, se limpia el filtro
    const all = courseFilter ? everything.filter((v) => v.task.course === courseFilter) : everything;
    const pending = all.filter((v) => !v.task.completed);
    const done = all.length - pending.length;
    const items = all.filter((v) =>
      filter === 'all' ? true : filter === 'pending' ? !v.task.completed : v.task.completed);

    return {
      items, filter, courses, courseFilter, isBlank: everything.length === 0,
      nextId: filter === 'completed' ? null : (pending[0]?.task.id ?? null),
      counts: { all: all.length, pending: pending.length, completed: done },
      percent: all.length ? Math.round((done / all.length) * 100) : 0,
      ...this.emptyCopy(filter, all.length),
    };
  }

  private toView(task: Task, files: Attachment[]): TaskView {
    const urgency = this.service.getUrgency(task);
    return {
      task, urgency, files, icon: ICONS[urgency],
      badge: this.badgeText(urgency, this.service.daysUntilDue(task)),
      dateLabel: dayjs(task.dueDate).format('ddd D MMM'),
    };
  }

  private badgeText(urgency: UrgencyLevel, days: number): string {
    if (urgency === 'done') return 'Completada';
    if (days < 0) return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Faltan ${days} días`;
  }

  private emptyCopy(filter: TaskFilter, total: number): { emptyTitle: string; emptyText: string } {
    if (total === 0) return { emptyTitle: 'Tu tablero está libre', emptyText: 'Agrega tu primera entrega y Desbloquéate decide qué va primero.' };
    if (filter === 'pending') return { emptyTitle: '¡Sin pendientes!', emptyText: 'Terminaste todo lo que tenías registrado.' };
    return { emptyTitle: 'Aún no completas ninguna', emptyText: 'Cuando termines una entrega, aparecerá aquí.' };
  }
}
