# Configuración externa segura

## Google Identity y Calendar
1. En https://console.cloud.google.com/ selecciona o crea un proyecto. Habilita Google Calendar API.
2. En Google Auth Platform configura marca y audiencia. Si el proyecto no pertenece al dominio institucional, usa audiencia externa y agrega tu cuenta como usuario de prueba mientras esté en Testing. No declares que representas oficialmente a la universidad.
3. Crea un cliente OAuth de tipo Aplicación web. Origen: https://desbloqueate-uc.onrender.com . URI de redirección exacta: https://desbloqueate-uc.onrender.com/api/auth/google/callback . Para pruebas locales crea un cliente separado.
4. Guarda GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Environment del servicio existente de Render. Conserva DATABASE_URL y TOKEN_ENCRYPTION_KEY. Nunca pegues el secreto en el chat, frontend o Git.
5. Reinicia el servicio. Prueba primero acceso con Google, después conectar Calendar y finalmente autorizar disponibilidad. Login usa openid/email/profile; Calendar solicita calendar.app.created; disponibilidad añade calendar.freebusy.
6. Crea una tarea de prueba, solicita una propuesta con disponibilidad autorizada, revisa y acepta; confirma crear los eventos. Verifica el calendario Desbloquéate y desconecta para comprobar revocación. El modo Testing de Google puede caducar autorizaciones; la publicación/verificación OAuth depende de Google y de los permisos institucionales.

## IA opcional sin activar cobros
1. En https://aistudio.google.com/ revisa los modelos y cuotas gratuitos disponibles para tu proyecto. No habilites facturación ni cambies de plan para este despliegue.
2. Crea una clave y guárdala únicamente en Render como AI_API_KEY. Configura AI_PROVIDER=gemini y AI_MODEL con el identificador disponible en tu cuenta. Mantén AI_ENABLED=false hasta comprobar condiciones y privacidad.
3. La capa gratuita de Gemini puede usar contenido para mejorar productos; por eso la app informa al estudiante y exige consentimiento por consulta. No se envían correo, notas, archivos, descripciones ni eventos personales; sí los títulos, curso, señales de organización y solicitud opcional.
4. Para habilitarla usa AI_ENABLED=true, prueba con datos ficticios y comprueba respuesta válida y errores. Hay límites de 10 intentos diarios por cuenta, 100 globales y una consulta simultánea por cuenta; no sustituyen las cuotas del proveedor ni garantizan coste cero si alguien habilita facturación.
5. Alternativa: AI_PROVIDER=compatible, AI_BASE_URL de una API HTTPS compatible y modelo/clave de ese proveedor. Primero revisar sus costes y privacidad. No se configuró ninguno de pago.

La organización sin IA funciona sin estas claves. No se debe presentar la integración externa como comprobada antes de realizar estos pasos.

Referencias: https://developers.google.com/workspace/calendar/api/auth · https://developers.google.com/identity/protocols/oauth2/web-server · https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/rate-limits
