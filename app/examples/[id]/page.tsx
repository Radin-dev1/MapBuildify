import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import ModelViewer from "@/components/ModelViewer";
import { passwordRequired } from "@/lib/auth";
import { getExample } from "@/lib/storage";
import { CATEGORY_LABELS, extensionOf, formatBytes, isPreviewableModel } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const example = await getExample((await params).id);
  return { title: example ? `${example.title} · MapBuildify` : "Not found · MapBuildify" };
}

export default async function ExamplePage({ params }: Props) {
  const example = await getExample((await params).id);
  if (!example) notFound();

  return (
    <article className="detail">
      <Link href="/" className="back">
        ← Library
      </Link>
      <header className="detail-head">
        <div>
          <p className="eyebrow">{CATEGORY_LABELS[example.category]}</p>
          <h1>{example.title}</h1>
          <div className="chips">
            {example.style && <span className="chip on">{example.style}</span>}
            {example.tags.map((t) => (
              <span key={t} className="chip chip-tag">
                #{t}
              </span>
            ))}
          </div>
        </div>
        <a className="btn" href={`/api/examples/${example.id}`}>
          View JSON
        </a>
      </header>

      {example.description && (
        <section className="notes">
          <h2>Notes for Claude</h2>
          <p>{example.description}</p>
        </section>
      )}

      {example.robloxAssetId && (
        <p className="asset-id">
          Roblox asset ID <code>{example.robloxAssetId}</code>
          <span className="muted"> · Claude can insert this directly in Studio</span>
        </p>
      )}

      {example.images.length > 0 && (
        <section>
          <h2>Images</h2>
          <div className="shots">
            {example.images.map((img) => (
              <a key={img.url} href={img.url} target="_blank" rel="noreferrer" className="shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name} />
              </a>
            ))}
          </div>
        </section>
      )}

      {example.models.length > 0 && (
        <section>
          <h2>3D models</h2>
          <div className="models">
            {example.models.map((m) => (
              <div key={m.url} className="model">
                {isPreviewableModel(m.name) ? (
                  <ModelViewer src={m.url} alt={m.name} className="viewer-large" />
                ) : (
                  <div className="card-placeholder viewer-large">
                    {extensionOf(m.name).slice(1).toUpperCase()} · no browser preview
                  </div>
                )}
                <div className="model-info">
                  <span>{m.name}</span>
                  <span className="muted">{formatBytes(m.size)}</span>
                  <a href={m.url} download>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="detail-foot">
        <span className="muted">Added {new Date(example.createdAt).toLocaleDateString("en", { dateStyle: "medium" })}</span>
        <DeleteButton id={example.id} needsPassword={passwordRequired()} />
      </footer>
    </article>
  );
}
