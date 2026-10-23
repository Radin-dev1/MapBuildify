"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ModelViewer from "@/components/ModelViewer";
import { loadPassword, savePassword } from "@/lib/client-password";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  IMAGE_EXTENSIONS,
  MAX_FILE_BYTES,
  MODEL_EXTENSIONS,
  extensionOf,
  formatBytes,
  isPreviewableModel,
  type Asset,
  type Category,
} from "@/lib/types";

interface PickedFile {
  key: string;
  file: File;
  kind: "image" | "model";
  objectUrl: string;
}

type ModelViewerElement = HTMLElement & {
  loaded?: boolean;
  toBlob(options?: { mimeType?: string; idealAspect?: boolean }): Promise<Blob>;
};

const ACCEPT = [...IMAGE_EXTENSIONS, ...MODEL_EXTENSIONS].join(",");

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "file";
}

function waitForModel(el: ModelViewerElement): Promise<void> {
  if (el.loaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("3D model took too long to load")), 20000);
    el.addEventListener("load", () => (clearTimeout(timer), resolve()), { once: true });
    el.addEventListener("error", () => (clearTimeout(timer), reject(new Error("3D model failed to load"))), {
      once: true,
    });
  });
}

export default function UploadForm({ mode, needsPassword }: { mode: "blob" | "local"; needsPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("full-map");
  const [tags, setTags] = useState("");
  const [style, setStyle] = useState("");
  const [robloxAssetId, setRobloxAssetId] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const viewers = useRef(new Map<string, ModelViewerElement>());
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => setPassword(loadPassword()), []);
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.objectUrl)), []);

  function addFiles(list: FileList | File[]) {
    const rejected: string[] = [];
    const picked: PickedFile[] = [];
    for (const file of Array.from(list)) {
      const ext = extensionOf(file.name);
      const kind = IMAGE_EXTENSIONS.includes(ext) ? "image" : MODEL_EXTENSIONS.includes(ext) ? "model" : null;
      if (!kind || file.size > MAX_FILE_BYTES) {
        rejected.push(file.name);
        continue;
      }
      picked.push({ key: `${file.name}-${file.size}-${Math.random()}`, file, kind, objectUrl: URL.createObjectURL(file) });
    }
    setFiles((prev) => [...prev, ...picked]);
    setError(rejected.length ? `Skipped unsupported or too large files: ${rejected.join(", ")}` : "");
  }

  function removeFile(key: string) {
    setFiles((prev) => {
      const gone = prev.find((f) => f.key === key);
      if (gone) URL.revokeObjectURL(gone.objectUrl);
      return prev.filter((f) => f.key !== key);
    });
    viewers.current.delete(key);
  }

  async function uploadFile(id: string, file: File): Promise<string> {
    if (mode === "blob") {
      const result = await upload(`files/${id}/${safeName(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        clientPayload: JSON.stringify({ password }),
        multipart: file.size > 20 * 1024 * 1024,
      });
      return result.url;
    }
    const form = new FormData();
    form.append("id", id);
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form, headers: { "x-admin-password": password } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
    return data.url as string;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Give the example a title.");
    if (files.length === 0) return setError("Add at least one image or 3D model.");
    setBusy(true);
    setError("");
    try {
      const auth = await fetch("/api/auth", { method: "POST", headers: { "x-admin-password": password } });
      if (!auth.ok) throw new Error("Wrong password.");
      savePassword(password);

      const id = `${slug(title) || "example"}-${Date.now().toString(36)}`;
      const images: Asset[] = [];
      const models: Asset[] = [];
      let done = 0;
      for (const picked of files) {
        done += 1;
        setStatus(`Uploading ${picked.file.name} (${done}/${files.length})`);
        const url = await uploadFile(id, picked.file);
        const asset: Asset = {
          url,
          name: picked.file.name,
          size: picked.file.size,
          contentType: picked.file.type || "application/octet-stream",
        };
        if (picked.kind === "image") {
          images.push(asset);
          continue;
        }
        const viewer = viewers.current.get(picked.key);
        if (viewer) {
          setStatus(`Rendering a preview of ${picked.file.name} for Claude`);
          await waitForModel(viewer);
          const png = await viewer.toBlob({ mimeType: "image/png" });
          const base = picked.file.name.replace(/\.[^.]+$/, "");
          asset.previewUrl = await uploadFile(id, new File([png], `${base}.preview.png`, { type: "image/png" }));
        }
        models.push(asset);
      }

      setStatus("Saving example");
      const res = await fetch("/api/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({
          id,
          title,
          description,
          category,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          style,
          robloxAssetId,
          images,
          models,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      router.push(`/examples/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setStatus("");
      setBusy(false);
    }
  }

  const unpreviewable = files.some((f) => f.kind === "model" && !isPreviewableModel(f.file.name));
  const hasImage = files.some((f) => f.kind === "image");

  return (
    <form className="upload" onSubmit={onSubmit}>
      <div
        className={`dropzone ${dragging ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <input
          id="files"
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <label htmlFor="files">
          <strong>Drop images or 3D models here</strong>
          <span>or click to choose · PNG, JPG, WebP · GLB, GLTF, FBX, OBJ, RBXM, RBXMX · up to 200 MB each</span>
        </label>
      </div>

      {files.length > 0 && (
        <ul className="picked">
          {files.map((f) => (
            <li
              key={f.key}
              className={`picked-item ${f.kind === "model" && isPreviewableModel(f.file.name) ? "picked-model" : ""}`}
            >
              <div className="picked-media">
                {f.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.objectUrl} alt={f.file.name} />
                ) : isPreviewableModel(f.file.name) ? (
                  <ModelViewer
                    src={f.objectUrl}
                    alt={f.file.name}
                    ref={(el) => {
                      if (el) viewers.current.set(f.key, el as ModelViewerElement);
                    }}
                  />
                ) : (
                  <div className="card-placeholder">{extensionOf(f.file.name).slice(1).toUpperCase()}</div>
                )}
              </div>
              <div className="picked-info">
                <span className="picked-name">{f.file.name}</span>
                <span className="muted">
                  {f.kind === "image" ? "Image" : "3D model"} · {formatBytes(f.file.size)}
                </span>
              </div>
              <button type="button" className="icon-btn" onClick={() => removeFile(f.key)} aria-label={`Remove ${f.file.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {unpreviewable && !hasImage && (
        <p className="hint">
          Claude can only see GLB/GLTF models directly. For FBX, OBJ or RBXM files, add a screenshot too so Claude
          knows what the model looks like.
        </p>
      )}

      <div className="fields">
        <label className="field field-wide">
          <span>Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Foggy pine forest with a river" required />
        </label>
        <label className="field field-wide">
          <span>Notes for Claude</span>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should Claude copy from this? E.g. 'Use this colour palette and the wide dirt paths. Trees are about 30 studs tall, spaced loosely.'"
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Style</span>
          <input className="input" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="stud, low-poly, realistic…" />
        </label>
        <label className="field">
          <span>Tags (comma separated)</span>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="forest, river, horror" />
        </label>
        <label className="field">
          <span>Roblox asset ID (optional)</span>
          <input
            className="input"
            inputMode="numeric"
            value={robloxAssetId}
            onChange={(e) => setRobloxAssetId(e.target.value)}
            placeholder="Claude can insert this model directly"
          />
        </label>
        {needsPassword && (
          <label className="field field-wide">
            <span>Upload password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      <div className="submit-row">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Uploading…" : "Add to library"}
        </button>
        {status && <span className="muted">{status}</span>}
        {mode === "local" && <span className="muted mode-note">Local mode: files are saved in .data/</span>}
      </div>
    </form>
  );
}
