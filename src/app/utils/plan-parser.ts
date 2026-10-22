import { Course, Cycle } from '../models/catalog.model';

const toNumber = (s: string): number => Number(s.replace(',', '.'));

/**
 * Convierte texto de un plan de estudios en ciclos y cursos. Acepta dos formas:
 *  1) Formato propio:       "Ciclo 3" / "# 3"  y luego una línea por curso: "Base de Datos 1 | 3"
 *  2) Texto copiado de la página oficial (ucontinental.edu.pe): "01", curso, "C.3", curso, "C.4"...
 * Se ignoran viñetas y las líneas "Total de créditos".
 */
export function parsePlan(text: string): Cycle[] {
  const cycles = new Map<number, Course[]>();
  let current = 0;
  let last: Course | undefined;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^[\s•·\-–*]+/, '').trim();
    if (!line || /^total\s+de$/i.test(line) || /^total\s+de\s+cr[eé]ditos/i.test(line) || /^cr[eé]ditos\s+\d+$/i.test(line)) continue;

    const header = line.match(/^(?:#+\s*|ciclo\s*)?(\d{1,2})$/i);
    if (header) {
      current = Number(header[1]);
      if (!cycles.has(current)) cycles.set(current, []);
      last = undefined;
      continue;
    }
    const creditsOnly = line.match(/^C\.?\s*(\d+(?:[.,]\d+)?)$/i);
    if (creditsOnly) { if (last) last.credits = toNumber(creditsOnly[1]); continue; }
    if (current === 0) continue; // texto antes del primer ciclo

    const inline = line.match(/^(.*?)\s*(?:\|\s*|\s+C\.\s*)(\d+(?:[.,]\d+)?)$/i);
    const name = (inline ? inline[1] : line).trim();
    if (!name) continue;
    const course: Course = { name, credits: inline ? toNumber(inline[2]) : undefined, elective: /^electivo/i.test(name) };
    cycles.get(current)?.push(course);
    last = course;
  }
  return [...cycles.entries()].sort(([a], [b]) => a - b).map(([number, courses]) => ({ number, courses }));
}
