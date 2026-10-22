import { Component } from '@angular/core';

/** Sección 3: arquitectura y tecnologías. */
@Component({
  selector: 'app-architecture',
  standalone: true,
  template: `
    <section id="arquitectura" class="band band--deep" aria-labelledby="arquitectura-title">
      <div class="container">
        <h2 id="arquitectura-title">3. Arquitectura y tecnologías</h2>
        <p class="lead">Moderna, modular y sin servidores.</p>

        <dl class="stack">
          @for (item of stack; track item.title) {
            <div>
              <dt><i class="bi" [class]="item.icon"></i> {{ item.title }}</dt>
              <dd>{{ item.text }}</dd>
            </div>
          }
        </dl>

        <div class="row g-4 g-lg-5 mt-1">
          <div class="col-lg-6">
            <h3>Cómo se priorizan las entregas</h3>
            <ol class="rules">
              <li>Las pendientes van antes que las completadas.</li>
              <li>Dentro de las pendientes, la fecha límite más próxima va primero.</li>
              <li>Si coinciden, queda arriba la que se registró antes.</li>
            </ol>
            <p class="legend">
              <span class="dot dot--urgent"></span> Vence hoy o ya venció
              <span class="dot dot--soon"></span> Faltan 1 a 3 días
              <span class="dot dot--calm"></span> Más de 3 días
            </p>
          </div>
          <div class="col-lg-6">
            <h3>Estructura de componentes</h3>
            <pre class="tree-diagram" aria-label="Estructura de componentes">AppComponent
 ├─ NavbarComponent      cabecera y navegación
 ├─ TaskFormComponent    alta de entregas y archivos
 ├─ TaskListComponent    lista priorizada y filtros
 ├─ CatalogComponent     carreras, ciclos y cursos
 └─ secciones informativas
TaskService        tareas + LocalStorage + priorización
AttachmentService  archivos + IndexedDB
CatalogService     carreras y cursos (planes oficiales)</pre>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .stack { display: grid; gap: 0; margin: 2.5rem 0; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); column-gap: 2rem; }
    .stack > div { padding-block: 1rem; border-top: 1px solid var(--c-rule); }
    dt { font-family: var(--serif); font-size: 1.2rem; margin-bottom: .35rem; }
    dd { margin: 0; color: var(--c-rule); max-width: 42ch; }
    .rules { padding-left: 1.25rem; max-width: var(--measure); }
    .rules li { padding-block: .2rem; }
    .legend { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem 1.25rem; font-size: .9rem; color: var(--c-rule); }
    .dot { display: inline-block; width: .7rem; height: .7rem; border-radius: 50%; margin-right: .4rem; }
    .dot--urgent { background: var(--urgent-bar); } .dot--soon { background: var(--soon-bar); } .dot--calm { background: var(--calm-bar); }
    .tree-diagram { margin: 0; padding: 1rem 1.25rem; border: 1px solid var(--c-rule); border-radius: var(--radius);
      color: var(--c-paper); font-size: .9rem; line-height: 1.6; overflow-x: auto; }
  `],
})
export class ArchitectureComponent {
  readonly stack = [
    { icon: 'bi-diagram-3', title: 'Frontend y estructura',
      text: 'Enfoque modular con Angular (Standalone Components y TypeScript) y maquetado con Bootstrap 5: interfaz limpia, responsiva (Mobile-First) y amigable.' },
    { icon: 'bi-stars', title: 'Iconografía y experiencia (UX)',
      text: 'Bootstrap Icons para guiar la vista y alertas interactivas fluidas con SweetAlert2.' },
    { icon: 'bi-sort-down', title: 'Motor de priorización',
      text: 'Algoritmo en TypeScript que ordena cronológicamente las tareas pendientes y pone arriba las de fecha límite más próxima.' },
    { icon: 'bi-hdd', title: 'Persistencia local',
      text: 'LocalStorage para las tareas e IndexedDB para los archivos adjuntos: los datos se conservan en el navegador, sin bases de datos de pago.' },
  ];
}
