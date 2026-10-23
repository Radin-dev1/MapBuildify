export const CATEGORIES = [
  "full-map",
  "terrain",
  "building",
  "interior",
  "prop",
  "layout",
  "lighting",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  "full-map": "Full map",
  terrain: "Terrain",
  building: "Building",
  interior: "Interior",
  prop: "Prop",
  layout: "Layout / top-down",
  lighting: "Lighting / mood",
  other: "Other",
};

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
export const MODEL_EXTENSIONS = [".glb", ".gltf", ".fbx", ".obj", ".rbxm", ".rbxmx"];
/** Formats the browser can render in 3D (and auto-screenshot for Claude). */
export const PREVIEWABLE_MODEL_EXTENSIONS = [".glb", ".gltf"];

export const MAX_FILE_BYTES = 200 * 1024 * 1024;

export interface Asset {
  url: string;
  name: string;
  size: number;
  contentType: string;
  /** Models only: a rendered screenshot so Claude can see the model. */
  previewUrl?: string;
}

export interface Example {
  id: string;
  title: string;
  /** Notes for Claude: what to learn or copy from this example. */
  description: string;
  category: Category;
  tags: string[];
  /** Free-form style, e.g. "stud", "low-poly", "realistic". */
  style: string;
  /** Optional Roblox asset id Claude can insert directly in Studio. */
  robloxAssetId?: string;
  images: Asset[];
  models: Asset[];
  createdAt: string;
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isPreviewableModel(name: string): boolean {
  return PREVIEWABLE_MODEL_EXTENSIONS.includes(extensionOf(name));
}

/** Image used to represent an example: first image, else the first model preview. */
export function coverOf(example: Example): string | undefined {
  return example.images[0]?.url ?? example.models.find((m) => m.previewUrl)?.previewUrl;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
