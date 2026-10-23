import Link from "next/link";
import Gallery from "@/components/Gallery";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Reference library for Claude</p>
          <h1>Show Claude the maps you like. Then let it build.</h1>
          <p className="lead">
            Upload screenshots and 3D models of Roblox maps. When you ask Claude to build a map with the{" "}
            <code>mapbuildify</code> skill, it studies these examples first and matches their style, scale and
            mood in Roblox Studio.
          </p>
          <div className="hero-actions">
            <Link href="/upload" className="btn btn-primary">
              Upload an example
            </Link>
            <Link href="/skill" className="btn">
              Install the skill
            </Link>
          </div>
        </div>
        <ol className="flow">
          <li>
            <span className="flow-n">1</span>
            <div>
              <strong>Upload</strong>
              <p>Images, .glb / .fbx / .obj models or .rbxmx files, with notes on what to copy.</p>
            </div>
          </li>
          <li>
            <span className="flow-n">2</span>
            <div>
              <strong>Claude studies</strong>
              <p>The skill pulls the matching examples and looks at every image before planning.</p>
            </div>
          </li>
          <li>
            <span className="flow-n">3</span>
            <div>
              <strong>Claude builds</strong>
              <p>It builds the map in Roblox Studio in that style, then checks it against the examples.</p>
            </div>
          </li>
        </ol>
      </section>

      <Gallery />
    </>
  );
}
