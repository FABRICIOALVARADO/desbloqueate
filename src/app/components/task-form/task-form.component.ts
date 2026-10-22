/**
 * ARQUITECTURA (componente "inteligente" de entrada)
 * Usa Reactive Forms: las reglas de validación viven en TypeScript (testeables),
 * no en el HTML. Al enviar, delega en TaskService (la tarea) y AttachmentService (los archivos);
 * no sabe nada de LocalStorage ni de IndexedDB.
 */
import { Component, ElementRef, ViewChild, computed, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import dayjs from 'dayjs';
import { AttachmentService, MAX_FILES_PER_TASK } from '../../services/attachment.service';
import { CatalogService } from '../../services/catalog.service';
import { TaskService } from '../../services/task.service';
import { formatSize } from '../../utils/format';
import { toast } from '../../utils/notify';

/** Título con al menos `min` caracteres reales (los espacios no cuentan). */
const minTrimmed = (min: number): ValidatorFn => (c: AbstractControl): ValidationErrors | null =>
  String(c.value ?? '').trim().length >= min ? null : { minTrimmed: { min } };

/** Fecha con formato AAAA-MM-DD válido (evita años absurdos que algunos navegadores permiten). */
const realDate: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && dayjs(v).isValid() ? null : { realDate: true };
};

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
})
export class TaskFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tasks = inject(TaskService);
  private readonly attachments = inject(AttachmentService);
  readonly catalog = inject(CatalogService);

  // Carrera -> ciclo -> curso: cada lista depende de la selección anterior (signals derivados).
  readonly sel = this.catalog.selection;
  readonly cycles = computed(() => this.catalog.career(this.sel().careerId)?.cycles ?? []);
  readonly courses = computed(() => this.cycles().find((c) => c.number === this.sel().cycle)?.courses ?? []);

  onCareer(careerId: string): void { this.catalog.select({ careerId, cycle: 0, course: '' }); }
  onCycle(value: string): void { this.catalog.select({ ...this.sel(), cycle: Number(value), course: '' }); }
  onCourse(course: string): void { this.catalog.select({ ...this.sel(), course }); }

  @ViewChild('titleInput') private titleInput!: ElementRef<HTMLInputElement>;

  readonly maxFiles = MAX_FILES_PER_TASK;
  readonly size = formatSize;
  files: File[] = []; // archivos elegidos, aún sin guardar

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, minTrimmed(3), Validators.maxLength(80)]],
    dueDate: ['', [Validators.required, realDate]],
  });

  readonly quickDates = [
    { label: 'Hoy', days: 0 },
    { label: 'Mañana', days: 1 },
    { label: 'En 7 días', days: 7 },
  ];

  /** Solo muestra el error cuando el usuario ya interactuó con el campo. */
  invalid(name: 'title' | 'dueDate'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  setQuickDate(days: number): void {
    const date = this.form.controls.dueDate;
    date.setValue(dayjs().add(days, 'day').format('YYYY-MM-DD'));
    date.markAsDirty();
  }

  pick(input: HTMLInputElement): void {
    this.addFiles(Array.from(input.files ?? []));
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  drop(event: DragEvent): void {
    event.preventDefault();
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  removePending(index: number): void { this.files = this.files.filter((_, i) => i !== index); }

  private addFiles(incoming: File[]): void { this.files = [...this.files, ...incoming]; }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast('warning', 'Revisa los campos marcados');
      return;
    }
    const { title, dueDate } = this.form.getRawValue();
    const { careerId, cycle, course } = this.sel();
    const task = this.tasks.add(title, dueDate, course ? { course, careerId, cycle } : undefined);
    this.catalog.select({ ...this.sel(), course: '' }); // se conservan carrera y ciclo para la siguiente
    const pending = this.files;
    this.files = [];
    this.form.reset({ title: '', dueDate: '' });
    this.titleInput.nativeElement.focus(); // listo para capturar la siguiente

    if (pending.length === 0) { toast('success', 'Entrega agregada'); return; }
    const result = await this.attachments.add(task.id, pending);
    toast(result.rejected.length ? 'warning' : 'success',
      result.rejected.length ? result.rejected[0] : 'Entrega agregada con sus archivos');
  }
}
