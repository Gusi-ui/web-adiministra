# 🏠 SAD - Sistema de Ayuda a Domicilio

Sistema de gestión inteligente para servicios asistenciales domiciliarios. Optimiza la gestión de trabajadoras, usuarios y planificaciones personalizadas con tecnología moderna y eficiente.

## 🚀 Deployment

Esta aplicación está desplegada en Vercel:

- **URL de Producción**: [web-adiministrador.vercel.app](https://web-adiministrador.vercel.app/)
- **Repositorio**: [web-adiministra](https://github.com/Gusi-ui/web-adiministra.git)
- **Status**: ✅ Deployment automático configurado con GitHub Actions
- **Última actualización**: $(date)

## 📱 Proyectos Relacionados

- **Aplicación Web**: Este repositorio (Dashboard + API)
- **Aplicación Móvil**: [movile-app](https://github.com/Gusi-ui/movile-app.git)

## 🚀 Características Principales

### 🎯 **Gestión de Trabajadoras**

- ✅ **Administración completa** de cuidadoras, auxiliares y enfermeras
- ✅ **Perfiles detallados** con información profesional
- ✅ **Horarios flexibles** y seguimiento de rendimiento
- ✅ **Dashboard personalizado** para cada trabajadora
- ✅ **Gestión de vacaciones** y días festivos

### 👤 **Gestión de Usuarios**

- ✅ **Asistencia personalizada** con necesidades específicas
- ✅ **Historial médico** y contactos de emergencia
- ✅ **Seguimiento de servicios** y evolución
- ✅ **Planificación individualizada** de cuidados

### 📅 **Planificación Personalizada**

- ✅ **Asignaciones inteligentes** con horarios flexibles
- ✅ **Prioridades dinámicas** según necesidades
- ✅ **Seguimiento en tiempo real** de servicios
- ✅ **Optimización de rutas** con Google Maps
- ✅ **Gestión de cambios** y reasignaciones

### ⏰ **Control de Horas**

- ✅ **Seguimiento preciso** de horas trabajadas
- ✅ **Balances mensuales** automáticos
- ✅ **Gestión de festivos** y vacaciones
- ✅ **Cálculo de nóminas** integrado
- ✅ **Reportes detallados** de productividad

### 🔒 **Acceso Seguro**

- ✅ **Sistema de autenticación robusto** con Supabase
- ✅ **Roles diferenciados** (Administrador, Supervisor, Trabajadora)
- ✅ **Acceso controlado** a la información
- ✅ **Encriptación de datos** sensibles

### 💻 **Tecnología Moderna**

- ✅ **Next.js 15** con App Router
- ✅ **TypeScript estricto** para mayor seguridad
- ✅ **Tailwind CSS** para diseño moderno
- ✅ **Supabase** para backend y autenticación
- ✅ **Google Maps API** para geolocalización
- ✅ **Notificaciones en tiempo real**

## 📁 Estructura del Proyecto

```
📦 web-adiministra/
├── 📁 src/                    # Código fuente
│   ├── 📁 app/               # Next.js App Router
│   │   ├── 📁 api/           # API REST endpoints
│   │   ├── 📁 dashboard/     # Dashboard administrativo
│   │   ├── 📁 worker-dashboard/ # Dashboard de trabajadoras
│   │   └── 📁 [pages]/       # Páginas principales
│   ├── 📁 components/        # Componentes React reutilizables
│   │   ├── 📁 assignments/   # Componentes de asignaciones
│   │   ├── 📁 auth/          # Componentes de autenticación
│   │   ├── 📁 layout/        # Componentes de layout
│   │   ├── 📁 notifications/ # Sistema de notificaciones
│   │   ├── 📁 route/         # Componentes de rutas y mapas
│   │   ├── 📁 ui/            # Componentes UI base
│   │   └── 📁 workers/       # Componentes de trabajadoras
│   ├── 📁 contexts/          # Contextos de React
│   ├── 📁 hooks/             # Custom hooks
│   ├── 📁 lib/               # Utilidades y configuraciones
│   ├── 📁 types/             # Tipos TypeScript
│   └── 📁 utils/             # Utilidades generales
├── 📁 scripts/               # 🔧 Scripts de utilidad
├── 📁 public/                # 🌐 Archivos públicos
│   └── 📁 sounds/            # 🔊 Sonidos de notificaciones
└── 📁 .github/               # 🤖 GitHub Actions
    └── 📁 workflows/         # Workflows de CI/CD
```

## 🛠️ Instalación

### Prerrequisitos

- **Node.js 20+** (requerido)
- **npm** o **yarn**
- **Cuenta de Supabase** configurada
- **Google Maps API Key** (opcional)

### Configuración

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/Gusi-ui/web-adiministra.git
   cd web-adiministra
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

   **Variables requeridas:**

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   SUPABASE_PROJECT_ID=tu-proyecto-id

   # Google Maps API Key (opcional)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu-google-maps-api-key

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3001
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
npm run db:types:watch   # Generar tipos automáticamente
npm run db:pull          # Sincronizar esquema local
npm run db:push          # Aplicar cambios al esquema
npm run db:status        # Ver estado de Supabase

# Utilidades
npm run import-holidays  # Importar días festivos
npm run validate-holidays # Validar días festivos
npm run test-holidays    # Probar validación de festivos
npm run favicon:gen      # Generar favicon
npm run validate-workflows # Validar configuración de workflows
```

## 🔗 API Endpoints

### **Autenticación**

- `POST /api/v1/auth/login` - Inicio de sesión
- `POST /api/v1/auth/logout` - Cerrar sesión
- `GET /api/v1/health` - Health check

### **Trabajadoras**

- `GET /api/v1/worker/profile` - Perfil de la trabajadora
- `GET /api/v1/worker/assignments` - Asignaciones de la trabajadora
- `GET /api/v1/worker/assignments/[id]` - Asignación específica
- `GET /api/v1/worker/balances` - Balances de horas

### **Notificaciones**

- `GET /api/workers/[id]/notifications` - Notificaciones de la trabajadora
- `POST /api/workers/[id]/notifications` - Crear notificación
- `GET /api/workers/[id]/notifications/unread-count` - Contador de no leídas
- `PUT /api/workers/[id]/notifications/[notificationId]` - Marcar como leída

### **Días Festivos**

- `POST /api/holidays/import` - Importar días festivos
- `POST /api/holidays/validate` - Validar días festivos

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Aplicación    │    │   Panel Web     │    │   Base de       │
│   Móvil         │◄──►│   (Next.js)     │◄──►│   Datos         │
│   (Expo)        │    │                 │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Google Maps   │
                    │   API           │
                    └─────────────────┘
```

## 🔔 Sistema de Notificaciones

El sistema incluye notificaciones completas con:

- **Notificaciones en tiempo real** via Supabase Realtime
- **Sonidos personalizados** para diferentes tipos de eventos
- **Notificaciones push** para la aplicación móvil
- **Centro de notificaciones** en el dashboard web

**Tipos de notificaciones:**

- 📅 Cambios en asignaciones
- 🗓️ Actualizaciones de horarios
- 🚨 Recordatorios urgentes
- 👥 Nuevas trabajadoras añadidas
- 🏖️ Actualizaciones de vacaciones

## 🚀 Deploy y CI/CD

El proyecto incluye un sistema completo de CI/CD:

### **GitHub Actions Workflows:**

- ✅ **CI/CD Pipeline** - Validación y build automático
- ✅ **Quality Check** - Verificación de calidad de código
- ✅ **Code Scanning** - Análisis de seguridad
- ✅ **Workflow Health Check** - Validación de configuración
- ✅ **Deploy Web App** - Despliegue automático a Vercel

### **Deployment:**

- **Automático**: Push a `main` → Deploy a Vercel
- **Manual**: `vercel --prod`
- **URL de producción**: https://web-adiministrador.vercel.app/

## 🔒 Seguridad (Supabase y GitHub)

- **Security Advisor (Supabase)**: RLS, contraseñas comprometidas y comprobaciones en PRs están documentados en [docs/SECURITY-ADVISOR.md](docs/SECURITY-ADVISOR.md).
- **PR Dependabot ESLint / @eslint/js 10**: por qué no se puede mergear aún y qué hacer cuando los plugins lo soporten: [docs/DEPENDABOT-ESLINT-10.md](docs/DEPENDABOT-ESLINT-10.md).

## 🔧 Configuración de Workflows

El proyecto incluye validación automática de workflows:

```bash
npm run validate-workflows
```

Este comando verifica:

- ✅ Variables de entorno configuradas
- ✅ Archivos de workflow actualizados
- ✅ Scripts de package.json presentes
- ✅ Versión de Node.js correcta

## 🎯 ¿Por qué elegir SAD?

Nuestra plataforma está diseñada específicamente para optimizar la gestión de servicios asistenciales domiciliarios con las mejores prácticas del sector:

- **👥 Gestión de Trabajadoras**: Administra cuidadoras, auxiliares y enfermeras con perfiles detallados
- **👤 Gestión de Usuarios**: Gestiona usuarios con necesidades específicas y historial médico
- **📅 Planificación Personalizada**: Crea asignaciones inteligentes con horarios flexibles
- **⏰ Control de Horas**: Seguimiento preciso de horas trabajadas y balances mensuales
- **🔒 Acceso Seguro**: Sistema de autenticación robusto con roles diferenciados
- **💻 Tecnología Moderna**: Desarrollado con las últimas tecnologías para garantizar rendimiento

## 📝 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con ❤️ por Gusi**

_Sistema de gestión inteligente para servicios asistenciales domiciliarios_
