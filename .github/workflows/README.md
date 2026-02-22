# GitHub Actions Workflows

## Avisos del editor (false positives)

Si en VS Code/Cursor ves **"Context access might be invalid"** en:

- **code-scanning.yml** (GITLEAKS_LICENSE)
- **web-deploy.yml** (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)

es un **falso positivo** de la extensión GitHub Actions: no reconoce secretos personalizados del repo. Los workflows se ejecutan bien en GitHub. Puedes actualizar la extensión o ignorar el aviso.

## Configuración de Secrets

Para que los workflows funcionen correctamente, necesitas configurar los siguientes secrets en tu repositorio de GitHub:

### Secrets Requeridos

1. **NEXT_PUBLIC_SUPABASE_URL**
   - URL de tu proyecto de Supabase
   - Ejemplo: `https://tu-proyecto.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Clave anónima de Supabase
   - Se encuentra en Settings > API de tu proyecto Supabase

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Clave de servicio de Supabase
   - Se encuentra en Settings > API de tu proyecto Supabase

### Secrets Opcionales (para Vercel)

4. **VERCEL_TOKEN**
   - Token de Vercel para deployment
   - Se obtiene en Vercel Dashboard > Settings > Tokens

5. **VERCEL_ORG_ID**
   - ID de la organización en Vercel

6. **VERCEL_PROJECT_ID**
   - ID del proyecto en Vercel

## Cómo Configurar Secrets

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings**
3. En el menú lateral, haz clic en **Secrets and variables** > **Actions**
4. Haz clic en **New repository secret**
5. Agrega cada secret con su nombre y valor correspondiente

## Workflows Incluidos

### 1. Quality Check (`quality-check.yml`)

- Se ejecuta en push y pull requests
- Verifica ESLint, TypeScript, formato y build
- No requiere secrets para funcionar

### 2. CI/CD Pipeline (`ci.yml`)

- Pipeline completo de integración continua
- Incluye quality check, tests y deployment
- Requiere secrets para deployment

## Notas Importantes

- Los workflows usan valores placeholder cuando los secrets no están configurados
- Esto permite que el código compile sin errores durante el desarrollo
- Los secrets reales solo se usan en el repositorio de GitHub
