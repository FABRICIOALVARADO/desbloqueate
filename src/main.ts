import {bootProgress,bootError} from './app/utils/boot-loader';
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

bootProgress(15,'Iniciando tu espacio…');
bootstrapApplication(AppComponent).catch((err) => {bootError();console.error(err);});
