# PR Dependabot: `dependabot/npm_and_yarn/eslint/js-10.0.1`

Este PR actualiza **@eslint/js** a la versión **10.0.1** (rama `dependabot/npm_and_yarn/eslint/js-10.0.1`).

## Por qué es importante

- **Seguridad**: Incluye correcciones de vulnerabilidades (p. ej. minimatch).
- **@eslint/js 10.x** declara peer dependency **eslint ^10.0.0**, así que para usarlo sin warnings hay que tener **ESLint 10** en el proyecto.

## Estado actual: PR no mergeable sin conflictos

**No se puede pasar a ESLint 10 de forma limpia** porque:

- **eslint-plugin-react@7.37.5** (y posiblemente otros plugins) declara peer dependency `eslint@^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7` y **no incluye ESLint 10**.
- `npm install` con `eslint@^10.0.1` y `@eslint/js@^10.0.1` falla por conflicto de peer dependencies.

### Opciones

1. **Cerrar o posponer el PR**  
   Dejar el PR abierto y esperar a que **eslint-plugin-react** (y eslint-plugin-react-hooks / eslint-config-next si aplica) publiquen versiones que soporten ESLint 10. Luego actualizar este proyecto y mergear.

2. **Probar con `--legacy-peer-deps`** (no recomendado en producción)  
   Si quieres probar en local:
   ```bash
   npm install --legacy-peer-deps
   npm run lint
   ```
   Puede funcionar, pero npm marcará peer dependency incorrecta y algún plugin podría dar fallos.

3. **Mantener ESLint 9 y override de minimatch**  
   El proyecto ya tiene en `package.json` un **override** de `minimatch` a `^10.2.1`, que mitiga la vulnerabilidad sin subir a ESLint 10. Puedes seguir así hasta que el ecosistema soporte ESLint 10.

## Cuando los plugins soporten ESLint 10

1. Actualizar en `package.json`: `"eslint": "^10.0.1"` y `"@eslint/js": "^10.0.1"`.
2. Quitar `"@eslint/eslintrc"` de devDependencies (opcional; ESLint 10 no usa eslintrc).
3. Revisar si puedes quitar el override de `minimatch` y hacer `npm audit`.
4. `npm install`, `npm run lint`, `npm run type-check`, `npm run build`.

## Resumen

- **Rama del PR**: `dependabot/npm_and_yarn/eslint/js-10.0.1`.
- **Recomendación**: **No mergear** por ahora; cerrar o dejar en “pending” hasta que eslint-plugin-react (y demás) soporten ESLint 10. Mientras tanto, el override de minimatch mantiene la seguridad.
