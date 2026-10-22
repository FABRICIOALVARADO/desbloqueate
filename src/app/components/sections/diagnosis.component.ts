import { Component } from '@angular/core';

interface Branch { label: string; items: string[]; }
interface Tree { title: string; root: string; branches: Branch[]; }

/** Sección 2: árbol de problemas y árbol de objetivos. Los árboles son listas anidadas (HTML semántico). */
@Component({
  selector: 'app-diagnosis',
  standalone: true,
  template: `
    <section id="diagnostico" class="band band--ink" aria-labelledby="diagnostico-title">
      <div class="container">
        <h2 id="diagnostico-title">2. Diagnóstico y solución</h2>
        <p class="lead">Del problema que viven los estudiantes al tablero que lo resuelve.</p>

        <div class="row g-4 g-lg-5 mt-2">
          @for (tree of trees; track tree.title) {
            <article class="col-lg-6">
              <h3>{{ tree.title }}</h3>
              <ul class="tree">
                <li>
                  <span class="root">{{ tree.root }}</span>
                  <ul>
                    @for (branch of tree.branches; track branch.label) {
                      <li>
                        <span class="branch">{{ branch.label }}</span>
                        <ul>
                          @for (item of branch.items; track item) { <li>{{ item }}</li> }
                        </ul>
                      </li>
                    }
                  </ul>
                </li>
              </ul>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .tree, .tree ul { list-style: none; margin: 0; padding: 0; }
    .tree ul { margin-left: .75rem; padding-left: 1.5rem; border-left: 1px solid var(--c-rule); }
    .tree li { position: relative; padding-block: .3rem; }
    .tree ul li::before { content: ''; position: absolute; left: -1.5rem; top: 1.1rem; width: 1.1rem; border-top: 1px solid var(--c-rule); }
    .root { display: inline-block; padding: .5rem .8rem; border: 1px solid var(--c-paper); border-radius: var(--radius); font-weight: 600; }
    .branch { color: var(--c-rule); font-weight: 600; font-size: .95rem; }
  `],
})
export class DiagnosisComponent {
  readonly trees: Tree[] = [
    {
      title: 'El problema (causas y efectos)',
      root: 'Desorganización y sobrecarga mental ante múltiples entregas',
      branches: [
        { label: 'Causas', items: [
          'Fechas de entrega dispersas en sílabos y correos',
          'Apps complejas que aburren al estudiante',
          'Varias entregas acumuladas en una misma semana',
        ] },
        { label: 'Efectos', items: [
          'Parálisis por análisis',
          'Ansiedad y estrés',
          'Entregas a última hora',
        ] },
      ],
    },
    {
      title: 'La solución (medios y fines)',
      root: 'Tablero web ágil que centraliza los pendientes',
      branches: [
        { label: 'Medios', items: [
          'Registro rápido, sin cuentas ni servidores',
          'Priorización automática por fecha de entrega',
          'Datos y archivos guardados localmente',
        ] },
        { label: 'Fines', items: [
          'Reducir la carga mental',
          'Fomentar la autogestión',
          'Garantizar entregas puntuales',
        ] },
      ],
    },
  ];
}
