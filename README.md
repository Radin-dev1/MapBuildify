# MapBuildify

Teach Claude your Roblox map style.

MapBuildify has two parts:

1. **A website** where you upload example images and 3D models of Roblox maps, with notes on what
   to copy. It exposes them as a public JSON catalog at `/api/examples`.
2. **The `mapbuildify` Claude skill** (in [`skill/mapbuildify`](skill/mapbuildify)). When you ask
   Claude to build a map, the skill downloads the matching examples, looks at every image and
   model preview, writes a style brief, and only then builds the map in Roblox Studio.

## The website

Next.js 16 app. Uploads go to [Vercel Blob](https://vercel.com/docs/vercel-blob) in production and
to a local `.data/` folder in development.

| Page / route | What it does |
| --- | --- |
| `/` | Library with search, category and tag filters |
| `/upload` | Drag-and-drop upload for images (PNG, JPG, WebP) and models (GLB, GLTF, FBX, OBJ, RBXM, RBXMX) |
| `/examples/<id>` | Example detail with an interactive 3D viewer for GLB/GLTF |
| `/skill` | How to install and configure the Claude skill |
| `GET /api/examples?q=&category=&tag=&limit=` | Public catalog the skill reads |
| `GET /api/examples/<id>` | One example |

When you upload a GLB or GLTF model, the browser renders it and saves a screenshot next to it,
so Claude can see the model too. For FBX, OBJ and RBXM files, add a screenshot yourself.

### Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `ADMIN_PASSWORD` set, local uploads need no password.

### Deploy to Vercel

1. Import this repo in Vercel.
2. In the project's **Storage** tab, create a **Blob** store and connect it. This sets
   `BLOB_READ_WRITE_TOKEN`.
3. Add an `ADMIN_PASSWORD` environment variable. Uploads and deletes require it; in production,
   uploads are refused until it is set.
4. Deploy.

Files of up to 200 MB upload straight from the browser to Blob, so the serverless body limit does
not apply.

## The Claude skill

Install it into Claude Code:

```bash
git clone https://github.com/Radin-dev1/MapBuildify.git
mkdir -p ~/.claude/skills
cp -r MapBuildify/skill/mapbuildify ~/.claude/skills/
```

Then point it at your site by editing `~/.claude/skills/mapbuildify/config.json`:

```json
{ "siteUrl": "https://your-mapbuildify-site.vercel.app" }
```

or by setting `MAPBUILDIFY_URL`. Then ask Claude, with Roblox Studio and a Studio MCP server
connected:

> Use mapbuildify to build a foggy forest map with a river and a small cabin.

What the skill does:

1. Runs `scripts/fetch-examples.mjs`, which downloads the best-matching examples into
   `.mapbuildify/examples/` and writes `BRIEF.md`.
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
