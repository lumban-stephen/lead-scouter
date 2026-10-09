import Link from "next/link";
import { DemoPsi } from "./demo-psi";

const features = [
  {
    title: "Find local prospects fast",
    body: "Scout businesses by place, category, and market signals so you can build targeted B2B lead lists without spreadsheet busywork.",
  },
  {
    title: "Qualify with website intelligence",
    body: "Review performance, SEO readiness, mobile experience, and contact gaps before deciding who deserves outreach.",
  },
  {
    title: "Prioritize outreach",
    body: "Turn raw discovery data into simple scores that highlight who has the clearest need and best fit for your services.",
  },
];

const locked = ["Place discovery", "Lead scoring", "Saved lead lists", "SEO recommendations", "Export-ready outreach notes"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Lead <span className="text-primary">Scouter</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <a href="#demo" className="hidden text-muted-foreground hover:text-foreground sm:inline">Demo</a>
          <Link href="/login" className="rounded-full border px-4 py-2 font-medium hover:bg-accent">Log in</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div>
          <div className="mb-6 inline-flex rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
            AI B2B intelligence for local prospecting
          </div>
          <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Find better business leads, then prove why they need you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Lead Scouter helps sales and marketing teams discover local companies, inspect their web presence, and prioritize outreach with practical SEO and performance signals.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#demo" className="rounded-full bg-primary px-6 py-3 text-center font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90">Try the public PSI demo</a>
            <Link href="/login" className="rounded-full border px-6 py-3 text-center font-semibold hover:bg-accent">Unlock the full app</Link>
          </div>
        </div>

        <div className="rounded-[2rem] border bg-card p-5 shadow-2xl">
          <div className="rounded-[1.5rem] bg-secondary p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Lead snapshot</p>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Hot fit</span>
            </div>
            <div className="space-y-3">
              {locked.slice(0, 4).map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-2xl bg-background p-4">
                  <span className="text-sm font-medium">{item}</span>
                  <span className="text-sm font-bold text-primary">{92 - index * 7}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-bold">{feature.title}</h2>
              <p className="mt-3 text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-3xl">
          <p className="font-semibold text-primary">Public demo</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Run a real PageSpeed Insights check.</h2>
          <p className="mt-4 text-muted-foreground">For visitors, the demo only calls the PSI API. Business discovery, scoring, saved leads, and recommendations are available after login.</p>
        </div>
        <DemoPsi />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] border bg-card p-8 md:p-10">
          <h2 className="text-3xl font-black">Everything else is protected.</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {locked.map((item) => <span key={item} className="rounded-full border bg-secondary px-4 py-2 text-sm font-medium">{item} · login required</span>)}
          </div>
          <Link href="/login" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Log in to continue</Link>
        </div>
      </section>
    </main>
  );
}
