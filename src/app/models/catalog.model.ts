/** Un curso del plan de estudios. `elective` = cualquier curso "Electivo ..." del plan. */
export interface Course { name: string; credits?: number; elective: boolean; }

export interface Cycle { number: number; courses: Course[]; }

export interface Career {
  id: string;
  name: string;
  faculty: string;
  source: 'uc' | 'custom'; // 'uc' = datos oficiales incluidos; 'custom' = importado por el usuario
  cycles: Cycle[];
}
