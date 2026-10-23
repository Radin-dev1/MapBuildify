import type { Metadata } from "next";
import UploadForm from "./UploadForm";

export const metadata: Metadata = { title: "Upload · MapBuildify" };

export default function UploadPage() {
  return (
    <div className="narrow">
      <p className="eyebrow">New example</p>
      <h1>Upload an example</h1>
      <p className="lead">
        Add screenshots or 3D models of a map, area or prop you want Claude to learn from. Good notes matter: tell
        Claude what to copy, like the palette, scale, density or lighting.
      </p>
      <UploadForm />
    </div>
  );
}
