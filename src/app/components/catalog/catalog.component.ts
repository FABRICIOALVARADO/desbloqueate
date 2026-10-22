/**
 * ARQUITECTURA (componente de consulta del catálogo)
 * Lee carreras y planes desde CatalogService. Los filtros (ciclo, solo electivos) son signals locales
 * y `visibleCycles` es un signal derivado: se recalcula solo cuando cambia algo.
 * "Usar" deja el curso elegido en el formulario (selección compartida en el servicio).
 */
import { Component, computed, inject, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { Career, Cycle } from '../../models/catalog.model';
import { CatalogService } from '../../services/catalog.service';
import { toast } from '../../utils/notify';

@Component({
  selector: 'app-catalog',
  standalone: true,
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent {
  private readonly catalog = inject(CatalogService);

  readonly careers = this.catalog.careers;
  readonly career = computed<Career>(() => this.catalog.career(this.catalog.selection().careerId) ?? this.careers()[0]);
  readonly customCareers = computed(() => this.careers().filter((c) => c.source === 'custom'));
  readonly cycleFilter = signal(0);
  readonly onlyElectives = signal(false);
  readonly sample = 'Ciclo 1\nMatemática Básica | 4\nIntroducción a la carrera | 3\n\nCiclo 2\nElectivo General 1 | 3';

  readonly stats = computed(() => {
    const all = this.career().cycles.flatMap((c) => c.courses);
    return { courses: all.length, electives: all.filter((c) => c.elective).length };
  });

  readonly visibleCycles = computed<Cycle[]>(() => {
    const cycle = this.cycleFilter();
    const only = this.onlyElectives();
    return this.career().cycles
      .filter((c) => cycle === 0 || c.number === cycle)
      .map((c) => ({ ...c, courses: only ? c.courses.filter((x) => x.elective) : c.courses }))
      .filter((c) => c.courses.length > 0);
  });

  setCareer(id: string): void { this.catalog.select({ careerId: id, cycle: 0, course: '' }); this.cycleFilter.set(0); }
  setCycle(value: string): void { this.cycleFilter.set(Number(value)); }
  credits(cycle: Cycle): number { return cycle.courses.reduce((n, c) => n + (c.credits ?? 0), 0); }

  /** Deja el curso en el formulario y lleva al usuario a él. */
  use(career: Career, cycle: number, course: string): void {
    this.catalog.select({ careerId: career.id, cycle, course });
    toast('success', `Curso elegido: ${course}`);
    document.getElementById('tablero')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('title')?.focus({ preventScroll: true }), 500);
  }

  importPlan(name: HTMLInputElement, text: HTMLTextAreaElement): void {
    const result = this.catalog.importPlan(name.value, text.value);
    if (!result.ok || !result.id) { toast('warning', result.message); return; }
    this.setCareer(result.id);
    name.value = ''; text.value = '';
    toast('success', result.message);
  }

  async removeCustom(career: Career): Promise<void> {
    const result = await Swal.fire({
      title: '¿Quitar esta carrera?', text: career.name, icon: 'question', showCancelButton: true, reverseButtons: true,
      confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar', confirmButtonColor: '#111827', cancelButtonColor: '#4B5563',
    });
    if (result.isConfirmed) this.catalog.removeCustom(career.id);
  }
}
