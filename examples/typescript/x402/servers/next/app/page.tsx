/**
 * Minimal landing page pointing at the protected API route.
 *
 * @returns The home page.
 */
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <h1>CDP x402 — Next.js</h1>
      <p>
        <code>GET /api/report</code> is protected by x402 and settled through the CDP hosted
        facilitator. Call it with an x402 client (see the <code>x402/clients</code> examples); an
        unpaid request returns <code>402 Payment Required</code>.
      </p>
    </main>
  );
}
