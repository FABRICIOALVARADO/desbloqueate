import { Component } from '@angular/core';

/** Sección 1: resumen ejecutivo. Componente de presentación (contenido estático). */
@Component({
  selector: 'app-summary',
  standalone: true,
  template: `
    <section id="resumen" class="band" aria-labelledby="resumen-title">
      <div class="container">
        <div class="row g-4 g-lg-5">
          <div class="col-lg-5">
            <h2 id="resumen-title">1. ¿De qué trata?</h2>
            <p class="lead">Resumen ejecutivo</p>
          </div>
          <div class="col-lg-7">
            <p>
              Desbloquéate es una aplicación web minimalista que resuelve la desorganización, el estrés y la
              sobrecarga mental de los estudiantes universitarios que acumulan varias entregas y trabajos en
              una misma semana.
            </p>
            <p>
              Su enfoque principal es ofrecer un espacio de cero fricción: no requiere cuentas, registros
              engorrosos ni servidores externos, y permite organizar los pendientes de inmediato.
            </p>
            <ul class="principles">
              <li><strong>Cero fricción.</strong> Abres la página y ya puedes anotar tu primera entrega.</li>
              <li><strong>Prioridad automática.</strong> Lo que vence primero aparece arriba, sin que decidas nada.</li>
              <li><strong>Tus datos son tuyos.</strong> Tareas y archivos se guardan en tu propio navegador.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .principles { list-style: none; padding: 0; margin: 2rem 0 0; max-width: var(--measure); }
    .principles li { padding: .9rem 0; border-top: 1px solid var(--c-rule); }
    .principles li:last-child { border-bottom: 1px solid var(--c-rule); }
  `],
})
export class SummaryComponent {}
