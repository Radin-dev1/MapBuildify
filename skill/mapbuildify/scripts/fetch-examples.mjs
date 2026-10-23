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

async function resolveSite(args) {
  if (args.site) return args.site;
  if (process.env.MAPBUILDIFY_URL) return process.env.MAPBUILDIFY_URL;
  try {
    const config = JSON.parse(await readFile(path.join(SKILL_DIR, "config.json"), "utf8"));
    if (config.siteUrl) return config.siteUrl;
  } catch {
    // No config file: fall through.
  }
  return null;
}

async function getCatalog(site, params) {
  const url = new URL("/api/examples", site);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  return res.json();
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
  const site = await resolveSite(args);
  if (!site) {
    console.error(
      "No MapBuildify site URL. Pass --site <url>, set MAPBUILDIFY_URL, or set siteUrl in " +
        path.join(SKILL_DIR, "config.json"),
    );
    process.exit(2);
  }

  const filter = { category: args.category, tag: args.tag, limit: args.limit };
  let catalog = await getCatalog(site, { ...filter, q: args.query });
  let fallback = false;
  if (catalog.count === 0 && (args.query || args.category || args.tag)) {
    catalog = await getCatalog(site, { limit: args.limit });
    fallback = true;
  }
  if (catalog.count === 0) {
    console.log(`The MapBuildify library at ${site} is empty. Ask the user to upload examples first.`);
    process.exit(3);
  }

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
    lines.push(`- page: ${new URL(`/examples/${example.id}`, site)}`);
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
