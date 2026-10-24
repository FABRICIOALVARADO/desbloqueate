# Publicar Desbloquéate

Estado: proyecto preparado; todavía no se creó un alojamiento ni un enlace público.

La configuración render.yaml conserva cuentas, tareas, archivos y la clave de cifrado en un disco persistente de 1 GB. El servidor detecta automáticamente su URL HTTPS mediante RENDER_EXTERNAL_URL. Solo debe ejecutarse una instancia por base SQLite.

Para completar la publicación, conectar Render y el repositorio que contiene esta carpeta. Crear un Blueprint usando render.yaml y revisar el precio del servicio y del disco antes de aprobarlo. El plan gratuito de Render no admite este disco; no quitarlo para publicar con datos reales.

Después del despliegue, comprobar /api/health, registrar una cuenta de prueba, guardar una tarea, reiniciar el servicio y comprobar que sigue disponible. Compartir únicamente la URL que Render confirme como activa.

Google es opcional para la primera publicación: para activarlo, guardar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables privadas de Render y registrar la URL pública seguida de /api/auth/google/callback en Google Cloud. Nunca incluir credenciales en el repositorio.

Fuentes:
- https://render.com/docs/disks
- https://render.com/docs/blueprint-spec
- https://render.com/docs/environment-variables
