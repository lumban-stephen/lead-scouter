import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type LighthouseCategory = { score?: number | null };
type PsiResponse = {
  lighthouseResult?: {
    finalUrl?: string;
    categories?: Record<string, LighthouseCategory | undefined>;
  };
  error?: { message?: string };
};

function toScore(category: LighthouseCategory | undefined) {
  return typeof category?.score === "number" ? Math.round(category.score * 100) : null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 });
  }

  const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  apiUrl.searchParams.set("url", parsed.toString());
  apiUrl.searchParams.set("strategy", "mobile");
  apiUrl.searchParams.set("category", "performance");
  apiUrl.searchParams.append("category", "accessibility");
  apiUrl.searchParams.append("category", "best-practices");
  apiUrl.searchParams.append("category", "seo");

  if (process.env.PSI_API_KEY) {
    apiUrl.searchParams.set("key", process.env.PSI_API_KEY);
  }

  const response = await fetch(apiUrl, { next: { revalidate: 3600 } });
  const data = (await response.json()) as PsiResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "PageSpeed Insights request failed" },
      { status: response.status },
    );
  }

  const categories = data.lighthouseResult?.categories ?? {};

  return NextResponse.json({
    url: data.lighthouseResult?.finalUrl ?? parsed.toString(),
    performance: toScore(categories.performance),
    accessibility: toScore(categories.accessibility),
    bestPractices: toScore(categories["best-practices"]),
    seo: toScore(categories.seo),
  });
}
