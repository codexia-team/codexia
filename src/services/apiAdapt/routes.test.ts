import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The desktop app and the web build now call the very same HTTP handlers, so a
 * path typo in an adapter is no longer caught by the web build alone — it
 * breaks both. These tests pin the two sides together at build time.
 */

const ADAPTER_DIR = join(__dirname);
const WEB_SRC = join(__dirname, '../../../web/src');

function readRustSources(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return [readRustSources(path)];
      return entry.name.endsWith('.rs') ? [readFileSync(path, 'utf8')] : [];
    })
    .join('\n');
}

function adapterSources(): { file: string; content: string }[] {
  return readdirSync(ADAPTER_DIR)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ file: name, content: readFileSync(join(ADAPTER_DIR, name), 'utf8') }));
}

const routerRoutes = new Set(
  Array.from(readRustSources(WEB_SRC).matchAll(/\.route\(\s*"(\/[^"]*)"/g)).map((m) => m[1])
);

describe('api adapter routes', () => {
  it('registers every endpoint the adapters call', () => {
    const missing: string[] = [];
    for (const { file, content } of adapterSources()) {
      for (const match of content.matchAll(/'(\/api\/[^']*)'/g)) {
        if (!routerRoutes.has(match[1])) {
          missing.push(`${file}: ${match[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('no longer routes calls through tauri invoke outside native-only modules', () => {
    // These modules wrap capabilities the web server cannot provide: native
    // audio capture, the codex process the desktop owns, the remote/tunnel
    // toggles that start the server itself, and the invoke wrapper they share.
    const nativeOnly = new Set(['dictation.ts', 'lifecycle.ts', 'remote.ts', 'shared.ts', 'tunnel.ts']);
    const offenders = adapterSources()
      .filter(({ file }) => !nativeOnly.has(file))
      .filter(({ content }) => /\binvokeTauri\b|\bdual(Get|Void)?[<(]/.test(content))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
