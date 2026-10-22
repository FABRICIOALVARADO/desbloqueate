/**
 * Modelo de dominio. Las fechas se guardan como texto ISO porque:
 *  - dueDate "YYYY-MM-DD" se ordena cronológicamente con una simple comparación de strings.
 *  - JSON/LocalStorage no tiene tipo Date, así evitamos conversiones propensas a error.
 */
export interface Task {
  id: string;
  title: string;
  dueDate: string;   // "YYYY-MM-DD" (fecha de entrega, hora local)
  completed: boolean;
  createdAt: string; // ISO 8601, sirve de desempate al ordenar
  course?: string;   // curso al que pertenece (opcional)
  careerId?: string;
  cycle?: number;
}

/** Curso elegido en el formulario para asociarlo a una entrega. */
export interface CourseRef { course: string; careerId: string; cycle: number; }

/** Nivel de urgencia calculado (no se guarda: depende del día actual). */
export type UrgencyLevel = 'overdue' | 'today' | 'soon' | 'comfortable' | 'done';

export type TaskFilter = 'all' | 'pending' | 'completed';
