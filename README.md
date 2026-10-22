# Desbloquéate

Tablero de entregas universitarias que se ordena solo por urgencia. Sin cuentas ni servidores.
Proyecto de Ingeniería de Sistemas (8 semanas) · **Autor:** Fabricio Alvarado Mauricio

## Ejecutar en local (Node 18.13+ o 20+)
```bash
npm install
npm start          # http://localhost:4200
npm run build      # genera dist/desbloqueate/browser
```

## Publicar y compartir un link
**Netlify Drop (el más rápido, sin cuenta de GitHub):**
1. `npm install` y `npm run build`.
2. Entra a https://app.netlify.com/drop e inicia sesión.
3. Arrastra la carpeta `dist/desbloqueate/browser` a la página.
4. Copia el link `https://....netlify.app` y compártelo.

**Con GitHub (se actualiza con cada `git push`):** sube el proyecto a un repositorio, en Netlify elige
*Add new site → Import from Git*; `netlify.toml` ya trae el comando y la carpeta. En Vercel funciona igual.

## Funciones
- Catálogo de cursos de la Universidad Continental por carrera y ciclo (con electivos). Incluye Ingeniería de Sistemas e Informática, Ingeniería Industrial y Derecho; las demás carreras se agregan con el importador (pega el plan desde ucontinental.edu.pe).
- Cada entrega puede asociarse a un curso y filtrarse por curso.
- Alta rápida de entregas con validación, atajos de fecha y archivos adjuntos (PDF, imágenes, Word…).
- Priorización automática y etiquetas de urgencia; filtro por estado; progreso.
- Archivos en IndexedDB (10 MB por archivo, 8 por entrega); tareas en LocalStorage.
- Secciones: tablero, resumen ejecutivo, diagnóstico (árboles) y arquitectura.

## Arquitectura
```
AppComponent
 ├─ NavbarComponent · TaskFormComponent · TaskListComponent
 └─ SummaryComponent · DiagnosisComponent · ArchitectureComponent
TaskService (tareas, LocalStorage, priorización) · AttachmentService (archivos, IndexedDB)
```
Flujo unidireccional: acción → servicio → BehaviorSubject → vista (async pipe). Estado inmutable.

## Algoritmo de priorización (`TaskService.prioritize`)
1. Pendientes antes que completadas. 2. Fecha de entrega ascendente (las vencidas quedan arriba).
3. Desempate: la más antigua primero. Coste O(n log n), `Array.sort` estable sobre una copia.
Urgencia: vencida u hoy = rojo, 1–3 días = ámbar, más de 3 = verde, completada = gris.

## Nota
Los datos viven en el navegador de cada persona: quien abra tu link verá su propio tablero vacío
(el botón "Cargar ejemplos" sirve para demostraciones).
