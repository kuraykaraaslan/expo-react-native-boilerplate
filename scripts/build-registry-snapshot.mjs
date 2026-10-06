#!/usr/bin/env node
// Builds offline AI-discoverable artifacts for the Expo + React Native boilerplate.
//
//   1. public/registry/registry.json        — full catalog
//   2. public/registry/registry.index.json  — lightweight index (no source bodies)
//   3. public/registry/screens.json         — Expo Router screens
//   4. public/registry/components.json      — UI components
//   5. public/registry/services.json        — services/<module>/*.service.client.ts files
//   6. public/registry/stores.json          — Zustand stores
//   7. public/registry/dtos.json            — Zod DTO modules (services/<module>/*.dto.ts)
//   8. public/registry/libs.json            — libs/ primitives
//   9. public/components/<id>.md            — per-component markdown chunk
//  10. public/components/_index.json        — { id → { category, file } } map
//
// Pure Node — walks the filesystem and parses with conservative regex. No
// browser, no TS compiler. Re-run via `npm run registry:snapshot`.

import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const PKG_JSON_PATH    = path.join(REPO_ROOT, 'package.json');
const APP_DIR          = path.join(REPO_ROOT, 'app');
const COMPONENTS_DIR   = path.join(REPO_ROOT, 'components');
const SERVICES_DIR     = path.join(REPO_ROOT, 'services');
const STORES_DIR       = path.join(REPO_ROOT, 'stores');
const LIBS_DIR         = path.join(REPO_ROOT, 'libs');

const OUT_REGISTRY_DIR    = path.join(REPO_ROOT, 'public/registry');
const OUT_COMPONENTS_DIR  = path.join(REPO_ROOT, 'public/components');

// --- generic walkers ------------------------------------------------------

async function walk(dir, predicate, out = []) {
  let ents;
  try { ents = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, predicate, out);
    else if (e.isFile() && predicate(full, e.name)) out.push(full);
  }
  return out;
}

function rel(p) { return path.relative(REPO_ROOT, p).split(path.sep).join('/'); }

async function readJson(p) {
  try { return JSON.parse(await readFile(p, 'utf8')); }
  catch { return null; }
}

async function readText(p) {
  try { return await readFile(p, 'utf8'); }
  catch { return null; }
}

async function exists(p) {
  try { await stat(p); return true; }
  catch { return false; }
}

// --- parsing helpers ------------------------------------------------------

function parseNamedExports(source) {
  const out = new Set();
  const re1 = /export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re1.exec(source)) !== null) out.add(m[1]);
  const re2 = /export\s*\{\s*([^}]+)\}/g;
  while ((m = re2.exec(source)) !== null) {
    for (const part of m[1].split(',')) {
      const id = part.trim().split(/\s+as\s+/).pop();
      if (id) out.add(id);
    }
  }
  if (/^\s*export\s+default\b/m.test(source)) out.add('default');
  return [...out];
}

function parseDefaultExportName(source) {
  const m1 = source.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/);
  if (m1) return m1[1];
  const m2 = source.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
  if (m2) return m2[1];
  return null;
}

