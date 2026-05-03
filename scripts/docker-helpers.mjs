import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Ruta a docker.exe o la cadena "docker" si debe buscarse en el PATH. */
export function findDockerExe() {
  const raw = process.env.DOCKER_CLI_PATH;
  if (raw != null && String(raw).trim() !== '') {
    const fromEnv = stripQuotes(String(raw));
    /** Si el usuario define DOCKER_CLI_PATH, usarla siempre (no exigir existsSync: permisos / rutas alternativas). */
    return fromEnv;
  }
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Local');
    const candidates = [
      join(pf, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
      join(pf, 'Docker', 'Docker', 'bin', 'docker.exe'),
      join(pf86, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
      join(local, 'Programs', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
  }
  return 'docker';
}
