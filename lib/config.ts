/** The repo that stores the examples and hosts the site on GitHub Pages. */
export const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || "Radin-dev1";
export const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || "MapBuildify";
export const BRANCH = "main";

export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
export const SITE_URL = `https://${REPO_OWNER.toLowerCase()}.github.io/${REPO_NAME}`;

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Examples live in public/ so they are published with the site. */
export const EXAMPLES_REPO_DIR = "public/examples";
export const INDEX_REPO_PATH = `${EXAMPLES_REPO_DIR}/index.json`;

/** Asset paths in index.json are relative to the site root, e.g. "examples/<id>/shot.png". */
export function siteUrl(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
