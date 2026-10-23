"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { commitChanges, exampleRepoDir, loadToken } from "@/lib/github";
import type { Example } from "@/lib/types";

export default function DeleteButton({ example }: { example: Example }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onDelete() {
    const token = loadToken();
    if (!token) {
      setError("Add your GitHub token on the Upload page first.");
      return;
    }
    if (!confirm(`Delete "${example.title}" and all its files? This removes them from the repo.`)) return;
    setBusy(true);
    setError("");
    try {
      await commitChanges(token, {
        message: `Remove example: ${example.title}`,
        removeDir: exampleRepoDir(example.id),
        updateCatalog: (catalog) => ({
          ...catalog,
          examples: catalog.examples.filter((e) => e.id !== example.id),
        }),
        onProgress: setMessage,
      });
      setMessage("Deleted. The site updates in about a minute.");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError((err as Error).message);
      setMessage("");
      setBusy(false);
    }
  }

  return (
    <div className="delete">
      {message && <span className="muted">{message}</span>}
      {error && <span className="error">{error}</span>}
      <button className="btn btn-danger" onClick={onDelete} disabled={busy}>
        {busy ? "Deleting…" : "Delete example"}
      </button>
    </div>
  );
}
