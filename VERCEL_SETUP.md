# 🚀 Configuración de Vercel - SAD LAS Web

## 📋 Información del Proyecto

- **Nombre del Proyecto**: `sad-las-web`
- **Repositorio**: `Gusi-ui/web-adiministra`
- **Framework**: Next.js 15.5.3
- **URL de Producción**: `https://sad-las-web.vercel.app`

## 🔧 Variables de Entorno Configuradas

```
NEXT_PUBLIC_SUPABASE_URL=https://mfvifwfmvhbztprakeaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdmlmd2ZtdmhienRwcmFrZWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODU4MTUsImV4cCI6MjA2OTM2MTgxNX0.eVWp6w2YR4H0XtWJwrsXyfOhGZ4PdNRTQBtGPr9zgbo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdmlmd2ZtdmhienRwcmFrZWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc4NTgxNSwiZXhwIjoyMDY5MzYxODE1fQ.uvHhox0M6dPZhrBUALf1x-iUK2JAcTL-zZ-NF8nRe6A
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDww_H65hY2M-ybNSCE5gYKEEZwXlTFkRI
```

## 🔑 Secrets para GitHub Actions

Después de crear el proyecto en Vercel, necesitarás estos secrets en GitHub:

### 1. VERCEL_TOKEN

- Ve a Vercel Dashboard > Settings > Tokens
- Crea un nuevo token con nombre "GitHub Actions"
- Copia el token

### 2. VERCEL_ORG_ID

- Ve a Vercel Dashboard > Settings > General
- Copia el "Team ID" o "Personal Account ID"

### 3. VERCEL_PROJECT_ID

- Ve al proyecto `sad-las-web` en Vercel
- En la URL o en Settings > General
- Copia el Project ID

## 📝 Pasos para Configurar GitHub Secrets

1. Ve a tu repositorio: https://github.com/Gusi-ui/web-adiministra
2. Haz clic en **Settings**
3. En el menú lateral, haz clic en **Secrets and variables** > **Actions**
4. Haz clic en **New repository secret**
5. Agrega cada secret:
   - Name: `VERCEL_TOKEN`, Value: [tu token]
   - Name: `VERCEL_ORG_ID`, Value: [tu org ID]
   - Name: `VERCEL_PROJECT_ID`, Value: [tu project ID]

## ✅ Verificación

Después de configurar todo:

1. **Haz un push** al repositorio
2. **Verifica** que GitHub Actions se ejecuta
3. **Comprueba** que el deployment en Vercel funciona
4. **Prueba** la aplicación en la URL de producción

## 🗑️ Limpieza (Después de verificar que todo funciona)

1. **Elimina el proyecto antiguo** `sad-clean` en Vercel
2. **Elimina el repositorio** `sad-clean` en GitHub
