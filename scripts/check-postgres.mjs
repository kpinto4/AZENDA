/**
 * Comprueba que Postgres acepte TCP antes de arrancar el API (evita crash en onModuleInit y 500 en el proxy).
 *
 * Se omite si: USE_SQLITE=1/true, SKIP_PG_CHECK=1, o DATABASE_URL (Neon u otro Postgres remoto: no es localhost:5432).
 * Para desarrollo solo SQLite: npm run dev:sqlite (no ejecuta este script).
 */
import net from 'node:net';
import { loadApiEnv } from './load-api-env.mjs';

loadApiEnv();

function envTruthy(v) {
  if (v == null || !String(v).trim()) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

if (
  envTruthy(process.env.USE_SQLITE) ||
  envTruthy(process.env.SKIP_PG_CHECK) ||
  String(process.env.DATABASE_URL ?? '').trim() !== ''
) {
  process.exit(0);
}

const host = (process.env.PGHOST ?? '127.0.0.1').trim() || '127.0.0.1';
const port = Number(process.env.PGPORT ?? 5432) || 5432;
const timeoutMs = Number(process.env.PG_CONNECT_CHECK_MS ?? 4000) || 4000;

function fail(msg, lines) {
  console.error(`\x1b[31m[check-postgres]\x1b[0m ${msg}`);
  for (const line of lines) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
}

const socket = net.connect({ host, port });

const timer = setTimeout(() => {
  socket.destroy();
  fail(`Timeout (${timeoutMs} ms) al conectar a ${host}:${port}.`, [
    '-> Postgres no responde en esa direccion (servicio parado, otro puerto, o firewall).',
    '   Opciones: (1) Neon: api/.env con DATABASE_URL=... (npm run db:bootstrap para tablas)',
    '   (2) Docker local: npm run dev:docker o npm run pg:up y luego npm run dev',
    '   (3) Postgres en Windows: servicio en marcha en PGPORT',
    '   (4) Sin Postgres: npm run dev:sqlite   (5) Omitir: SKIP_PG_CHECK=1',
  ]);
}, timeoutMs);

socket.once('connect', () => {
  clearTimeout(timer);
  socket.end();
  process.exit(0);
});

socket.once('error', (err) => {
  clearTimeout(timer);
  const code = err && 'code' in err ? String(err.code) : '';
  fail(`No se pudo conectar a ${host}:${port} (${code || err.message}).`, [
    '-> Sin DATABASE_URL, el script asume Postgres local en ese puerto.',
    '   Neon: en la raiz del repo o en api/.env define DATABASE_URL=... (linea sin # al inicio).',
    '   Luego npm run dev. O Postgres local: dev:docker / pg:up. O npm run dev:sqlite.',
  ]);
});
