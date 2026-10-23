#!/usr/bin/env node
// Downloads MapBuildify examples so Claude can look at them before building.
//
// Usage:
//   node fetch-examples.mjs --query "foggy forest with a river" [--category terrain]
//     [--tag forest] [--limit 8] [--models] [--out .mapbuildify/examples] [--site https://…]
//
// Writes <out>/BRIEF.md, <out>/catalog.json and <out>/<example-id>/<files>.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_IMAGES_PER_EXAMPLE = 8;

function parseArgs(argv) {
  const args = { limit: 8, out: ".mapbuildify/examples", models: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, "");
    if (key === "models") args.models = true;
    else if (key === "help" || key === "h") args.help = true;
    else args[key] = argv[++i];
  }
  args.limit = Number(args.limit) || 8;
  return args;
}

async function readConfig() {
  try {
    return JSON.parse(await readFile(path.join(SKILL_DIR, "config.json"), "utf8"));
  } catch {
    return {};
  }
}

function withSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

/** Loads examples/index.json from the site, or from the repo's raw files if the site fails. */
async function loadCatalog(sites) {
  const errors = [];
  for (const site of sites) {
    const url = new URL(`examples/index.json?t=${Date.now()}`, withSlash(site));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const catalog = await res.json();
      return { site, examples: catalog.examples ?? [] };
    } catch (error) {
      errors.push(`${url.origin}${url.pathname}: ${error.message}`);
    }
  }
  throw new Error(`could not load the catalog.\n  ${errors.join("\n  ")}`);
}

/** Same ranking as the website: category/tag filters, then most query words matched. */
function rank(examples, { query, category, tag }) {
  let result = [...examples].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (category) result = result.filter((e) => e.category === category);
  if (tag) result = result.filter((e) => e.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
  const words = (query ?? "").toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 1);
  if (words.length === 0) return result;
  return result
    .map((e) => {
      const text = [e.title, e.description, e.category, e.style, ...e.tags].join(" ").toLowerCase();
      return { e, score: words.filter((w) => text.includes(w)).length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.e);
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "file";
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

function rel(file) {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("node fetch-examples.mjs --query <text> [--category c] [--tag t] [--limit n] [--models] [--out dir] [--site url]");
    return;
  }
  const config = await readConfig();
  const sites = [args.site ?? process.env.MAPBUILDIFY_URL ?? config.siteUrl, config.fallbackUrl].filter(Boolean);
  if (sites.length === 0) {
    console.error(
      "No MapBuildify site URL. Pass --site <url>, set MAPBUILDIFY_URL, or set siteUrl in " +
        path.join(SKILL_DIR, "config.json"),
    );
    process.exit(2);
  }

  const { site, examples: all } = await loadCatalog(sites);
  if (all.length === 0) {
    console.log(`The MapBuildify library at ${site} is empty. Ask the user to upload examples first.`);
    process.exit(3);
  }
  let selected = rank(all, args);
  const fallback = selected.length === 0;
  if (fallback) selected = rank(all, {});
  selected = selected.slice(0, args.limit);
  // Asset paths in the catalog are relative to the site root.
  const abs = (url) => new URL(url, withSlash(site)).href;
  const catalog = {
    site,
    count: selected.length,
    examples: selected.map((e) => ({
      ...e,
      images: e.images.map((a) => ({ ...a, url: abs(a.url) })),
      models: e.models.map((a) => ({ ...a, url: abs(a.url), ...(a.previewUrl ? { previewUrl: abs(a.previewUrl) } : {}) })),
    })),
  };

  const out = path.resolve(args.out);
  await mkdir(out, { recursive: true });
  const lines = [
    "# MapBuildify examples",
    "",
    `Site: ${site}`,
    `Query: ${args.query ?? "(none)"}${args.category ? ` · category: ${args.category}` : ""}${args.tag ? ` · tag: ${args.tag}` : ""}`,
    fallback
      ? "No examples matched the query, so these are the most recent examples instead."
      : `${catalog.count} matching example(s), best match first.`,
    "",
    "Open EVERY image listed below with the Read tool before planning the build.",
    "",
  ];
  let failures = 0;

  for (const [index, example] of catalog.examples.entries()) {
    const dir = path.join(out, example.id);
    await mkdir(dir, { recursive: true });
    lines.push(`## ${index + 1}. ${example.title}`, "");
    lines.push(`- id: \`${example.id}\``);
    lines.push(`- category: ${example.category}${example.style ? ` · style: ${example.style}` : ""}`);
    if (example.tags.length) lines.push(`- tags: ${example.tags.join(", ")}`);
    if (example.robloxAssetId) lines.push(`- Roblox asset ID: ${example.robloxAssetId} (insert it instead of rebuilding)`);
    lines.push(`- page: ${new URL(`example/?id=${example.id}`, withSlash(site))}`);
    lines.push("", `**Notes from the user:** ${example.description || "(none)"}`, "");

    const images = example.images.slice(0, MAX_IMAGES_PER_EXAMPLE);
    if (images.length) lines.push("Images:");
    for (const [i, image] of images.entries()) {
      try {
        const file = await download(image.url, path.join(dir, `img${i + 1}-${safeName(image.name)}`));
        lines.push(`- ${rel(file)}`);
      } catch (error) {
        failures++;
        lines.push(`- (download failed: ${image.url} — ${error.message})`);
      }
    }
    if (example.images.length > images.length) {
      lines.push(`- …and ${example.images.length - images.length} more on the example page`);
    }

    if (example.models.length) lines.push("", "3D models:");
    for (const [i, model] of example.models.entries()) {
      const parts = [`- ${model.name}`];
      if (model.previewUrl) {
        try {
          const file = await download(model.previewUrl, path.join(dir, `model${i + 1}.preview.png`));
          parts.push(`preview: ${rel(file)}`);
        } catch (error) {
          failures++;
          parts.push(`preview download failed (${error.message})`);
        }
      } else {
        parts.push("no preview (Claude cannot see this model; rely on the images and notes)");
      }
      if (args.models) {
        try {
          const file = await download(model.url, path.join(dir, `model${i + 1}-${safeName(model.name)}`));
          parts.push(`file: ${rel(file)}`);
        } catch (error) {
          failures++;
          parts.push(`file download failed (${error.message})`);
        }
      } else {
        parts.push(`url: ${model.url}`);
      }
      lines.push(parts.join(" · "));
    }
    lines.push("");
  }

  await writeFile(path.join(out, "catalog.json"), JSON.stringify(catalog, null, 2));
  await writeFile(path.join(out, "BRIEF.md"), lines.join("\n"));
  console.log(`Fetched ${catalog.count} example(s) from ${site}${fallback ? " (fallback: most recent)" : ""}.`);
  if (failures) console.log(`${failures} file(s) failed to download; see BRIEF.md.`);
  console.log(`Read ${rel(path.join(out, "BRIEF.md"))} next, then open every image it lists.`);
}

main().catch((error) => {
  console.error(`fetch-examples failed: ${error.message}`);
  process.exit(1);
});
