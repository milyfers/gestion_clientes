// ============================================================
//  ANALIZADOR DE LOGS — SDAP P2A3
//  Uso: node analizar-logs.js
//  Coloca este archivo en la misma carpeta que tu .log
// ============================================================

const fs = require('fs');
const path = require('path');

// ── Colores ANSI para la terminal ──────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgRed:  '\x1b[41m',
  bgGreen:'\x1b[42m',
  gray:   '\x1b[90m',
};

// ── Busca el archivo .log automáticamente ─────────────────
const logFile = fs.readdirSync('.').find(f => f.endsWith('.log'));
if (!logFile) {
  console.error(c.red + '✗ No se encontró ningún archivo .log en esta carpeta.' + c.reset);
  process.exit(1);
}

const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');

// ── Parser de línea ────────────────────────────────────────
function parseLine(line) {
  const ts       = line.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/)?.[1];
  const level    = line.match(/\[(INFO |WARN |ERROR)\]/)?.[1]?.trim();
  const message  = line.match(/\] ([a-z_]+) \|/)?.[1];
  const status   = line.match(/status=(\d+)/)?.[1];
  const rt       = line.match(/responseTimeMs=([\d.]+)/)?.[1];
  const path_    = line.match(/path=([^\s|]+)/)?.[1];
  const method   = line.match(/method=([A-Z]+)/)?.[1];
  const corrId   = line.match(/correlationId=([a-f0-9-]+)/)?.[1];
  return { ts, level, message, status: status ? +status : null,
           rt: rt ? +rt : null, path: path_, method, corrId };
}

const entries = lines.map(parseLine).filter(e => e.level);

// ── Helpers ───────────────────────────────────────────────
function bar(val, max, width = 30, color = c.green) {
  const filled = Math.round((val / max) * width);
  return color + '█'.repeat(filled) + c.gray + '░'.repeat(width - filled) + c.reset;
}

function separator(char = '─', len = 62) {
  return c.gray + char.repeat(len) + c.reset;
}

function header(title) {
  console.log('\n' + separator('─'));
  console.log(c.bold + c.cyan + '  ▸ ' + title.toUpperCase() + c.reset);
  console.log(separator('─'));
}

// ── Cálculos ──────────────────────────────────────────────
const levels     = { INFO: 0, WARN: 0, ERROR: 0 };
const statusMap  = {};
const pathMap    = {};
const msgMap     = {};
const latencies  = [];

for (const e of entries) {
  if (e.level) levels[e.level] = (levels[e.level] || 0) + 1;
  if (e.status) statusMap[e.status] = (statusMap[e.status] || 0) + 1;
  if (e.path)   pathMap[e.path]     = (pathMap[e.path]   || 0) + 1;
  if (e.message) msgMap[e.message]  = (msgMap[e.message] || 0) + 1;
  if (e.rt !== null) latencies.push(e.rt);
}

latencies.sort((a, b) => a - b);

function percentile(arr, p) {
  const idx = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, idx)];
}

const p50 = percentile(latencies, 50);
const p75 = percentile(latencies, 75);
const p90 = percentile(latencies, 90);
const p95 = percentile(latencies, 95);

const errors   = entries.filter(e => e.level === 'ERROR');
const warnings = entries.filter(e => e.level === 'WARN');
const highLat  = entries.filter(e => e.rt !== null && e.rt > 500);
const exitosas = entries.filter(e => e.status && e.status >= 200 && e.status < 300);

// ══════════════════════════════════════════════════════════
//  TÍTULO
// ══════════════════════════════════════════════════════════
console.clear();
console.log('\n' + c.bold + c.cyan +
  '╔══════════════════════════════════════════════════════════════╗\n' +
  '║          DASHBOARD DE LOGS — SDAP P2A3                      ║\n' +
  '║          Angular Standalone + Ionic · development           ║\n' +
  '╚══════════════════════════════════════════════════════════════╝'
+ c.reset);
console.log(c.gray + '  Archivo: ' + logFile + '  ·  ' + entries.length + ' entradas\n' + c.reset);

// ══════════════════════════════════════════════════════════
//  1. KPIs
// ══════════════════════════════════════════════════════════
header('1. KPIs generales');
console.log(`  Total entradas   : ${c.bold}${c.white}${entries.length}${c.reset}`);
console.log(`  Exitosas (2xx)   : ${c.green}${exitosas.length}${c.reset}  (${Math.round(exitosas.length/entries.length*100)}%)`);
console.log(`  Errores          : ${c.red}${errors.length}${c.reset}`);
console.log(`  Advertencias     : ${c.yellow}${warnings.length}${c.reset}`);
console.log(`  Con latencia     : ${latencies.length} registros`);

// ══════════════════════════════════════════════════════════
//  2. DISTRIBUCIÓN POR NIVEL
// ══════════════════════════════════════════════════════════
header('2. Distribución por nivel de log');
const maxLevel = Math.max(...Object.values(levels));
for (const [lvl, count] of Object.entries(levels)) {
  const color = lvl === 'ERROR' ? c.red : lvl === 'WARN' ? c.yellow : c.green;
  console.log(`  ${color}${c.bold}${lvl.padEnd(6)}${c.reset}  ${bar(count, maxLevel, 25, color)}  ${color}${count}${c.reset}`);
}

