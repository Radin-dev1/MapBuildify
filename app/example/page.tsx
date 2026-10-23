import { Suspense } from "react";
import ExampleView from "./ExampleView";

export default function ExamplePage() {
  return (
    <Suspense fallback={<p className="muted detail">Loading…</p>}>
      <ExampleView />
    </Suspense>
  );
}
