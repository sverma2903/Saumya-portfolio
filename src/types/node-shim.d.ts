/**
 * node-shim.d.ts · P0. The minimal slice of Node's types that the build-time code (lib/staging.ts), the tests and
 * vitest.config.ts use, so `npx tsc --noEmit` is clean without a new devDependency.
 * DELETE THIS FILE if `@types/node` is ever added (its declarations would then clash with these).
 */
interface NodeByteBuffer extends Uint8Array {
  toString(encoding?: string, start?: number, end?: number): string;
  indexOf(value: string | number | Uint8Array, byteOffset?: number): number;
  readUInt16BE(offset: number): number; readUInt16LE(offset: number): number;
  readUInt32BE(offset: number): number; readUInt32LE(offset: number): number;
  readUIntLE(offset: number, byteLength: number): number;
}

declare var process: { cwd(): string; env: Record<string, string | undefined> };

declare module 'node:fs' {
  interface Stats { size: number; isFile(): boolean; isDirectory(): boolean }
  function existsSync(p: string): boolean;
  function statSync(p: string): Stats;
  function readdirSync(p: string): string[];
  function readFileSync(p: string): NodeByteBuffer;
  function readFileSync(p: string, encoding: 'utf8' | 'utf-8'): string;
  function openSync(p: string, flags: string): number;
  function readSync(fd: number, buf: Uint8Array, offset: number, length: number, position: number | null): number;
  function closeSync(fd: number): void;
  const fs: { existsSync: typeof existsSync; statSync: typeof statSync; readdirSync: typeof readdirSync; readFileSync: typeof readFileSync; openSync: typeof openSync; readSync: typeof readSync; closeSync: typeof closeSync };
  export { existsSync, statSync, readdirSync, readFileSync, openSync, readSync, closeSync, Stats };
  export default fs;
}

declare module 'node:path' {
  function join(...parts: string[]): string;
  function resolve(...parts: string[]): string;
  function basename(p: string, ext?: string): string;
  function extname(p: string): string;
  function dirname(p: string): string;
  const path: { join: typeof join; resolve: typeof resolve; basename: typeof basename; extname: typeof extname; dirname: typeof dirname };
  export { join, resolve, basename, extname, dirname };
  export default path;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