function parseExportedClass(source) {
  const m = source.match(/export\s+(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/);
  return m ? m[1] : null;
}

function parseClassStaticMethods(source) {
  const out = [];
  const re = /\bstatic\s+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return [...new Set(out)];
}

function parseAxiosEndpoints(source) {
  const out = [];
  const re = /axiosInstance\.(?:get|post|put|patch|delete|head|options)\s*<[^>]*>\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  const re2 = /axiosInstance\.(?:get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((m = re2.exec(source)) !== null) out.push(m[1]);
  return [...new Set(out)];
}

function parseStateInterfaceKeys(source) {
  // Looks for an interface or type alias that ends in `State` and grabs the
  // top-level keys. Best-effort; not a TS parser.
  const m = source.match(/(?:interface|type)\s+\w*State\b[^{]*\{([\s\S]*?)\}\s*\n/);
  if (!m) return [];
  const body = m[1];
  const keys = new Set();
  const re = /^\s*([A-Za-z_$][\w$]*)\s*[?]?\s*:/gm;
  let k;
  while ((k = re.exec(body)) !== null) keys.add(k[1]);
  return [...keys];
}

function parseStoreHookName(source) {
  const m = source.match(/export\s+const\s+(use[A-Z][\w$]*)\s*=/);
  return m ? m[1] : null;
}

function isPersistedStore(source) {
  return /from\s+['"]zustand\/middleware['"]/.test(source) && /\bpersist\s*\(/.test(source);
}

function parsePropsNames(source, name) {
  // Look for `type|interface <Name>Props ... { ... }` and grab top-level keys.
  // Prefer the component's own `<name>Props` over any other *Props type.
  const own = name && source.match(new RegExp(String.raw`(?:type|interface)\s+${name}Props\b[^{]*\{([\s\S]*?)\n\}`));
  const m = own || source.match(/(?:type|interface)\s+\w*Props\b[^{]*\{([\s\S]*?)\n\}/);
  if (!m) return [];
  const body = m[1];
  const keys = new Set();
  const re = /^\s*([A-Za-z_$][\w$]*)\s*[?]?\s*:/gm;
  let k;
  while ((k = re.exec(body)) !== null) keys.add(k[1]);
  return [...keys];
}

// --- screen collection ----------------------------------------------------

function classifyScreen(filename) {
  if (filename === '_layout.tsx' || filename === '_layout.ts')   return 'layout';
  if (filename === '+not-found.tsx')                              return 'not-found';
  if (filename === '+html.tsx')                                   return 'html';
  return 'screen';
}

function routeForScreenFile(filePath) {
  // app/(auth)/login.tsx          -> /login
  // app/(tabs)/settings/index.tsx -> /settings
  // app/(tabs)/_layout.tsx        -> /(tabs)   (layout)
  // app/+not-found.tsx            -> /+not-found
  const r = rel(filePath).replace(/^app\//, '').replace(/\.(tsx?|jsx?)$/, '');
  const parts = r.split('/').filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')));
  let route = '/' + parts.join('/');
  route = route.replace(/\/index$/, '') || '/';
  return route;
}

function groupForScreenFile(filePath) {
  const r = rel(filePath).replace(/^app\//, '');
  const m = r.match(/\(([^)]+)\)/);
  return m ? m[1] : undefined;
}

function layoutChainForScreen(filePath, allLayouts) {
  // Walk up the directory tree under app/, collecting _layout files.
  const chain = [];
  const r = rel(filePath);
  const parts = r.split('/');
  for (let i = parts.length - 1; i >= 1; i--) {
    const dir = parts.slice(0, i).join('/');
    const candidate = `${dir}/_layout.tsx`;
    if (allLayouts.has(candidate) && candidate !== r) chain.unshift(candidate);
  }
  return chain;
}

async function collectScreens() {
  const files = await walk(APP_DIR, (full, name) => /\.(tsx?|jsx?)$/.test(name));
  const layoutSet = new Set(files.filter((f) => /\/_layout\.tsx?$/.test(f)).map(rel));

  const screens = [];
  for (const file of files) {
    const name = path.basename(file);
    const kind = classifyScreen(name);
    const route = routeForScreenFile(file);
    screens.push({
      filePath: rel(file),
      route,
      kind,
      group: groupForScreenFile(file),
      dynamic: /\[[^\]]+\]/.test(route),
      layoutChain: layoutChainForScreen(file, layoutSet),
    });
  }
  screens.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return screens;
}

// --- component collection -------------------------------------------------

async function collectComponents() {
  const files = await walk(COMPONENTS_DIR, (full, name) =>
    /\.(tsx?|jsx?)$/.test(name) && !name.endsWith('.test.tsx') && !name.endsWith('.test.ts'),
  );
  const components = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const r = rel(file);
    if (r === UI_BARREL) {
      components.push(...(await collectKuiReexports(src)));
      continue;
    }
    const parts = r.split('/');
    const category = parts[1] ?? 'misc';
    const basename = path.basename(file).replace(/\.(tsx?|jsx?)$/, '');
    const exports = parseNamedExports(src);
    const defaultName = parseDefaultExportName(src);
    components.push({
      id: `${category}/${basename}`,
      filePath: r,
      name: defaultName ?? basename,
      category,
      exports,
      props: parsePropsNames(src),
    });
  }
  components.sort((a, b) => a.id.localeCompare(b.id));
  return components;
}

// components/ui/index.ts re-exports kui-native (a git dependency) — expand it
// into one entry per re-exported module so agents see what the app can use.
const UI_BARREL = 'components/ui/index.ts';

async function collectKuiReexports(barrelSrc) {
  const byModule = new Map();
  const re = /^export\s*\{([^}]*)\}\s*from\s*["']kui-native\/modules\/ui\/([\w/]+)["']/gm;
  let m;
  while ((m = re.exec(barrelSrc)) !== null) {
    const names = m[1].split(',').map((n) => n.trim()).filter(Boolean);
    byModule.set(m[2], [...(byModule.get(m[2]) ?? []), ...names]);
  }
  const out = [];
  for (const [mod, exports] of byModule) {
    const sourcePath = `node_modules/kui-native/modules/ui/${mod}.tsx`;
    const src = (await readText(path.join(REPO_ROOT, sourcePath))) ?? '';
    out.push({
      id: `ui/${mod}`,
      filePath: sourcePath,
      name: mod,
      category: 'ui',
      source: 'kui-native',
      importPath: '@/components/ui',
      exports,
      props: parsePropsNames(src, mod),
    });
  }
  return out;
}

// --- service collection ---------------------------------------------------

async function collectServices() {
  const files = await walk(SERVICES_DIR, (_f, n) => n.endsWith('.service.client.ts') || n.endsWith('.service.client.tsx'));
  const services = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    services.push({
      filePath: rel(file),
      module: path.basename(path.dirname(file)),
      name: path.basename(file).replace(/\.(tsx?|jsx?)$/, ''),
      className: parseExportedClass(src) ?? undefined,
      methods: parseClassStaticMethods(src),
      endpoints: parseAxiosEndpoints(src),
    });
  }
  services.sort((a, b) => a.name.localeCompare(b.name));
  return services;
}

// --- store collection -----------------------------------------------------

async function collectStores() {
  let entries;
  try { entries = await readdir(STORES_DIR, { withFileTypes: true }); }
  catch { return []; }
  const stores = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
    const file = path.join(STORES_DIR, e.name);
    const src = (await readText(file)) ?? '';
    stores.push({
      filePath: rel(file),
      name: e.name.replace(/\.(tsx?|jsx?)$/, ''),
      hook: parseStoreHookName(src) ?? undefined,
      stateKeys: parseStateInterfaceKeys(src),
      persisted: isPersistedStore(src),
    });
  }
  stores.sort((a, b) => a.name.localeCompare(b.name));
  return stores;
}

// --- DTO collection -------------------------------------------------------

async function collectDtos() {
  const files = await walk(SERVICES_DIR, (_f, n) => n.endsWith('.dto.ts'));
  const dtos = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const exports = parseNamedExports(src);
    const schemas = exports.filter((n) => /(Schema|Enum)$/.test(n));
    const types = exports.filter((n) => !schemas.includes(n) && /^[A-Z]/.test(n));
    dtos.push({
      filePath: rel(file),
      module: path.basename(path.dirname(file)),
      name: path.basename(file).replace(/\.(tsx?|jsx?)$/, ''),
      schemas,
      types,
    });
  }
  dtos.sort((a, b) => a.name.localeCompare(b.name));
  return dtos;
}

// --- lib collection -------------------------------------------------------

async function collectLibs() {
  let entries;
  try { entries = await readdir(LIBS_DIR, { withFileTypes: true }); }
  catch { return []; }
  const libs = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
    const file = path.join(LIBS_DIR, e.name);
    const src = (await readText(file)) ?? '';
    libs.push({
      filePath: rel(file),
      name: e.name.replace(/\.(tsx?|jsx?)$/, ''),
      exports: parseNamedExports(src),
    });
  }
  libs.sort((a, b) => a.name.localeCompare(b.name));
  return libs;
}

