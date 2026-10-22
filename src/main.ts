/**
 * Punto de entrada. Angular 17 usa "standalone components": no hay NgModule,
 * se arranca directamente el componente raíz con bootstrapApplication().
 * Aquí también se fija el idioma español para Day.js (nombres de día/mes).
 */
import 'dayjs/locale/es';
import dayjs from 'dayjs';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

dayjs.locale('es');

bootstrapApplication(AppComponent).catch((err) => console.error(err));
