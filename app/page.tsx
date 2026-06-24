import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720 }}>
        <div className="logo" style={{ fontSize: 22, marginBottom: 24 }}>
          Trail<span>mark</span>
        </div>
        <h1 style={{ fontSize: 44, letterSpacing: "-1px", margin: "0 0 16px" }}>
          User behavior analytics, end&nbsp;to&nbsp;end.
        </h1>
        <p className="muted" style={{ fontSize: 18, margin: "0 0 32px" }}>
          A drop-in vanilla-JS tracking script records page views and clicks on
          any page; this dashboard turns them into sessions, user journeys, and a
          click heatmap. Built with Next.js App Router + MongoDB.
        </p>
        <div className="row" style={{ flexWrap: "wrap", gap: 14 }}>
          <Link className="btn" href="/dashboard">
            Open the dashboard →
          </Link>
          <a className="btn ghost" href="/demo.html">
            Visit the demo store
          </a>
        </div>

        <div
          className="panel"
          style={{ marginTop: 44, padding: 24, lineHeight: 1.7 }}
        >
          <strong>Try it live:</strong>
          <ol className="muted" style={{ margin: "10px 0 0", paddingLeft: 20 }}>
            <li>
              Open the <a href="/demo.html">demo store</a> and click around —
              buttons, cards, nav links.
            </li>
            <li>
              Open the <Link href="/dashboard">dashboard</Link> in another tab; your
              session shows up within seconds (auto-refresh).
            </li>
            <li>
              Click a session to see the ordered journey, or open the{" "}
              <Link href="/dashboard/heatmap">heatmap</Link> to see where clicks land.
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
