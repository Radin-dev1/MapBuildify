import { siteUrl } from "./config";
import type { Example } from "./types";

export interface Catalog {
  version: number;
  examples: Example[];
}

/** Reads the published catalog. It updates each time the Pages workflow redeploys. */
export async function loadCatalog(): Promise<Example[]> {
  const res = await fetch(`${siteUrl("examples/index.json")}?t=${Date.now()}`, { cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Could not load the catalog (${res.status})`);
  const catalog = (await res.json()) as Catalog;
  return [...catalog.examples].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
