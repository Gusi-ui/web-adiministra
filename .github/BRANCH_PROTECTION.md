# Protección de Ramas - SAD LAS Web

## Reglas de Protección para `main`

### Requisitos Obligatorios

1. **✅ Require a pull request before merging**
   - Require approvals: 1
   - Dismiss stale PR approvals when new commits are pushed
   - Require review from code owners

2. **✅ Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks required:
     - `quality-check` (ESLint, TypeScript, Prettier, Build)

3. **✅ Require conversation resolution before merging**
   - All conversations on code must be resolved

4. **✅ Require signed commits**
   - All commits must be signed

5. **✅ Require linear history**
   - No merge commits allowed

6. **✅ Include administrators**
   - Apply rules to administrators

### Restricciones

- **Restrict pushes that create files larger than 100MB**
- **Restrict pushes that create files with certain extensions**
  - `.exe`, `.dll`, `.so`, `.dylib`

## Reglas de Protección para `develop`

### Requisitos Obligatorios

1. **✅ Require a pull request before merging**
   - Require approvals: 1
   - Dismiss stale PR approvals when new commits are pushed

2. **✅ Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks required:
     - `quality-check` (ESLint, TypeScript, Prettier, Build)

3. **✅ Require conversation resolution before merging**
   - All conversations on code must be resolved

## Configuración de CODEOWNERS

```
# Global owners
* @Gusi-ui

# Frontend code
/src/ @Gusi-ui
/package.json @Gusi-ui
/tsconfig.json @Gusi-ui
/.eslintrc.json @Gusi-ui
/.prettierrc @Gusi-ui

# Configuration files
/.github/ @Gusi-ui
/.husky/ @Gusi-ui
/next.config.js @Gusi-ui
/tailwind.config.js @Gusi-ui
/postcss.config.js @Gusi-ui
```

## Comandos de Validación

### Antes de cada commit:

```bash
npm run lint          # Verificar ESLint
npm run type-check    # Verificar TypeScript
npm run format:check  # Verificar formato
npm run build         # Verificar build
```

### Formatear código:

```bash
npm run format        # Formatear con Prettier
npm run lint:fix      # Corregir errores de ESLint
```

## Estándares de Código

### TypeScript

- ❌ No usar `any`
- ✅ Usar tipos específicos
- ✅ Definir interfaces para objetos complejos
- ✅ Usar `const` en lugar de `let` cuando sea posible

### React

- ✅ Usar hooks correctamente
- ✅ Definir dependencias en useEffect
- ✅ Usar keys únicas en listas
- ✅ Evitar console.log en producción

### Estilo

- ✅ Comillas simples para strings
- ✅ Punto y coma obligatorio
- ✅ Líneas máximo 80 caracteres
- ✅ Indentación de 2 espacios
