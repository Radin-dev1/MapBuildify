import { BRANCH, EXAMPLES_REPO_DIR, INDEX_REPO_PATH, REPO_NAME, REPO_OWNER } from "./config";
import type { Catalog } from "./catalog";

/**
 * Browser-side GitHub API client. Uploads and deletes are single commits to the
 * repo, made with the admin's own fine-grained token; the push then triggers
 * the Pages workflow, which republishes the site with the new catalog.
 */

const API = "https://api.github.com";
const REPO = `/repos/${REPO_OWNER}/${REPO_NAME}`;
const TOKEN_KEY = "mapbuildify:github-token";

export function loadToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the token just isn't remembered.
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(`GitHub ${res.status}: ${data.message ?? res.statusText}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Returns the token's GitHub login if it can push to the repo. */
export async function verifyToken(token: string): Promise<string> {
  const repo = await gh<{ permissions?: { push?: boolean } }>(token, REPO);
  if (!repo.permissions?.push) {
    throw new Error(`This token can't write to ${REPO_OWNER}/${REPO_NAME}. Give it Contents: Read and write.`);
  }
  try {
    return (await gh<{ login: string }>(token, "/user")).login;
  } catch {
    return "token";
  }
}

export interface NewFile {
  /** Repo path, e.g. public/examples/<id>/shot.png */
  path: string;
  content: Blob;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function readIndex(token: string, ref: string): Promise<Catalog> {
  try {
    // The raw media type returns the file itself, which is JSON.
    return await gh<Catalog>(token, `${REPO}/contents/${INDEX_REPO_PATH}?ref=${ref}`, {
      headers: { Accept: "application/vnd.github.raw+json" },
    });
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { version: 1, examples: [] };
    throw error;
  }
}

async function listDir(token: string, dir: string, ref: string): Promise<string[]> {
  try {
    const entries = await gh<{ path: string; type: string }[]>(token, `${REPO}/contents/${dir}?ref=${ref}`);
    return entries.filter((e) => e.type === "file").map((e) => e.path);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return [];
    throw error;
  }
}

export interface CommitOptions {
  message: string;
  add?: NewFile[];
  /** Repo folder to delete entirely, e.g. public/examples/<id> */
  removeDir?: string;
  updateCatalog: (catalog: Catalog) => Catalog;
  onProgress?: (message: string) => void;
}

/** Commits files plus an updated index.json to the branch in one commit. Returns the commit URL. */
export async function commitChanges(token: string, options: CommitOptions): Promise<string> {
  const { onProgress = () => {} } = options;

  // Upload file contents once; they are reused if the commit has to be retried.
  const blobs: { path: string; sha: string }[] = [];
  for (const [i, file] of (options.add ?? []).entries()) {
    onProgress(`Uploading ${file.path.split("/").pop()} (${i + 1}/${options.add!.length})`);
    const { sha } = await gh<{ sha: string }>(token, `${REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: await blobToBase64(file.content), encoding: "base64" }),
    });
    blobs.push({ path: file.path, sha });
  }

  for (let attempt = 1; ; attempt++) {
    onProgress("Saving to GitHub");
    const ref = await gh<{ object: { sha: string } }>(token, `${REPO}/git/ref/heads/${BRANCH}`);
    const head = ref.object.sha;
    const commit = await gh<{ tree: { sha: string } }>(token, `${REPO}/git/commits/${head}`);

    const catalog = options.updateCatalog(await readIndex(token, head));
    const removed = options.removeDir ? await listDir(token, options.removeDir, head) : [];

    const tree = await gh<{ sha: string }>(token, `${REPO}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree: [
          ...blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
          ...removed.map((path) => ({ path, mode: "100644", type: "blob", sha: null })),
          {
            path: INDEX_REPO_PATH,
            mode: "100644",
            type: "blob",
            content: JSON.stringify(catalog, null, 2) + "\n",
          },
        ],
      }),
    });
    const created = await gh<{ sha: string; html_url: string }>(token, `${REPO}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message: options.message, tree: tree.sha, parents: [head] }),
    });
    try {
      await gh(token, `${REPO}/git/refs/heads/${BRANCH}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: created.sha, force: false }),
      });
      return created.html_url;
    } catch (error) {
      // Someone else pushed in between: rebuild the commit on the new head.
      if ((error as { status?: number }).status !== 422 || attempt >= 3) throw error;
    }
  }
}

export function exampleRepoDir(id: string): string {
  return `${EXAMPLES_REPO_DIR}/${id}`;
}
