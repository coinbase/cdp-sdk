/**
 * Root layout — required by the Next.js App Router for any project that
 * exposes a `page.tsx`. Kept intentionally minimal for the example.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
