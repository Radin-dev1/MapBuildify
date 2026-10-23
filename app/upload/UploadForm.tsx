"use client";

import { useEffect, useRef, useState } from "react";
import ModelViewer from "@/components/ModelViewer";
import { REPO_NAME, REPO_OWNER, REPO_URL } from "@/lib/config";
import { commitChanges, exampleRepoDir, loadToken, saveToken, verifyToken, type NewFile } from "@/lib/github";
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
  type Example,
} from "@/lib/types";

interface PickedFile {
  key: string;
  file: File;
  kind: "image" | "model";
  objectUrl: string;
}

type ModelViewerElement = HTMLElement & {
  loaded?: boolean;
  toBlob(options?: { mimeType?: string }): Promise<Blob>;
};

const ACCEPT = [...IMAGE_EXTENSIONS, ...MODEL_EXTENSIONS].join(",");
const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "file";
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

function TokenPanel({ onReady }: { onReady: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [login, setLogin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = loadToken();
    if (!saved) return;
    setToken(saved);
    verifyToken(saved).then(
      (user) => {
        setLogin(user);
        onReady(saved);
      },
      () => saveToken(""),
    );
  }, [onReady]);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const user = await verifyToken(token.trim());
      saveToken(token.trim());
      setLogin(user);
      onReady(token.trim());
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  if (login) {
    return (
      <div className="token token-ok">
        <span>
          Saving to <strong>{REPO_OWNER}/{REPO_NAME}</strong> as <strong>{login}</strong>
        </span>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            saveToken("");
            setLogin("");
            setToken("");
            onReady("");
          }}
        >
          Forget token
        </button>
      </div>
    );
  }

  return (
    <div className="token">
      <p>
        <strong>Connect GitHub.</strong> Uploads are saved as commits to{" "}
        <a href={REPO_URL}>{REPO_OWNER}/{REPO_NAME}</a>, and GitHub Pages republishes the site. Create a{" "}
        <a href={TOKEN_URL} target="_blank" rel="noreferrer">
          fine-grained token
        </a>{" "}
        with access to only that repository and <em>Contents: Read and write</em>, then paste it here. It stays in
        this browser.
      </p>
      <div className="token-row">
        <input
          className="input"
          type="password"
          placeholder="github_pat_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          aria-label="GitHub token"
        />
        <button type="button" className="btn" onClick={connect} disabled={busy || !token.trim()}>
          {busy ? "Checking…" : "Connect"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function UploadForm() {
  const [token, setToken] = useState("");
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
  const [done, setDone] = useState<{ title: string; commitUrl: string } | null>(null);
  const viewers = useRef(new Map<string, ModelViewerElement>());
  const filesRef = useRef(files);
  filesRef.current = files;

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
    setError(rejected.length ? `Skipped unsupported or over-50 MB files: ${rejected.join(", ")}` : "");
  }

  function removeFile(key: string) {
    setFiles((prev) => {
      const gone = prev.find((f) => f.key === key);
      if (gone) URL.revokeObjectURL(gone.objectUrl);
      return prev.filter((f) => f.key !== key);
    });
    viewers.current.delete(key);
  }

  function reset() {
    files.forEach((f) => URL.revokeObjectURL(f.objectUrl));
    viewers.current.clear();
    setFiles([]);
    setTitle("");
    setDescription("");
    setTags("");
    setStyle("");
    setRobloxAssetId("");
    setDone(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return setError("Connect GitHub first.");
    if (!title.trim()) return setError("Give the example a title.");
    if (files.length === 0) return setError("Add at least one image or 3D model.");
    setBusy(true);
    setError("");
    try {
      const id = `${slug(title) || "example"}-${Date.now().toString(36)}`;
      const dir = exampleRepoDir(id);
      const newFiles: NewFile[] = [];
      const images: Asset[] = [];
      const models: Asset[] = [];
      const used = new Set<string>();
      const place = (name: string, content: Blob) => {
        let fileName = safeName(name);
        for (let n = 2; used.has(fileName); n++) fileName = `${n}-${safeName(name)}`;
        used.add(fileName);
        newFiles.push({ path: `${dir}/${fileName}`, content });
        return `examples/${id}/${fileName}`;
      };

      for (const picked of files) {
        const asset: Asset = {
          url: place(picked.file.name, picked.file),
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
          asset.previewUrl = place(`${picked.file.name.replace(/\.[^.]+$/, "")}.preview.png`, png);
        }
        models.push(asset);
      }

      const cleanId = robloxAssetId.replace(/\D/g, "");
      const example: Example = {
        id,
        title: title.trim(),
        description: description.trim(),
        category,
        tags: [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))],
        style: style.trim(),
        ...(cleanId ? { robloxAssetId: cleanId } : {}),
        images,
        models,
        createdAt: new Date().toISOString(),
      };

      const commitUrl = await commitChanges(token, {
        message: `Add example: ${example.title}`,
        add: newFiles,
        updateCatalog: (catalog) => ({ ...catalog, examples: [...catalog.examples, example] }),
        onProgress: setStatus,
      });
      setDone({ title: example.title, commitUrl });
    } catch (err) {
      setError((err as Error).message);
    }
    setStatus("");
    setBusy(false);
  }

  if (done) {
    return (
      <div className="success">
        <p className="empty-title">“{done.title}” is saved.</p>
        <p>
          GitHub Pages is republishing the site. The example shows up in the library, and for Claude, in about one to
          two minutes.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={reset}>
            Upload another
          </button>
          <a className="btn" href={done.commitUrl} target="_blank" rel="noreferrer">
            View commit
          </a>
          <a className="btn" href={`${REPO_URL}/actions`} target="_blank" rel="noreferrer">
            Watch the deploy
          </a>
        </div>
      </div>
    );
  }

  const unpreviewable = files.some((f) => f.kind === "model" && !isPreviewableModel(f.file.name));
  const hasImage = files.some((f) => f.kind === "image");

  return (
    <form className="upload" onSubmit={onSubmit}>
      <TokenPanel onReady={setToken} />

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
          <span>or click to choose · PNG, JPG, WebP · GLB, GLTF, FBX, OBJ, RBXM, RBXMX · up to 50 MB each</span>
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
      </div>

      {error && <p className="error">{error}</p>}
      <div className="submit-row">
        <button className="btn btn-primary" disabled={busy || !token}>
          {busy ? "Saving…" : "Add to library"}
        </button>
        {status && <span className="muted">{status}</span>}
        <span className="muted mode-note">The repo is public, so uploads are public too.</span>
      </div>
    </form>
  );
}
