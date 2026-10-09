"use client";

import { useState } from "react";

type PsiResult = {
  url: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};

const demoSites = [
  "https://www.apple.com",
  "https://www.nytimes.com",
  "https://www.wikipedia.org",
  "https://www.shopify.com",
];

function Score({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-primary">{value ?? "—"}</p>
    </div>
  );
}

export function DemoPsi() {
  const [url, setUrl] = useState(demoSites[0]);
  const [result, setResult] = useState<PsiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runDemo() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/psi?url=${encodeURIComponent(url)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to run PSI demo");
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run PSI demo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 rounded-[2rem] border bg-card p-6 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <label className="text-sm font-semibold" htmlFor="demo-url">Demo website</label>
        <select
          id="demo-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
        >
          {demoSites.map((site) => <option key={site}>{site}</option>)}
        </select>
        <button
          onClick={runDemo}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Running PageSpeed Insights..." : "Run PSI demo"}
        </button>
        <p className="mt-4 text-sm text-muted-foreground">This public action only requests Google PageSpeed Insights metrics for the selected URL.</p>
        {error ? <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="rounded-[1.5rem] bg-secondary p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">PSI results</p>
            <p className="text-sm text-muted-foreground">{result?.url ?? "Select a site and run the demo"}</p>
          </div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">Public</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Score label="Performance" value={result?.performance ?? null} />
          <Score label="Accessibility" value={result?.accessibility ?? null} />
          <Score label="Best practices" value={result?.bestPractices ?? null} />
          <Score label="SEO" value={result?.seo ?? null} />
        </div>
      </div>
    </div>
  );
}
