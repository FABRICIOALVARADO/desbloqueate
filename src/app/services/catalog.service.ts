/**
 * ARQUITECTURA (catálogo de carreras y cursos)
 * - Carreras incluidas (oficiales) + carreras importadas por el usuario (LocalStorage).
 * - `selection` guarda la carrera/ciclo/curso elegidos: lo comparten el formulario y el catálogo.
 * Usa Signals de Angular: estado reactivo simple, sin suscripciones manuales.
 */
import { Injectable, computed, signal } from '@angular/core';
import { BUILTIN_CAREERS } from '../data/catalog.data';
import { Career } from '../models/catalog.model';
import { parsePlan } from '../utils/plan-parser';

interface CustomPlan { id: string; name: string; plan: string; }
export interface Selection { careerId: string; cycle: number; course: string; }

const CUSTOM_KEY = 'desbloqueate.catalog.custom.v1';
const SELECTION_KEY = 'desbloqueate.selection.v1';

function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('No se pudo guardar', e); }
}
const slug = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly custom = signal<CustomPlan[]>(
    readJson<CustomPlan[]>(CUSTOM_KEY, []).filter((p) => typeof p?.id === 'string' && typeof p?.plan === 'string'));

  readonly careers = computed<Career[]>(() => [
    ...BUILTIN_CAREERS,
    ...this.custom().map((p): Career => ({ id: p.id, name: p.name, faculty: 'Plan importado por ti', source: 'custom', cycles: parsePlan(p.plan) })),
  ]);

  readonly selection = signal<Selection>({ ...{ careerId: '', cycle: 0 }, ...readJson(SELECTION_KEY, {}), course: '' });

  career(id: string): Career | undefined { return this.careers().find((c) => c.id === id); }

  /** Cambia la selección; solo se recuerdan carrera y ciclo (no el curso). */
  select(sel: Selection): void {
    this.selection.set(sel);
    writeJson(SELECTION_KEY, { careerId: sel.careerId, cycle: sel.cycle });
  }

  /** Importa (o reemplaza) una carrera a partir de texto pegado. */
  importPlan(name: string, text: string): { ok: boolean; message: string; id?: string } {
    const title = name.trim();
    if (title.length < 3) return { ok: false, message: 'Escribe el nombre de la carrera.' };
    const cycles = parsePlan(text);
    const courses = cycles.reduce((n, c) => n + c.courses.length, 0);
    if (courses === 0) return { ok: false, message: 'No encontré cursos. Cada ciclo debe empezar con su número (Ciclo 1).' };
    const id = `custom-${slug(title)}`;
    this.custom.set([...this.custom().filter((p) => p.id !== id), { id, name: title, plan: text }]);
    writeJson(CUSTOM_KEY, this.custom());
    return { ok: true, id, message: `${title}: ${courses} cursos en ${cycles.length} ciclos` };
  }

  removeCustom(id: string): void {
    this.custom.set(this.custom().filter((p) => p.id !== id));
    writeJson(CUSTOM_KEY, this.custom());
    if (this.selection().careerId === id) this.select({ careerId: '', cycle: 0, course: '' });
  }
}
