# Guía Security Advisor (Supabase y GitHub)

## Supabase Security Advisor

### 1. RLS policies (políticas demasiado permisivas)

Se han corregido las políticas RLS que usaban `USING (true)` o `WITH CHECK (true)` en:

- **`public.holidays`**: INSERT, UPDATE y DELETE restringidos a usuarios con rol `admin` o `super_admin` en la tabla `public.auth_users`.
- **`public.worker_notifications`**: SELECT sigue permitido para autenticados; INSERT, UPDATE y DELETE restringidos a `admin` / `super_admin`.

**Qué hacer en tu proyecto:**

1. Aplicar la migración en Supabase (si usas CLI):
   ```bash
   supabase db push
   ```
   O ejecutar manualmente el SQL en **SQL Editor** del Dashboard:
   - Archivo: `supabase/migrations/20260222100000_fix_rls_security_advisor.sql`

2. Comprobar en **Database → Security Advisor** que los avisos de RLS desaparecen.

### 2. Leaked Password Protection (Auth)

**Aviso:** *"Leaked password protection is currently disabled."*

Supabase Auth puede comprobar contraseñas contra [HaveIBeenPwned](https://haveibeenpwned.com/) para impedir el uso de contraseñas comprometidas.

**Cómo activarlo:**

1. En el **Dashboard de Supabase** → **Authentication** → **Settings** (o **Providers**).
2. Buscar la sección **Security** o **Password**.
3. Activar **"Leaked password protection"** / **"Check passwords against HaveIBeenPwned"**.

Documentación: [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

---

## GitHub: PRs y workflows

### Comprobaciones que se ejecutan en los PRs

- **CI** (`ci.yml`): push/PR a `main` → type-check, lint, format, build.
- **Quality Check** (`quality-check.yml`): push/PR a `main` y `develop` → lint, type-check, format, build.
- **Validate** (`validate.yml`): igual en `main` y `develop`.
- **Code Scanning** (`code-scanning.yml`): CodeQL, security lint, dependency check, secret scanning.

### Fallos habituales en PRs

1. **Secrets no configurados**  
   Los workflows usan placeholders si faltan secrets. El **build** puede pasar, pero la app en preview no tendrá Supabase/Google Maps real.  
   - Asegúrate de tener en el repo (Settings → Secrets and variables → Actions):  
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

2. **`npm ci` falla**  
   - Que `package-lock.json` esté actualizado y commiteado.  
   - Misma versión de npm que en local (o al menos compatible).

3. **Versión de Node**  
   - En el repo está definido `engines.node: "22.x"`.  
   - Los workflows usan Node 20; si quieres alinearlos, cambia en los workflows `node-version: '20'` a `node-version: '22'`.

4. **Dependencias opcionales (lightningcss / tailwind)**  
   - El paso que instala `lightningcss-linux-x64-gnu` y `@tailwindcss/oxide-linux-x64-gnu` puede fallar en algunos entornos.  
   - Los workflows usan `|| true` o continúan; si un paso posterior falla por falta de binarios, revisa que esos paquetes estén en el lockfile.

5. **Code Scanning / Secret scanning**  
   - Si Gitleaks o el secret scanning marcan algo, revisa el informe en la pestaña **Security** del repo y elimina o rota el secreto y vuelve a subir sin él.

### Re-ejecutar comprobaciones

- En el PR: **Checks** → abrir el workflow fallido → **Re-run all jobs**.  
- Si el fallo es intermitente (red, caché), suele bastar con un re-run.
