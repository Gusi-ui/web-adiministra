#!/usr/bin/env node

/**
 * Script para validar la configuración de workflows
 * Verifica que todos los secrets necesarios estén configurados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Cargar variables de entorno al inicio
loadEnvFile();

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('\n🔍 Verificando variables de entorno...', 'blue');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  ];

  const missing = [];
  const present = [];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
      log(`  ✅ ${varName}`, 'green');
    } else {
      missing.push(varName);
      log(`  ❌ ${varName}`, 'red');
    }
  });

  if (missing.length > 0) {
    log(`\n⚠️  Variables faltantes: ${missing.join(', ')}`, 'yellow');
    log('   Configura estas variables en tu archivo .env.local', 'yellow');
  } else {
    log('\n✅ Todas las variables de entorno están configuradas', 'green');
  }

  return { missing, present };
}

function checkWorkflowFiles() {
  log('\n🔍 Verificando archivos de workflow...', 'blue');

  const workflowDir = path.join(__dirname, '..', '.github', 'workflows');
  const workflowFiles = [
    'ci.yml',
    'quality-check.yml',
    'validate.yml',
    'web-deploy.yml',
    'code-scanning.yml',
  ];

  const issues = [];

  workflowFiles.forEach(file => {
    const filePath = path.join(workflowDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Verificar versión de checkout
      if (content.includes('actions/checkout@v4')) {
        issues.push(`${file}: Usa actions/checkout@v4 (debería ser v5)`);
      }

      // Verificar versión de setup-node
      if (content.includes('actions/setup-node@v4')) {
        issues.push(`${file}: Usa actions/setup-node@v4 (debería ser v5)`);
      }

      log(`  ✅ ${file}`, 'green');
    } else {
      log(`  ❌ ${file} (no encontrado)`, 'red');
      issues.push(`${file}: Archivo no encontrado`);
    }
  });

  if (issues.length > 0) {
    log('\n⚠️  Problemas encontrados en workflows:', 'yellow');
    issues.forEach(issue => log(`  - ${issue}`, 'yellow'));
  } else {
    log('\n✅ Todos los workflows están actualizados', 'green');
  }

  return issues;
}

function checkPackageJson() {
  log('\n🔍 Verificando package.json...', 'blue');

  const packagePath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packagePath)) {
    log('  ❌ package.json no encontrado', 'red');
    return [];
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const issues = [];

  // Verificar scripts necesarios
  const requiredScripts = ['build', 'lint', 'type-check', 'format:check'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      log(`  ✅ Script '${script}'`, 'green');
    } else {
      log(`  ❌ Script '${script}' faltante`, 'red');
      issues.push(`Script '${script}' no encontrado en package.json`);
    }
  });

  // Verificar versión de Node.js
  if (packageJson.engines && packageJson.engines.node) {
    log(`  ✅ Node.js version: ${packageJson.engines.node}`, 'green');
  } else {
    log(`  ⚠️  Versión de Node.js no especificada`, 'yellow');
    issues.push('Versión de Node.js no especificada en engines');
  }

  return issues;
}

function main() {
  log('🚀 Validación de Workflows - SAD LAS Web', 'cyan');
  log('==========================================', 'cyan');

  const envCheck = checkEnvironmentVariables();
  const workflowIssues = checkWorkflowFiles();
  const packageIssues = checkPackageJson();

  const totalIssues =
    envCheck.missing.length + workflowIssues.length + packageIssues.length;

  log('\n📊 Resumen:', 'magenta');
  log(
    `  Variables de entorno: ${envCheck.present.length}/${envCheck.present.length + envCheck.missing.length} configuradas`,
    envCheck.missing.length === 0 ? 'green' : 'yellow'
  );
  log(
    `  Problemas en workflows: ${workflowIssues.length}`,
    workflowIssues.length === 0 ? 'green' : 'yellow'
  );
  log(
    `  Problemas en package.json: ${packageIssues.length}`,
    packageIssues.length === 0 ? 'green' : 'yellow'
  );

  if (totalIssues === 0) {
    log('\n🎉 ¡Todos los workflows están configurados correctamente!', 'green');
    process.exit(0);
  } else {
    log(
      `\n⚠️  Se encontraron ${totalIssues} problemas que necesitan atención`,
      'yellow'
    );
    log(
      '   Revisa los detalles arriba y corrige los problemas antes de continuar',
      'yellow'
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkEnvironmentVariables, checkPackageJson, checkWorkflowFiles };
