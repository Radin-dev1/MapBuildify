import type { Metadata } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claude skill · MapBuildify" };

const REPO = "https://github.com/Radin-dev1/MapBuildify.git";

export default async function SkillPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const site = `${proto}://${host}`;

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
      <pre className="code">{`git clone ${REPO}
mkdir -p ~/.claude/skills
cp -r MapBuildify/skill/mapbuildify ~/.claude/skills/`}</pre>
      <p className="muted">Windows PowerShell:</p>
      <pre className="code">{`git clone ${REPO}
New-Item -ItemType Directory -Force $HOME\\.claude\\skills | Out-Null
Copy-Item -Recurse MapBuildify\\skill\\mapbuildify $HOME\\.claude\\skills\\`}</pre>

      <h2>Point it at this site</h2>
      <p>
        Set <code>siteUrl</code> in <code>~/.claude/skills/mapbuildify/config.json</code>, or set the{" "}
        <code>MAPBUILDIFY_URL</code> environment variable:
      </p>
      <pre className="code">{`{ "siteUrl": "${site}" }`}</pre>

      <h2>Use it</h2>
      <p>Open Roblox Studio with an MCP server connected, then ask Claude something like:</p>
      <pre className="code">{`Use mapbuildify to build a foggy forest map with a river and a small cabin.`}</pre>
      <p className="muted">
        Claude pulls the closest matching examples from <code>{site}/api/examples</code>, studies them, then builds. If
        Studio is not connected, it writes a Luau build script you can paste into the command bar.
      </p>

      <h2>Claude.ai</h2>
      <p className="muted">
        Zip the <code>skill/mapbuildify</code> folder and upload it under Settings → Capabilities → Skills. Claude.ai
        needs network access to this site enabled for the skill to fetch examples.
      </p>
    </div>
  );
}