// ══════════════════════════════════════════════════════════
//  3. CÓDIGOS DE ESTADO
// ══════════════════════════════════════════════════════════
header('3. Códigos de estado HTTP');
const sortedStatus = Object.entries(statusMap).sort((a,b) => b[1]-a[1]);
const maxStatus = Math.max(...sortedStatus.map(e => e[1]));
for (const [status, count] of sortedStatus) {
  const color = status < 300 ? c.green : status < 500 ? c.yellow : c.red;
  console.log(`  ${color}${c.bold}${String(status).padEnd(6)}${c.reset}  ${bar(count, maxStatus, 25, color)}  ${color}${count}${c.reset}`);
}

// ══════════════════════════════════════════════════════════
//  4. RUTAS MÁS CONSULTADAS
// ══════════════════════════════════════════════════════════
header('4. Rutas más consultadas');
const sortedPaths = Object.entries(pathMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
const maxPath = sortedPaths[0]?.[1] || 1;
for (const [p, count] of sortedPaths) {
  console.log(`  ${c.cyan}${p.padEnd(32)}${c.reset}  ${bar(count, maxPath, 20, c.cyan)}  ${c.cyan}${count}${c.reset}`);
}

// ══════════════════════════════════════════════════════════
//  5. HISTOGRAMA DE LATENCIAS
// ══════════════════════════════════════════════════════════
header('5. Histograma de tiempos de respuesta (responseTimeMs)');
const buckets = [
  { label: '0 – 300 ms  ',  min: 0,    max: 300  },
  { label: '300 – 500 ms',  min: 300,  max: 500  },
  { label: '500 – 1000ms',  min: 500,  max: 1000 },
  { label: '> 1000 ms   ',  min: 1000, max: Infinity },
];
const buckCounts = buckets.map(b => latencies.filter(v => v >= b.min && v < b.max).length);
const maxBuck = Math.max(...buckCounts);
buckets.forEach((b, i) => {
  const color = i === 0 ? c.green : i === 1 ? c.cyan : i === 2 ? c.yellow : c.red;
  console.log(`  ${color}${b.label}${c.reset}  ${bar(buckCounts[i], maxBuck || 1, 25, color)}  ${color}${buckCounts[i]}${c.reset}`);
});

// ══════════════════════════════════════════════════════════
//  6. PERCENTILES
// ══════════════════════════════════════════════════════════
header('6. Percentiles de latencia');
const ps = [[50, p50, c.green],[75, p75, c.cyan],[90, p90, c.yellow],[95, p95, c.red]];
for (const [pct, val, color] of ps) {
  const warn = val > 1000 ? c.red + ' ⚠ OUTLIER' + c.reset : '';
  console.log(`  ${color}${c.bold}P${String(pct).padEnd(3)}${c.reset}  ${bar(val, p95 || 1, 25, color)}  ${color}${val?.toFixed(1)} ms${c.reset}${warn}`);
}

// ══════════════════════════════════════════════════════════
//  7. TOP ERRORES
// ══════════════════════════════════════════════════════════
header('7. Errores detectados');
if (errors.length === 0) {
  console.log(c.green + '  ✓ No se detectaron errores.' + c.reset);
} else {
  for (const e of errors) {
    console.log(`  ${c.red}${c.bold}[ERROR]${c.reset} ${c.white}${e.message}${c.reset}`);
    console.log(`  ${c.gray}        ${e.method || '---'} ${e.path || '---'} · status: ${c.red}${e.status}${c.reset}${c.gray} · ${e.ts}${c.reset}`);
  }
}

// ══════════════════════════════════════════════════════════
//  8. ADVERTENCIAS
// ══════════════════════════════════════════════════════════
header('8. Advertencias (WARN)');
if (warnings.length === 0) {
  console.log(c.green + '  ✓ No se detectaron advertencias.' + c.reset);
} else {
  for (const e of warnings) {
    console.log(`  ${c.yellow}${c.bold}[WARN]${c.reset}  ${c.white}${e.message}${c.reset}`);
    console.log(`  ${c.gray}        status: ${e.status} · corrId: ${e.corrId?.slice(0,8)}...${c.reset}`);
  }
}

// ══════════════════════════════════════════════════════════
//  9. LATENCIAS ALTAS (> 500ms)
// ══════════════════════════════════════════════════════════
header('9. Solicitudes con latencia alta (> 500ms)');
if (highLat.length === 0) {
  console.log(c.green + '  ✓ Ninguna solicitud superó 500ms.' + c.reset);
} else {
  for (const e of highLat.sort((a,b) => b.rt - a.rt)) {
    const color = e.rt > 1000 ? c.red : c.yellow;
    console.log(`  ${color}${c.bold}${e.rt.toFixed(1).padStart(8)} ms${c.reset}  ${c.white}${e.message}${c.reset}  ${c.gray}${e.path || ''}${c.reset}`);
  }
}

// ══════════════════════════════════════════════════════════
//  10. EVENTOS DE NEGOCIO
// ══════════════════════════════════════════════════════════
const bizEvents = ['login_exitoso','cliente_creado','cliente_actualizado',
                   'cliente_eliminado','proyecto_eliminado','proyecto_actualizado'];
header('10. Eventos de negocio');
for (const ev of bizEvents) {
  const count = msgMap[ev] || 0;
  const color = count > 0 ? c.green : c.gray;
  console.log(`  ${color}${ev.padEnd(28)}${c.reset}  ${color}${count} ocurrencia(s)${c.reset}`);
}

// ── Footer ────────────────────────────────────────────────
console.log('\n' + separator('═'));
console.log(c.gray + '  MACÍAS MORAN MILY FERNANDA · 231157 · SDAP P2A3' + c.reset);
console.log(separator('═') + '\n');
