#!/usr/bin/env node
// expo-react-native-boilerplate MCP server (stdio, zero-dep).
//
// Exposes the screen / component / service / store / DTO / lib registry to
// MCP-compatible AI clients (Claude Desktop, Cursor, Cline, Windsurf, Zed).
// Implements JSON-RPC 2.0 framed over stdio per the Model Context Protocol.
//
// Reads the static snapshot at public/registry/registry.json. Rebuild via
// `npm run registry:snapshot`.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(REPO_ROOT, 'public/registry/registry.json');
const COMPONENTS_MD_DIR = path.join(REPO_ROOT, 'public/components');

let cachedRegistry = null;
async function getRegistry() {
  if (cachedRegistry) return cachedRegistry;
  let raw;
  try { raw = await readFile(SNAPSHOT_PATH, 'utf8'); }
  catch {
    throw new Error(`Registry snapshot not found at ${path.relative(REPO_ROOT, SNAPSHOT_PATH)}. Run: npm run registry:snapshot`);
  }
  cachedRegistry = JSON.parse(raw);
  return cachedRegistry;
}

const TOOLS = [
  {
    name: 'list_screens',
    description: 'List Expo Router screens. Optional filter: kind (screen|layout|not-found|html) or group (e.g. "auth", "tabs").',
    inputSchema: {
      type: 'object',
      properties: {
        kind:  { type: 'string', enum: ['screen', 'layout', 'not-found', 'html'] },
        group: { type: 'string' },
      },
    },
  },
  {
    name: 'get_screen',
    description: 'Get a single screen by filePath, including its route, layout chain, group, dynamic flag.',
    inputSchema: {
      type: 'object',
      required: ['filePath'],
      properties: { filePath: { type: 'string', description: 'Repo-relative path, e.g. "app/(auth)/login.tsx".' } },
    },
  },
  {
    name: 'search_screens',
    description: 'Substring search across screen filePath + route. Returns up to `limit` matches (default 20).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: 'list_components',
    description: 'List UI components under components/. Optional filter: category (e.g. "ui", "auth").',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
      },
    },
  },
  {
    name: 'get_component',
    description: 'Get a single component by id (e.g. "ui/Button"), returning name, category, exports, props.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'search_components',
    description: 'Substring search across component id + name + props. Returns up to `limit` matches (default 20).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: 'list_services',
    description: 'List *.service.client.ts files. Each entry includes the exported class name, static methods, and axios endpoints called.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_stores',
    description: 'List Zustand stores under stores/. Each entry includes the exported hook name, state keys, and a `persisted` flag.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_dtos',
    description: 'List Zod DTO modules under dto/. Each entry includes exported schemas (ending in Schema or Enum) and TypeScript types.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_libs',
    description: 'List primitive libs under libs/ (axios, env, i18n, logger, mmkv, secureStorage, zustandStorage).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_conventions',
    description: 'Return the routing / styling / state / tokens / dataFetch / validation / icons / fileNaming conventions. Read this before adding new code.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_component_md',
    description: 'Return the per-component markdown chunk at public/components/<category>-<name>.md.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: 'Component id, e.g. "ui/Button".' } },
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from disk. Path must be repo-relative (e.g. "components/ui/Button.tsx") and resolve inside the repository root.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: { path: { type: 'string' } },
    },
  },
];

