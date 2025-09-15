# 🔐 GitHub Secrets Configuration

Este documento describe los secrets requeridos para que los workflows de GitHub Actions funcionen correctamente.

## 📋 Secrets Requeridos

### **Supabase Secrets**

Estos secrets son necesarios para la conexión con la base de datos y autenticación:

- **`NEXT_PUBLIC_SUPABASE_URL`**: URL de tu proyecto Supabase
  - Ejemplo: `https://mfvifwfmvhbztprakeaj.supabase.co`

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Clave pública anónima de Supabase
  - Ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- **`SUPABASE_SERVICE_ROLE_KEY`**: Clave de servicio de Supabase
  - Ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **Google Maps API**

- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`**: Clave de API de Google Maps
  - Ejemplo: `AIzaSyDww_H65hY2M-ybNSCE5gYKEEZwXlTFkRI`

### **Vercel Secrets (Opcional)**

Estos secrets son necesarios solo si usas GitHub Actions para deployment:

- **`VERCEL_TOKEN`**: Token de API de Vercel
- **`VERCEL_ORG_ID`**: ID de tu organización/equipo en Vercel
- **`VERCEL_PROJECT_ID`**: ID de tu proyecto en Vercel

## ⚙️ Cómo Configurar los Secrets

1. **Ve a tu repositorio en GitHub**
2. **Haz clic en "Settings"** (pestaña superior)
3. **En el menú lateral, haz clic en "Secrets and variables" > "Actions"**
4. **Haz clic en "New repository secret"**
5. **Agrega cada secret** con su nombre y valor correspondiente

## 🔄 Workflows que Usan estos Secrets

### **ci.yml**

- Usa: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### **quality-check.yml**

- Usa: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### **validate.yml**

- Usa: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### **web-deploy.yml**

- Usa: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## ⚠️ Notas Importantes

- Los secrets son **sensibles** y no deben compartirse públicamente
- Los valores de ejemplo mostrados son **placeholders** - usa tus valores reales
- Si un secret no está configurado, el workflow usará valores placeholder para permitir que el build continúe
- Los secrets solo están disponibles en el contexto de GitHub Actions, no en el código de la aplicación

## 🚨 Troubleshooting

Si ves advertencias en el editor sobre "Context access might be invalid":

1. **Verifica** que los secrets estén configurados en GitHub
2. **Confirma** que los nombres de los secrets coincidan exactamente
3. **Revisa** que los valores no contengan espacios o caracteres especiales
4. **Espera** unos minutos después de agregar secrets para que se propaguen

## 📞 Soporte

Si tienes problemas con la configuración de secrets, consulta la [documentación oficial de GitHub](https://docs.github.com/en/actions/security-guides/encrypted-secrets).
