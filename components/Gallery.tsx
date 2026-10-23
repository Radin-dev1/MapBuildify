"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { allTags, filterExamples } from "@/lib/search";
import { CATEGORIES, CATEGORY_LABELS, coverOf, type Example } from "@/lib/types";

export default function Gallery({ examples }: { examples: Example[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");

  const tags = useMemo(() => allTags(examples).slice(0, 16), [examples]);
  const usedCategories = CATEGORIES.filter((c) => examples.some((e) => e.category === c));
  const shown = filterExamples(examples, { q, category, tag });

  if (examples.length === 0) {
    return (
      <div className="empty">
        <p className="empty-title">The library is empty.</p>
        <p>Upload a screenshot or a 3D model of a map you like. Claude reads every example here before it builds.</p>
        <Link href="/upload" className="btn btn-primary">
          Upload the first example
        </Link>
      </div>
    );
  }

  return (
    <section>
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
              <Link key={e.id} href={`/examples/${e.id}`} className="card">
                <div className="card-media">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={e.title} loading="lazy" />
                  ) : (
                    <div className="card-placeholder">3D model</div>
                  )}
                  <span className="badge">{CATEGORY_LABELS[e.category]}</span>
                </div>
                <div className="card-body">
                  <h3>{e.title}</h3>
                  <p className="card-meta">
                    {e.images.length > 0 && `${e.images.length} image${e.images.length > 1 ? "s" : ""}`}
                    {e.images.length > 0 && e.models.length > 0 && " · "}
                    {e.models.length > 0 && `${e.models.length} model${e.models.length > 1 ? "s" : ""}`}
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