// --- markdown chunks (one per component) ---------------------------------

function markdownForComponent(c) {
  const lines = [];
  lines.push(`# ${c.name}`);
  lines.push('');
  lines.push(`- **id:** \`${c.id}\``);
  lines.push(`- **category:** ${c.category}`);
  lines.push(`- **filePath:** \`${c.filePath}\``);
  if (c.exports?.length) lines.push(`- **exports:** ${c.exports.map((e) => `\`${e}\``).join(', ')}`);
  if (c.props?.length)   lines.push(`- **props:** ${c.props.map((p) => `\`${p}\``).join(', ')}`);
  if (c.source)          lines.push(`- **source:** ${c.source} (git dependency — fix upstream, never edit or copy)`);
  lines.push('');
  const importFrom = c.importPath ?? `@/${c.filePath.replace(/\.(tsx?|jsx?)$/, '')}`;
  lines.push('Import:', '', '```ts', `import { ${c.exports?.find((e) => e !== 'default') ?? c.name} } from '${importFrom}';`, '```', '');
  return lines.join('\n');
}

// --- main -----------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  console.log('[snapshot] reading package.json …');
  const pkg = await readJson(PKG_JSON_PATH);

  console.log('[snapshot] collecting screens …');
  const screens = await collectScreens();

  console.log('[snapshot] collecting components …');
  const components = await collectComponents();

  console.log('[snapshot] collecting services …');
  const services = await collectServices();

  console.log('[snapshot] collecting stores …');
  const stores = await collectStores();

  console.log('[snapshot] collecting DTOs …');
  const dtos = await collectDtos();

  console.log('[snapshot] collecting libs …');
  const libs = await collectLibs();

  const layers = {
    app:        'Expo Router file-based screens. (group) directories are route groups stripped from URLs. _layout.tsx defines layouts (Stack / Tabs / Slot).',
    components: 'Reusable UI under components/<category>/<Component>.tsx. NativeWind className styling; FontAwesome icons.',
    services:   'Data fetching via services/<module>/*.service.client.ts files. Use axiosInstance from @/libs/axios — never fetch() or ad-hoc axios.',
    stores:     'Zustand stores under stores/<name>Store.ts. Persisted via zustandStorage (MMKV). Never AsyncStorage. Tokens NEVER live in stores.',
    dtos:       'Zod schemas + inferred TS types in services/<module>/<module>.dto.ts. Parse every response with the matching schema; never trust raw JSON.',
    libs:       'Primitives — axios, env (Zod-validated), i18n, logger, mmkv, secureStorage, zustandStorage. Tokens live in SecureStore only.',
  };
  const conventions = {
    routing:    'Expo Router v5 file-based. Routes derived from app/ filesystem; (group) segments are stripped. Navigate with router.push/replace or <Link href="...">. Layouts via _layout.tsx.',
    styling:    'NativeWind (Tailwind CSS for React Native). Use className with token utilities. Combine classes via cn() from @/utils/cn. Avoid StyleSheet.create except for dynamic styling.',
    state:      'Zustand 5 + MMKV. Persist via @/libs/zustandStorage. NEVER AsyncStorage. Stores named <name>Store.ts, exporting use<Name>Store.',
    tokens:     'expo-secure-store ONLY (@/libs/secureStorage). Tokens NEVER stored in Zustand or MMKV. axios interceptor injects them at request time.',
    dataFetch:  'Always axiosInstance from @/libs/axios. Never fetch(). Never ad-hoc axios. Auth header (cookie-based) injected by interceptor.',
    validation: 'Zod for every input + every response. DTOs live in services/<module>/<module>.dto.ts; use *.parse() / .safeParse(). Types are z.infer<...>.',
    icons:      'FontAwesome 6 (@fortawesome/react-native-fontawesome + free-solid/free-brands). No expo/vector-icons for new code.',
    fileNaming: 'app/<route>.tsx | app/**/_layout.tsx | components/<cat>/<Pascal>.tsx | services/<module>/<module>.service.client.ts | services/<module>/<module>.dto.ts | stores/<n>Store.ts | libs/<n>.ts | utils/<n>.ts | __tests__/<n>.test.ts(x)',
  };

  const registry = {
    $schema: '/schemas/registry-v1.json',
    name: pkg?.name ?? 'expo-react-native-boilerplate',
    version: pkg?.version ?? '0.0.0',
    registryVersion: '1.0',
    generatedAt: new Date().toISOString(),
    description: 'Production-grade Expo + React Native boilerplate with multi-tenant SaaS conventions mirroring next-boilerplate.',
    layers,
    conventions,
    screens,
    components,
    services,
    stores,
    dtos,
    libs,
  };

  await rm(OUT_REGISTRY_DIR, { recursive: true, force: true });
  await rm(OUT_COMPONENTS_DIR, { recursive: true, force: true });
  await mkdir(OUT_REGISTRY_DIR, { recursive: true });
  await mkdir(OUT_COMPONENTS_DIR, { recursive: true });

  await writeFile(path.join(OUT_REGISTRY_DIR, 'registry.json'),       JSON.stringify(registry,                                                                                                       null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'registry.index.json'), JSON.stringify(registry,                                                                                                       null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'screens.json'),        JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, screens },    null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'components.json'),     JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, components }, null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'services.json'),       JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, services },   null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'stores.json'),         JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, stores },     null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'dtos.json'),           JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, dtos },       null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'libs.json'),           JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, libs },       null, 2) + '\n', 'utf8');

  const indexMap = {};
  for (const c of components) {
    const filename = `${c.id.replace(/\//g, '-')}.md`;
    await writeFile(path.join(OUT_COMPONENTS_DIR, filename), markdownForComponent(c), 'utf8');
    indexMap[c.id] = { name: c.name, category: c.category, file: filename };
  }
  await writeFile(path.join(OUT_COMPONENTS_DIR, '_index.json'), JSON.stringify(indexMap, null, 2) + '\n', 'utf8');

  const ms = Date.now() - t0;
  console.log(`[snapshot] wrote registry — ${screens.length} screens, ${components.length} components, ${services.length} services, ${stores.length} stores, ${dtos.length} dtos, ${libs.length} libs in ${ms}ms`);
}

main().catch((err) => {
  console.error('[snapshot] failed:', err.stack || err.message);
  process.exit(1);
});