async function callTool(name, args = {}) {
  const reg = await getRegistry();
  switch (name) {
    case 'list_screens': {
      const out = reg.screens.filter((s) =>
        (!args.kind  || s.kind === args.kind) &&
        (!args.group || s.group === args.group),
      );
      return jsonResult(out);
    }
    case 'get_screen': {
      const s = reg.screens.find((x) => x.filePath === args.filePath);
      if (!s) return errorResult(`Unknown screen: ${args.filePath}`);
      return jsonResult(s);
    }
    case 'search_screens': {
      const q = String(args.query || '').toLowerCase();
      const limit = clampInt(args.limit, 20, 1, 100);
      const scored = [];
      for (const s of reg.screens) {
        const hay = `${s.filePath}\n${s.route}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1) continue;
        scored.push({ score: idx, entry: s });
      }
      scored.sort((a, b) => a.score - b.score);
      return jsonResult(scored.slice(0, limit).map(({ entry }) => entry));
    }
    case 'list_components': {
      const out = reg.components.filter((c) =>
        !args.category || c.category === args.category,
      );
      return jsonResult(out);
    }
    case 'get_component': {
      const c = reg.components.find((x) => x.id === args.id);
      if (!c) return errorResult(`Unknown component: ${args.id}`);
      return jsonResult(c);
    }
    case 'search_components': {
      const q = String(args.query || '').toLowerCase();
      const limit = clampInt(args.limit, 20, 1, 100);
      const scored = [];
      for (const c of reg.components) {
        const hay = `${c.id}\n${c.name}\n${(c.props || []).join(' ')}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1) continue;
        scored.push({ score: idx, entry: c });
      }
      scored.sort((a, b) => a.score - b.score);
      return jsonResult(scored.slice(0, limit).map(({ entry }) => entry));
    }
    case 'list_services':  return jsonResult(reg.services);
    case 'list_stores':    return jsonResult(reg.stores);
    case 'list_dtos':      return jsonResult(reg.dtos);
    case 'list_libs':      return jsonResult(reg.libs);
    case 'get_conventions':return jsonResult({ layers: reg.layers, conventions: reg.conventions });
    case 'get_component_md': {
      const c = reg.components.find((x) => x.id === args.id);
      if (!c) return errorResult(`Unknown component: ${args.id}`);
      const filename = `${c.category}-${path.basename(c.filePath).replace(/\.(tsx?|jsx?)$/, '')}.md`;
      try {
        const text = await readFile(path.join(COMPONENTS_MD_DIR, filename), 'utf8');
        return { content: [{ type: 'text', text }] };
      } catch {
        return errorResult(`No markdown chunk for component: ${args.id}`);
      }
    }
    case 'read_file': {
      const relPath = String(args.path || '');
      const abs = path.resolve(REPO_ROOT, relPath);
      if (!abs.startsWith(REPO_ROOT + path.sep) && abs !== REPO_ROOT) {
        return errorResult(`Refusing path outside repo: ${relPath}`);
      }
      try {
        const s = await stat(abs);
        if (s.isDirectory()) return errorResult(`Path is a directory: ${relPath}`);
        const src = await readFile(abs, 'utf8');
        return { content: [{ type: 'text', text: src }] };
      } catch (e) {
        return errorResult(`Could not read ${relPath}: ${e.message}`);
      }
    }
    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

function jsonResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}
function clampInt(v, def, lo, hi) {
  const n = parseInt(v ?? def, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, lo), hi);
}

const SERVER_INFO = { name: 'expo-react-native-boilerplate-registry', version: '1.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

async function handle(message) {
  if (!message || typeof message !== 'object') return null;
  const { id, method, params } = message;
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        });
      case 'tools/list': return reply(id, { tools: TOOLS });
      case 'tools/call': {
        const result = await callTool(params?.name, params?.arguments || {});
        return reply(id, result);
      }
      case 'ping': return reply(id, {});
      case 'notifications/initialized':
      case 'initialized':
        return null;
      default:
        if (id !== undefined) return reply(id, null, { code: -32601, message: `Method not found: ${method}` });
        return null;
    }
  } catch (err) {
    if (id !== undefined) return reply(id, null, { code: -32000, message: err?.message || String(err) });
    return null;
  }
}

function reply(id, result, error) {
  const payload = { jsonrpc: '2.0', id };
  if (error) payload.error = error;
  else payload.result = result;
  return payload;
}

// --- stdio loop (with async-safe shutdown — fix back-ported from kui-ejs).
// Tracks in-flight requests and only exits once every queued line has been
// written; earlier revisions exited as soon as stdin closed and dropped
// responses still being awaited.

let buffer = '';
let inflight = 0;
let stdinEnded = false;

function maybeExit() {
  if (stdinEnded && inflight === 0) process.exit(0);
}

async function processLine(line) {
  inflight++;
  try {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    const out = await handle(msg);
    if (out) process.stdout.write(JSON.stringify(out) + '\n');
  } finally {
    inflight--;
    maybeExit();
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) void processLine(line);
  }
});
process.stdin.on('end', () => {
  stdinEnded = true;
  if (buffer.trim()) {
    void processLine(buffer.trim());
    buffer = '';
  }
  maybeExit();
});
