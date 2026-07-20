export const metadata = {
  title: "CDP x402 Next.js example",
  description: "An x402-protected Next.js API route powered by the CDP SDK.",
};

/**
 * Minimal root layout required by the Next.js App Router.
 *
 * @param props - Component props.
 * @param props.children - The page content.
 * @returns The HTML document shell.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
