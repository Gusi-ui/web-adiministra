# 🏢 SAD Gusi - Panel Administrativo Web

Sistema de gestión de horas y asignaciones para trabajadores de servicios asistenciales domiciliarios (SAD).

## 🚀 Características

- ✅ **Dashboard administrativo** completo
- ✅ **Gestión de trabajadores** y asignaciones
- ✅ **API REST** para aplicación móvil
- ✅ **Autenticación** con Supabase
- ✅ **Base de datos** PostgreSQL
- ✅ **Interfaz responsive** mobile-first
- ✅ **TypeScript** estricto
- ✅ **Tailwind CSS** para estilos

## 📁 Estructura del Proyecto

```
📦 sad-gusi-web/
├── 📁 src/                    # Código fuente
│   ├── 📁 app/               # Next.js App Router
│   ├── 📁 components/        # Componentes React
│   ├── 📁 lib/               # Utilidades y configuraciones
│   ├── 📁 hooks/             # Custom hooks
│   ├── 📁 types/             # Tipos TypeScript
│   └── 📁 utils/             # Utilidades
├── 📁 docs/                  # 📚 Documentación
├── 📁 scripts/               # 🔧 Scripts de utilidad
├── 📁 config/                # ⚙️ Configuraciones
├── 📁 public/                # 🌐 Archivos públicos
└── 📁 .github/               # 🤖 GitHub Actions
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js 20+
- npm o yarn
- Cuenta de Supabase

### Configuración

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/gusideveloper/sad-gusi-web.git
   cd sad-gusi-web
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**

   ```bash
   cp env.example .env.local
   # Editar .env.local con tus credenciales
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 🚀 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo (puerto 3001)
npm run build            # Build de producción
npm run start            # Servidor de producción

# Calidad de código
npm run lint             # Verificar linting
npm run lint:fix         # Corregir errores de linting
npm run type-check       # Verificar tipos TypeScript
npm run format           # Formatear código
npm run format:check     # Verificar formato

# Base de datos
npm run db:types         # Generar tipos de Supabase
npm run db:pull          # Sincronizar esquema local
npm run db:push          # Aplicar cambios al esquema
```

## 📚 Documentación

- [📖 Documentación completa](./docs/README.md)
- [🔌 API Reference](./docs/API.md)
- [🚀 Deployment](./docs/DEPLOYMENT.md)
- [🤝 Contributing](./docs/CONTRIBUTING.md)

## 🔗 Integración con Aplicación Móvil

Este proyecto proporciona la API REST para la aplicación móvil:

- **Repositorio móvil**: [sad-gusi-mobile](https://github.com/Gusi-ui/movile-app)
- **API Base URL**: `http://localhost:3001/api` (desarrollo)
- **Endpoints**: Ver [API.md](./docs/API.md)

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Aplicación    │    │   Panel Web     │    │   Base de       │
│   Móvil         │◄──►│   (Next.js)     │◄──►│   Datos         │
│   (Expo)        │    │                 │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Deploy

El proyecto se despliega automáticamente en Vercel cuando se hace push a la rama `main`.

- **URL de producción**: https://sad-gusi.vercel.app
- **Deploy manual**: `vercel --prod`

## 📝 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con ❤️ por Gusi**
