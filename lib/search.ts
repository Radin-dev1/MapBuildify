import type { Example } from "./types";

export interface ExampleFilter {
  q?: string | null;
  category?: string | null;
  tag?: string | null;
}

function haystack(e: Example): string {
  return [e.title, e.description, e.category, e.style, ...e.tags].join(" ").toLowerCase();
}

/**
 * Filters by category/tag, then ranks by how many query words match.
 * With a query, examples that match nothing are dropped.
 */
export function filterExamples(examples: Example[], filter: ExampleFilter): Example[] {
  let result = examples;
  if (filter.category) result = result.filter((e) => e.category === filter.category);
  if (filter.tag) {
    const tag = filter.tag.toLowerCase();
    result = result.filter((e) => e.tags.some((t) => t.toLowerCase() === tag));
  }
  const words = (filter.q ?? "")
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 1);
  if (words.length === 0) return result;
  return result
    .map((e) => {
      const text = haystack(e);
      return { e, score: words.filter((w) => text.includes(w)).length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.e);
}

export function allTags(examples: Example[]): string[] {
  const counts = new Map<string, number>();
  for (const e of examples) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
