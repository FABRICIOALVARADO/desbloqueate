# Publicación gratuita

Render Free ejecuta Node.js y Supabase Free conserva PostgreSQL. render.yaml usa plan free, sin disco ni servicios de pago.

Configurar DATABASE_URL del rol planner_app y TOKEN_ENCRYPTION_KEY (32 bytes aleatorios en base64) como secretos del servidor Render. Nunca publicarlos en GitHub. El esquema privado planner usa RLS y el servidor controla la propiedad de cada recurso.

Si el servidor no tiene IPv6, copiar la conexión Session Pooler desde Supabase Connect, usuario planner_app.REFERENCIA y puerto 5432. TLS exige certificado válido.

Render proporciona la URL HTTPS. Google requiere configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET y registrar esa URL con /api/auth/google/callback.

Render Free suspende el servicio tras 15 minutos sin tráfico y puede tardar un minuto en despertar. Los recordatorios internos requieren servidor activo. Supabase Free incluye 500 MB de base de datos y puede pausarse tras una semana inactiva. Los adjuntos consumen esos 500 MB, no el cupo separado de Storage. Revisar uso y respaldar datos.

Fuentes: https://render.com/docs/free y https://supabase.com/pricing
