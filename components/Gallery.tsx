"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/config";
import { allTags, filterExamples } from "@/lib/search";
import { CATEGORIES, CATEGORY_LABELS, coverOf, type Example } from "@/lib/types";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default function Gallery() {
  const [examples, setExamples] = useState<Example[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    loadCatalog().then(setExamples, (e: Error) => setError(e.message));
  }, []);

  const tags = useMemo(() => allTags(examples ?? []).slice(0, 16), [examples]);

  const head = (
    <div className="section-head">
      <h2>Library</h2>
      {examples && (
        <p className="muted">
          {plural(examples.length, "example")} · {plural(examples.reduce((n, e) => n + e.images.length, 0), "image")} ·{" "}
          {plural(examples.reduce((n, e) => n + e.models.length, 0), "model")}
        </p>
      )}
    </div>
  );

  if (error) return (<>{head}<p className="error">{error}</p></>);
  if (!examples) return (<>{head}<p className="muted">Loading the library…</p></>);

  if (examples.length === 0) {
    return (
      <>
        {head}
        <div className="empty">
          <p className="empty-title">The library is empty.</p>
          <p>Upload a screenshot or a 3D model of a map you like. Claude reads every example here before it builds.</p>
          <Link href="/upload" className="btn btn-primary">
            Upload the first example
          </Link>
        </div>
      </>
    );
  }

  const usedCategories = CATEGORIES.filter((c) => examples.some((e) => e.category === c));
  const shown = filterExamples(examples, { q, category, tag });

  return (
    <section>
      {head}
      <div className="filters">
        <input
          className="input search"
          placeholder="Search: forest, castle, neon city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search examples"
        />
        <div className="chips">
          <button className={`chip ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>
            All
          </button>
          {usedCategories.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "on" : ""}`}
              onClick={() => setCategory(category === c ? "" : c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="chips chips-tags">
            {tags.map((t) => (
              <button key={t} className={`chip chip-tag ${tag === t ? "on" : ""}`} onClick={() => setTag(tag === t ? "" : t)}>
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="muted">Nothing matches those filters.</p>
      ) : (
        <div className="grid">
          {shown.map((e) => {
            const cover = coverOf(e);
            return (
              <Link key={e.id} href={`/example/?id=${e.id}`} className="card">
                <div className="card-media">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={siteUrl(cover)} alt={e.title} loading="lazy" />
                  ) : (
                    <div className="card-placeholder">3D model</div>
                  )}
                  <span className="badge">{CATEGORY_LABELS[e.category]}</span>
                </div>
                <div className="card-body">
                  <h3>{e.title}</h3>
                  <p className="card-meta">
                    {e.images.length > 0 && plural(e.images.length, "image")}
                    {e.images.length > 0 && e.models.length > 0 && " · "}
                    {e.models.length > 0 && plural(e.models.length, "model")}
                    {e.style && ` · ${e.style}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
