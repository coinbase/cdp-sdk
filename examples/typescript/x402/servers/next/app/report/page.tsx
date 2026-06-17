/**
 * Protected page route.
 *
 * This page is gated by `middleware.ts` via `createCdpPaymentProxy`. Anonymous
 * requests receive a 402 with the x402 paywall response; requests carrying a
 * valid `X-PAYMENT` header (e.g. from an x402-compatible wallet extension)
 * pass through to this component.
 */
export default function ReportPage() {
  return (
    <main>
      <h1>Report</h1>
      <p>...</p>
    </main>
  );
}
