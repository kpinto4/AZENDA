/**
 * Carga .env del monorepo para scripts que se ejecutan desde la raiz.
 * Orden: .env en la raiz del repo, luego api/.env (este ultimo gana en claves repetidas).
 * No pisa variables ya definidas en el proceso (prioridad: terminal > archivos).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function monorepoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

/** @returns {Map<string, string>} */
function parseEnvFile(path) {
  const map = new Map();
  if (!existsSync(path)) {
    return map;
  }
  let raw = readFileSync(path, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    map.set(k, v);
  }
  return map;
}

export function loadApiEnv() {
  const root = monorepoRoot();
  const rootEnv = parseEnvFile(resolve(root, '.env'));
  const apiEnv = parseEnvFile(resolve(root, 'api', '.env'));
  const merged = new Map([...rootEnv, ...apiEnv]);
  for (const [k, v] of merged) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}
