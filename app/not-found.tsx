import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <p className="empty-title">That example doesn&apos;t exist.</p>
      <Link href="/" className="btn">
        Back to the library
      </Link>
    </div>
  );
}
