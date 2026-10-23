"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadPassword, savePassword } from "@/lib/client-password";

export default function DeleteButton({ id, needsPassword }: { id: string; needsPassword: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (!confirm("Delete this example and all its files? This can't be undone.")) return;
    let password = loadPassword();
    if (needsPassword && !password) password = prompt("Upload password") ?? "";
    setBusy(true);
    const res = await fetch(`/api/examples/${id}`, { method: "DELETE", headers: { "x-admin-password": password } });
    if (res.ok) {
      savePassword(password);
      router.push("/");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Delete failed");
    setBusy(false);
  }

  return (
    <div className="delete">
      <button className="btn btn-danger" onClick={onDelete} disabled={busy}>
        {busy ? "Deleting…" : "Delete example"}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
