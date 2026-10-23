import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import type { Example } from "./types";

/**
 * Examples are stored in Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise on local disk under .data/ (for development).
 *
 * Layout (both modes):
 *   meta/<id>.json          the Example record
 *   files/<id>/<filename>   uploaded images, models and previews
 */
export type StorageMode = "blob" | "local";

export function storageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
}

const DATA_DIR = path.join(process.cwd(), ".data");

export function localFilePath(...segments: string[]): string {
  const resolved = path.resolve(DATA_DIR, "files", ...segments);
  if (!resolved.startsWith(path.resolve(DATA_DIR, "files") + path.sep)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

export function isValidId(id: string): boolean {
  return /^[a-z0-9-]{4,64}$/.test(id);
}

export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);
  return cleaned || "file";
}

export async function listExamples(): Promise<Example[]> {
  const examples =
    storageMode() === "blob" ? await listBlobExamples() : await listLocalExamples();
  return examples.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getExample(id: string): Promise<Example | null> {
  if (!isValidId(id)) return null;
  if (storageMode() === "blob") {
    const { blobs } = await list({ prefix: `meta/${id}.json`, limit: 1 });
    if (!blobs[0]) return null;
    return fetchJson(blobs[0].url);
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "meta", `${id}.json`), "utf8");
    return JSON.parse(raw) as Example;
  } catch {
    return null;
  }
}

export async function saveExample(example: Example): Promise<void> {
  const body = JSON.stringify(example, null, 2);
  if (storageMode() === "blob") {
    await put(`meta/${example.id}.json`, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }
  await fs.mkdir(path.join(DATA_DIR, "meta"), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "meta", `${example.id}.json`), body);
}

export async function deleteExample(id: string): Promise<boolean> {
  if (!isValidId(id)) return false;
  if (storageMode() === "blob") {
    const urls: string[] = [];
    for (const prefix of [`meta/${id}.json`, `files/${id}/`]) {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor });
        urls.push(...page.blobs.map((b) => b.url));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    }
    if (urls.length === 0) return false;
    await del(urls);
    return true;
  }
  const metaPath = path.join(DATA_DIR, "meta", `${id}.json`);
  try {
    await fs.unlink(metaPath);
  } catch {
    return false;
  }
  await fs.rm(path.join(DATA_DIR, "files", id), { recursive: true, force: true });
  return true;
}

/** Local mode only: write an uploaded file and return its served URL. */
export async function saveLocalFile(id: string, name: string, data: Buffer): Promise<string> {
  const fileName = `${Date.now().toString(36)}-${safeFileName(name)}`;
  const target = localFilePath(id, fileName);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return `/api/files/${id}/${fileName}`;
}

async function listBlobExamples(): Promise<Example[]> {
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "meta/", cursor });
    urls.push(...page.blobs.map((b) => b.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const results = await Promise.all(urls.map((url) => fetchJson(url).catch(() => null)));
  return results.filter((e): e is Example => e !== null);
}

async function listLocalExamples(): Promise<Example[]> {
  const dir = path.join(DATA_DIR, "meta");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const results = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          return JSON.parse(await fs.readFile(path.join(dir, f), "utf8")) as Example;
        } catch {
          return null;
        }
      }),
  );
  return results.filter((e): e is Example => e !== null);
}

async function fetchJson(url: string): Promise<Example> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to read ${url}: ${res.status}`);
  return (await res.json()) as Example;
}
