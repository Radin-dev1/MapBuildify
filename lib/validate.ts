import "server-only";
import { CATEGORIES, type Asset, type Category, type Example } from "./types";
import { isValidId, storageMode } from "./storage";

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Uploaded files must live under this example's own folder in our storage. */
function isOwnFileUrl(url: string, id: string): boolean {
  if (storageMode() === "local") return url.startsWith(`/api/files/${id}/`);
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/files/${id}/`)
    );
  } catch {
    return false;
  }
}

function parseAssets(value: unknown, id: string): Asset[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((raw): Asset[] => {
    if (!raw || typeof raw !== "object") return [];
    const a = raw as Record<string, unknown>;
    const url = str(a.url, 2000);
    if (!isOwnFileUrl(url, id)) return [];
    const previewUrl = str(a.previewUrl, 2000);
    return [
      {
        url,
        name: str(a.name, 200) || "file",
        size: typeof a.size === "number" ? a.size : 0,
        contentType: str(a.contentType, 100) || "application/octet-stream",
        ...(previewUrl && isOwnFileUrl(previewUrl, id) ? { previewUrl } : {}),
      },
    ];
  });
}

export function parseExample(body: unknown): Example | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const b = body as Record<string, unknown>;
  const id = str(b.id, 64);
  if (!isValidId(id)) return "Invalid id";
  const title = str(b.title, 120);
  if (!title) return "Title is required";
  const rawCategory = str(b.category, 40);
  const category = (CATEGORIES as readonly string[]).includes(rawCategory)
    ? (rawCategory as Category)
    : "other";
  const tags = Array.isArray(b.tags)
    ? [...new Set(b.tags.map((t) => str(t, 40).toLowerCase()).filter(Boolean))].slice(0, 20)
    : [];
  const robloxAssetId = str(b.robloxAssetId, 20).replace(/\D/g, "");
  const images = parseAssets(b.images, id);
  const models = parseAssets(b.models, id);
  if (images.length === 0 && models.length === 0) return "Add at least one image or 3D model";
  return {
    id,
    title,
    description: str(b.description, 4000),
    category,
    tags,
    style: str(b.style, 80),
    ...(robloxAssetId ? { robloxAssetId } : {}),
    images,
    models,
    createdAt: new Date().toISOString(),
  };
}

/** Turns stored relative URLs (local mode) into absolute ones for API consumers. */
export function absolutize(example: Example, origin: string): Example {
  const abs = (url: string) => (url.startsWith("/") ? origin + url : url);
  const fix = (a: Asset): Asset => ({
    ...a,
    url: abs(a.url),
    ...(a.previewUrl ? { previewUrl: abs(a.previewUrl) } : {}),
  });
  return { ...example, images: example.images.map(fix), models: example.models.map(fix) };
}
