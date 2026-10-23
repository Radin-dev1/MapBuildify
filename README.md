# MapBuildify

Teach Claude your Roblox map style. Live at **https://radin-dev1.github.io/MapBuildify/**.

MapBuildify has two parts:

1. **A website** on GitHub Pages where you upload example images and 3D models of Roblox maps,
   with notes on what to copy.
2. **The `mapbuildify` Claude skill** (in [`skill/mapbuildify`](skill/mapbuildify)). When you ask
   Claude to build a map, the skill downloads the matching examples, looks at every image and
   model preview, writes a style brief, and only then builds the map in Roblox Studio.

## How the website works

The site is a static Next.js export hosted on GitHub Pages. There is no server or database: the
examples live in this repo.

```
public/examples/index.json        the catalog (every example's title, notes, tags, files)
public/examples/<id>/<files>      uploaded images, models and model previews
```

The upload page commits new files and the updated `index.json` to `main` through the GitHub API,
using a token you paste in. The push triggers [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which rebuilds and republishes the site, so a new example is live one to two minutes later.

| Page | What it does |
| --- | --- |
| `/` | Library with search, category and tag filters |
| `/upload/` | Drag-and-drop upload for images (PNG, JPG, WebP) and models (GLB, GLTF, FBX, OBJ, RBXM, RBXMX) |
| `/example/?id=<id>` | Example detail with an interactive 3D viewer for GLB/GLTF |
| `/skill/` | How to install the Claude skill |
| `/examples/index.json` | The catalog the skill reads |

When you upload a GLB or GLTF model, the browser renders it and saves a screenshot next to it so
Claude can see the model too. For FBX, OBJ and RBXM files, add a screenshot yourself.

### Uploading

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):
   - Repository access: **Only select repositories** → `Radin-dev1/MapBuildify`
   - Permissions: **Contents → Read and write**
2. Open the site's Upload page, paste the token and press **Connect**. It is stored only in your
   browser.
3. Drop in files, write notes, and press **Add to library**.

Limits: 50 MB per file (GitHub refuses files over 100 MB). Everything uploaded is public, because
the repo is public.

### Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The local site reads `public/examples/` from disk, so run `git pull`
to see examples uploaded from the live site. Uploading from the local site commits to the real
repo, just like the live one.

### Use your own fork

Set `NEXT_PUBLIC_REPO_OWNER` and `NEXT_PUBLIC_REPO_NAME` for the build (defaults are in
[`lib/config.ts`](lib/config.ts)), enable Pages with **Source: GitHub Actions**, and change
`siteUrl` and `fallbackUrl` in [`skill/mapbuildify/config.json`](skill/mapbuildify/config.json).

## The Claude skill

Install it into Claude Code:

```bash
git clone https://github.com/Radin-dev1/MapBuildify.git
mkdir -p ~/.claude/skills
cp -r MapBuildify/skill/mapbuildify ~/.claude/skills/
```

It is already pointed at the live site. Then ask Claude, with Roblox Studio and a Studio MCP
server connected:

> Use mapbuildify to build a foggy forest map with a river and a small cabin.

What the skill does:

1. Runs `scripts/fetch-examples.mjs`, which downloads the best-matching examples into
   `.mapbuildify/examples/` and writes `BRIEF.md`. If the Pages site is unreachable it reads the
   repo's raw files instead.
2. Opens every image and model preview, follows your notes, and writes a style brief: palette,
   materials, scale, density, layout and lighting.
3. Plans the map, then builds it in Studio in passes using the pattern in
   [`reference/building.md`](skill/mapbuildify/reference/building.md), inserting any Roblox asset
   IDs from your examples.
4. Screenshots the result, compares it with the examples and refines it.

Without a Studio connection it writes a Luau build script you can paste into the command bar.

## Writing good examples

- **Notes matter most.** Tell Claude what to copy: "use this palette", "paths are 12 studs wide",
  "copy the lighting, ignore the buildings".
- Upload several angles of the same map as one example.
- Tag consistently (`forest`, `city`, `obby`, `horror`…) so searches find them.
- Add a Roblox asset ID when the model is on the Creator Store, so Claude can insert it directly.
