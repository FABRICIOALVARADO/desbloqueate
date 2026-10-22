/**
 * COMPONENTE RAÍZ (composición)
 * Solo ensambla la página; no contiene lógica. Arquitectura de la app:
 *
 *   AppComponent
 *     |- NavbarComponent      (cabecera y navegación por secciones)
 *     |- TaskFormComponent    (entrada: valida y llama a TaskService / AttachmentService)
 *     |- TaskListComponent    (salida: lista priorizada, filtros, adjuntos)
 *     |- CatalogComponent     (carreras, ciclos y cursos de la UC; importador de planes)
 *     |- Summary / Diagnosis / Architecture (secciones informativas, contenido estático)
 *            ^ formulario y lista comparten los mismos servicios (estado + almacenamiento)
 */
import { Component } from '@angular/core';
import { CatalogComponent } from './components/catalog/catalog.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ArchitectureComponent } from './components/sections/architecture.component';
import { DiagnosisComponent } from './components/sections/diagnosis.component';
import { SummaryComponent } from './components/sections/summary.component';
import { TaskFormComponent } from './components/task-form/task-form.component';
import { TaskListComponent } from './components/task-list/task-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, TaskFormComponent, TaskListComponent, CatalogComponent, SummaryComponent, DiagnosisComponent, ArchitectureComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {}
