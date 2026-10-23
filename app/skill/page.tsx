import type { Metadata } from "next";
import { REPO_URL, SITE_URL } from "@/lib/config";

export const metadata: Metadata = { title: "Claude skill · MapBuildify" };

export default function SkillPage() {
  return (
    <div className="narrow">
      <p className="eyebrow">Claude skill</p>
      <h1>mapbuildify</h1>
      <p className="lead">
        A Claude skill that builds Roblox maps in your style. Before it places a single part, it downloads the
        examples from this library, looks at every image and model preview, and writes a style brief it then builds
        from.
      </p>

      <h2>Install in Claude Code</h2>
      <p className="muted">Mac, Linux or Git Bash:</p>
      <pre className="code">{`git clone ${REPO_URL}.git
mkdir -p ~/.claude/skills
cp -r MapBuildify/skill/mapbuildify ~/.claude/skills/`}</pre>
      <p className="muted">Windows PowerShell:</p>
      <pre className="code">{`git clone ${REPO_URL}.git
New-Item -ItemType Directory -Force $HOME\\.claude\\skills | Out-Null
Copy-Item -Recurse MapBuildify\\skill\\mapbuildify $HOME\\.claude\\skills\\`}</pre>
      <p className="muted">
        It is already set to read this library at <code>{SITE_URL}</code>. To use another copy of the site, change{" "}
        <code>siteUrl</code> in <code>~/.claude/skills/mapbuildify/config.json</code> or set{" "}
        <code>MAPBUILDIFY_URL</code>.
      </p>

      <h2>Use it</h2>
      <p>Open Roblox Studio with an MCP server connected, then ask Claude something like:</p>
      <pre className="code">{`Use mapbuildify to build a foggy forest map with a river and a small cabin.`}</pre>
      <p className="muted">
        Claude pulls the closest matching examples from <code>{SITE_URL}/examples/index.json</code>, studies them,
        then builds. If Studio is not connected, it writes a Luau build script you can paste into the command bar.
      </p>

      <h2>Claude.ai</h2>
      <p className="muted">
        Zip the <code>skill/mapbuildify</code> folder and upload it under Settings → Capabilities → Skills. Claude.ai
        needs network access to <code>github.io</code> allowed for the skill to fetch examples.
      </p>
    </div>
  );
}
