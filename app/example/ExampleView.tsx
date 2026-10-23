"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import DeleteButton from "@/components/DeleteButton";
import ModelViewer from "@/components/ModelViewer";
import { loadCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/config";
import { CATEGORY_LABELS, extensionOf, formatBytes, isPreviewableModel, type Example } from "@/lib/types";

export default function ExampleView() {
  const id = useSearchParams().get("id");
  const [example, setExample] = useState<Example | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCatalog().then(
      (examples) => setExample(examples.find((e) => e.id === id) ?? null),
      (e: Error) => setError(e.message),
    );
  }, [id]);

  useEffect(() => {
    if (example) document.title = `${example.title} · MapBuildify`;
  }, [example]);

  if (error) return <p className="error detail">{error}</p>;
  if (example === undefined) return <p className="muted detail">Loading…</p>;
  if (example === null) {
    return (
      <div className="empty">
        <p className="empty-title">That example doesn&apos;t exist (yet).</p>
        <p>If you just uploaded it, GitHub Pages takes a minute or two to publish it.</p>
        <Link href="/" className="btn">
          Back to the library
        </Link>
      </div>
    );
  }

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
              <a key={img.url} href={siteUrl(img.url)} target="_blank" rel="noreferrer" className="shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={siteUrl(img.url)} alt={img.name} />
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
                  <ModelViewer src={siteUrl(m.url)} alt={m.name} className="viewer-large" />
                ) : (
                  <div className="card-placeholder viewer-large">
                    {extensionOf(m.name).slice(1).toUpperCase()} · no browser preview
                  </div>
                )}
                <div className="model-info">
                  <span>{m.name}</span>
                  <span className="muted">{formatBytes(m.size)}</span>
                  <a href={siteUrl(m.url)} download>
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
        <DeleteButton example={example} />
      </footer>
    </article>
  );
}
