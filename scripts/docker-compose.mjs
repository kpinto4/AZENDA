/**
 * Ejecuta `docker compose <args>` con la misma resolucion de docker.exe que pg-up.mjs.
 * Uso: node scripts/docker-compose.mjs down
 */
import { spawnSync } from 'node:child_process';
import { findDockerExe, repoRoot } from './docker-helpers.mjs';

const extra = process.argv.slice(2);
if (extra.length === 0) {
  console.error('Uso: node scripts/docker-compose.mjs <argumentos de compose...>');
  console.error('  Ejemplo: node scripts/docker-compose.mjs down');
  process.exit(1);
}

const docker = findDockerExe();
const r = spawnSync(docker, ['compose', ...extra], {
  cwd: repoRoot(),
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

if (r.status !== 0) {
  if (r.error?.code === 'ENOENT') {
    console.error('\n[docker-compose] Ejecutable no encontrado:', docker);
    console.error('  Instala Docker Desktop o define DOCKER_CLI_PATH=ruta\\docker.exe\n');
  }
  process.exit(r.status ?? 1);
}
