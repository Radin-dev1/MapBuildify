---
name: mapbuildify
description: Build Roblox maps, levels, areas and scenery in the user's own style by first studying the reference images and 3D models they uploaded to their MapBuildify website. Use this whenever the user says "mapbuildify", or asks to build, generate, design or lay out a Roblox map, level, world, terrain, town, obby course, lobby, arena, biome or environment, or to make a map "like my examples" or "in my style". Always fetch and look at the examples BEFORE planning or placing anything.
---

# mapbuildify

The user keeps a library of example maps on their MapBuildify website: screenshots, 3D models
(.glb, .gltf, .fbx, .obj, .rbxm, .rbxmx), notes on what to copy, tags, a style and sometimes a
Roblox asset ID. Your job is to build what they ask for **in the style of those examples**.

The rule that makes this skill work: **look at the examples first, every time.** Do not plan,
write Luau or touch Studio until you have finished Step 2.

## Step 1. Fetch the examples

Run the fetch script that ships with this skill. Pass the user's request as the query, so the
closest examples come first:

```bash
node "<skill-dir>/scripts/fetch-examples.mjs" --query "<the user's request in a few words>"
```

- `<skill-dir>` is the folder this SKILL.md is in (usually `~/.claude/skills/mapbuildify`).
- It reads the site URL from `--site`, then the `MAPBUILDIFY_URL` env var, then `siteUrl` in
  `config.json` next to this file (the GitHub Pages site). If the site can't be reached it falls
  back to the repo's raw files (`fallbackUrl`).
- Examples uploaded in the last couple of minutes may not be on the Pages site yet. If the user
  mentions one you don't see, re-run with `--site <fallbackUrl from config.json>`.
- Useful flags: `--category terrain|building|interior|prop|layout|lighting|full-map|other`,
  `--tag <tag>`, `--limit <n>` (default 8), `--models` (also download model files),
  `--out <dir>` (default `.mapbuildify/examples` in the current folder).
- If nothing matches the query, the script falls back to the most recent examples and says so.

It downloads every example image and every 3D-model preview, then writes `BRIEF.md` in the output
folder listing each example with its notes, tags, style, asset ID and the local path of every file.

No Node? Fetch `<site>/examples/index.json` directly (public JSON), pick the relevant examples,
and download their `images[].url` and `models[].previewUrl` files yourself. Those paths are
relative to `<site>/`.

If the site is unreachable or the library is empty, tell the user and ask whether to build
without examples. Do not silently skip this step.

## Step 2. Study the examples

1. Read `BRIEF.md`.
2. **Open every downloaded image with the Read tool** so you actually see it, including model
   previews (`*.preview.png`). Do not judge examples from their titles.
3. The user's **notes are instructions**. If a note says "copy the path width" or "ignore the
   buildings", follow it.
4. For `.rbxmx` models (XML), read the file when downloaded with `--models`: it gives you exact
   part sizes, colours and materials to reuse.
5. Write a **style brief** in your reply before building. Keep it short and concrete:

   ```
   Style brief (from examples <id>, <id>, …)
   - Look: stud / smooth plastic / low-poly / realistic …
   - Palette: 4–8 hex colours, and what each is used for
   - Materials: Roblox materials per surface (Grass, Slate, WoodPlanks, Neon …)
   - Scale: player is ~5 studs tall; doors ~8; trees ~N; paths ~N wide; map ~N×N studs
   - Density and spacing: sparse/dense, clustering, how props are scattered
   - Shapes: chunky blocks, wedges, cylinders, organic terrain …
   - Layout: hub-and-spokes, linear path, grid, islands … where the spawn goes
   - Lighting: time of day, fog/Atmosphere, ambient colour, mood
   - Signature details worth copying: …
   - Reusable assets: asset IDs from the examples
   ```

   Estimate scale from things with a known size (a character, a door, a stair step).

## Step 3. Plan the map

Turn the request and the brief into a short plan: overall size in studs, zones and what goes in
each, the spawn point, the main paths, landmarks, and which example each zone borrows from.
Keep it playable: reachable spawn, walkable slopes, no gaps a player cannot cross unless
intended.

## Step 4. Build in Roblox Studio

Use whichever Roblox Studio MCP is connected, for example `execute_luau` / `multi_edit`
(Roblox Studio MCP), `run_lua_code` (superbullet-ai) or `ropilot_edit_ctx_run_command` (Ropilot).
Check the Studio state first. Follow `reference/building.md` for the build-script pattern:

- Build under one Model in Workspace named `MapBuildify_<MapName>`, with a Folder per zone.
- Anchor everything, set colours and materials from the brief, and wrap each build step in a
  ChangeHistoryService recording so the user can undo it.
- Build in passes (ground and terrain → paths → large structures → props → lighting) and keep
  each script small enough to debug.
- For examples that have a Roblox asset ID, insert that asset (an `insert_asset` tool if
  available, else `game:GetObjects("rbxassetid://<id>")`) and place copies instead of rebuilding
  it by hand.
- Prefer Terrain for natural ground, water and hills when the examples look natural; prefer parts
  when they look blocky or stud-style.

**Studio not connected?** Write the whole build as one Luau file (`mapbuildify_<name>.luau`) the
user can paste into Studio's command bar, and tell them how to run it.

## Step 5. Compare and refine

Take a screenshot of the result (a screen-capture tool, or position `workspace.CurrentCamera`
first for a clear angle). Put it next to the examples and check palette, scale, density and
lighting. Fix the biggest mismatch and capture again. Do at least one refinement pass.

## Step 6. Report

Tell the user what you built, which examples you drew from (by title) and what you copied from
each, and anything you could not match. Mention that uploading more examples on the MapBuildify
site sharpens future builds.
