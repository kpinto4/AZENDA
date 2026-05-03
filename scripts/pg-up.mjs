/**
 * Levanta Postgres del docker-compose sin depender de que `docker` este en el PATH.
 */
import { spawnSync } from 'node:child_process';
import { findDockerExe, repoRoot } from './docker-helpers.mjs';

const docker = findDockerExe();
const args = ['compose', 'up', '-d', '--wait', 'postgres'];

const r = spawnSync(docker, args, {
  cwd: repoRoot(),
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

if (r.status === 0) {
  process.exit(0);
}

if (r.error?.code === 'ENOENT') {
  console.error('\n[pg-up] No se encontro el ejecutable Docker:', docker);
  if (docker !== 'docker' && process.env.DOCKER_CLI_PATH) {
    console.error('  Revisa DOCKER_CLI_PATH: la ruta debe ser el docker.exe real (sin comillas sobrantes).');
  }
}

console.error('  - Instala Docker Desktop: https://docs.docker.com/desktop/install/windows-install/');
console.error('  - Abre Docker Desktop y espera a "Running".');
console.error('  - Si docker.exe existe pero la terminal no lo encuentra, define:');
console.error('    DOCKER_CLI_PATH=C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe');
console.error('  - Sin Docker: Postgres instalado en Windows (puerto 5432) o npm run dev:sqlite\n');

process.exit(r.status ?? 1);
