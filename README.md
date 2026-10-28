# Versión 0.2.4

Consulta [cambios, pruebas y límites](docs/V0.2.4.md) y [configuración segura de Google e IA](docs/CONFIGURACION.md).

# Desbloquéate · Universidad Continental, Huancayo

Aplicación de organización académica con Angular, servidor Node.js y base de datos PostgreSQL en la nube o SQLite local. Proyecto estudiantil independiente, sin afiliación oficial a la Universidad Continental.

## Iniciar

Requiere Node.js 24 LTS y npm. Dentro de esta carpeta:

```sh
npm ci
npm run build
npm start
```

Abrir http://localhost:3000. Se incluye una compilación en dist. El servidor crea data/desbloqueate.sqlite y data/.token-key automáticamente. Conservar ambos en las copias de seguridad; no publicar esa carpeta. Para desarrollo, ejecutar npm start y, en otra terminal, npm run dev (http://localhost:4200).

## Funciones incluidas

- Registro y acceso con correo institucional y contraseña propia de esta aplicación; nunca se solicita la contraseña de Google. Las cuentas locales aparecen sin verificar hasta vincular Google.
- Acceso institucional Google OAuth con comprobación de identidad y dominio continental.edu.pe.
- Malla consultable por carrera, modalidad, ciclo, nombre y electivos; selección personal de cursos.
- Tareas persistentes con fechas, prioridades, duración, estado, recordatorio y archivos. Privadas por defecto; compartir es una elección explícita.
- Buscador comunitario por carrera y curso. Solo muestra tareas públicas. Se necesita cuenta para subir o descargar archivos. Cambiar a privada retira el acceso de otros usuarios.
- Recordatorios dentro de la aplicación y avisos del navegador con permiso, mientras la página está abierta. No incluye correo ni push cuando el navegador está cerrado. Los avisos de Google Calendar funcionan una vez conectado y sincronizado.
- Calendario mensual, exportación ICS y conexión real a Google Calendar. El botón Sincronizar envía las tareas a un calendario separado llamado Desbloquéate · Mis entregas. Los cambios de tareas requieren volver a sincronizar. No importa ni modifica otros calendarios personales.
- Resumen, progreso por curso y recomendación según vencimiento, importancia, esfuerzo y estado.
- Calculadora ponderada de notas y promedio requerido en las evaluaciones restantes. Pesos editables según el sílabo; 20/20/20/40 es solo un ejemplo inicial. Una nota vacía es pendiente, una nota cero cuenta como obtenida.
- Tema claro/oscuro, cuatro colores, modo compacto, movimiento reducido y diseño adaptable.

## Activar Google

1. Crear un proyecto en Google Cloud y habilitar Google Calendar API.
2. Configurar la pantalla de consentimiento OAuth. Si está en pruebas, agregar las cuentas de prueba institucionales. Un administrador de Google Workspace puede tener que autorizar la aplicación.
3. Crear un cliente OAuth de tipo aplicación web. Registrar exactamente http://localhost:3000/api/auth/google/callback como URI de redirección local. En producción usar https://tu-dominio/api/auth/google/callback.
4. Copiar .env.example a .env y completar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Guardar esos valores únicamente en el servidor.
5. Reiniciar npm start. Entrar con Google o conectar Calendar desde una cuenta local usando el mismo correo.

Permisos: openid, email, profile y calendar.app.created para el calendario creado por la aplicación. La integración está implementada, pero no se pudo probar con una cuenta real porque no se proporcionaron credenciales de un proyecto Google. No hay una conexión Google activada por defecto.

## Datos reales y límites de la malla

Consulta: 23 de octubre de 2026. Se importaron 32 carreras y 2008 registros de asignaturas por ciclo desde las páginas oficiales enlazadas en https://ucontinental.edu.pe/campus/huancayo/. Cada carrera conserva su URL de fuente en src/assets/curriculum.json. Los créditos ausentes en la fuente se muestran sin inventarlos.

Las mallas web son referenciales: no sustituyen el plan individual ni la oferta vigente de matrícula. El selector de modalidad filtra carreras ofertadas; la malla enlazada es la publicada en la página general de cada carrera y puede diferir del plan específico de cada modalidad o cohorte.

Los grupos Electivo General, de Especialidad, etc. se conservan como aparecen en la malla. La universidad remite al Portal del Estudiante para conocer las asignaturas electivas disponibles según periodo y requisitos; no se inventó una lista de oferta. Fuente: https://tramites.ucontinental.edu.pe/es_ES/matricula/que-debo-considerar-antes-de-matricularme-en-una-asignatura-electiva

Notas: Reglamento académico, artículos 81 y 84, escala 0–20, mínimo final 10.50 y ponderaciones del sílabo: https://ucontinental.edu.pe/documentos/informacion_institucional/reglamento-academico.pdf

Correo institucional: https://tramites.ucontinental.edu.pe/es_ES/academico/guia-rapida-accede-a-tu-portal-del-estudiante

Logo: archivo oficial https://ucontinental.edu.pe/dist/assets/logo-msaG41Gn.svg, usado para identificar la universidad. No implica respaldo oficial.

Actualizar catálogo: npm run data:refresh. Antes de actualizar una instalación con datos, respaldar y comparar los cursos: los identificadores incluyen carrera, ciclo y posición en la malla. Si cambia el orden, se necesita migrar las referencias existentes; no ejecutar actualizaciones automáticas sobre una base activa.

## Pruebas y despliegue

npm test comprueba cálculo y redondeo, prioridad, ICS, registro, aislamiento entre cuentas, privacidad de archivos, recordatorios, cierre de sesión y persistencia tras reiniciar el servidor.

La publicación gratuita usa Render Free y Supabase Free. Consultar PUBLICACION-GRATUITA.md. SQLite requiere disco persistente y se reserva para uso local. No es un sitio estático desplegable únicamente en Netlify. En producción configurar NODE_ENV=production, APP_URL HTTPS y HOST=0.0.0.0; usar un proxy HTTPS y volumen persistente para /app/data. El Dockerfile incluido permite construir la imagen y servirla en el puerto 3000. No incorporar .env ni data a la imagen.

Límites de archivos: 10 MB por archivo, 8 por tarea y 100 MB por cuenta. Se guardan en PostgreSQL o SQLite según la configuración; consumen la cuota de base de datos. Contraseñas con scrypt, cookies HttpOnly/SameSite, control de propiedad en el servidor, comprobación CSRF y tokens OAuth cifrados. Esta entrega no incluye servicio de recuperación de contraseña ni verificación por correo para cuentas locales.
