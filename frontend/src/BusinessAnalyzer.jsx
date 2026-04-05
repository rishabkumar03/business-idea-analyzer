import { useState } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:3001/analyze";

// ─── SAVE ANALYSIS (mirrors saveAnalysis in improved-analyzer.js) ─────────────
function saveAnalysis(idea, analysis) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `analysis_${timestamp}.json`;
  const output = { idea, analyzedAt: new Date().toISOString(), analysis };
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 10;
  const color = score >= 7 ? "#1D9E75" : score >= 5 ? "#BA7517" : "#E24B4A";
  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column",
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'Syne', sans-serif" }}>{score}</span>
        <span style={{ fontSize: 9, color: "rgba(128,128,128,0.7)", letterSpacing: 1 }}>/ 10</span>
      </div>
    </div>
  );
}

// ─── TAG ──────────────────────────────────────────────────────────────────────
function Tag({ children, variant = "default" }) {
  const styles = {
    default: { background: "rgba(128,128,128,0.08)", color: "var(--text-secondary)", border: "0.5px solid rgba(128,128,128,0.2)" },
    blue:    { background: "rgba(55,138,221,0.1)",   color: "#185FA5",               border: "0.5px solid rgba(55,138,221,0.3)" },
    coral:   { background: "rgba(216,90,48,0.1)",    color: "#993C1D",               border: "0.5px solid rgba(216,90,48,0.3)" },
    teal:    { background: "rgba(29,158,117,0.1)",   color: "#0F6E56",               border: "0.5px solid rgba(29,158,117,0.3)" },
  };
  return (
    <span style={{
      ...styles[variant], fontSize: 12, fontFamily: "'DM Mono', monospace",
      padding: "3px 10px", borderRadius: 99, display: "inline-block",
    }}>
      {children}
    </span>
  );
}

// ─── SEVERITY BADGE ───────────────────────────────────────────────────────────
function SeverityBadge({ level }) {
  const map = {
    low:    { bg: "rgba(99,153,34,0.12)",  color: "#3B6D11" },
    medium: { bg: "rgba(186,117,23,0.12)", color: "#854F0B" },
    high:   { bg: "rgba(226,75,74,0.12)",  color: "#A32D2D" },
  };
  const s = (level || "medium").toLowerCase();
  const style = map[s] || map.medium;
  return (
    <span style={{
      fontSize: 11, fontFamily: "'DM Mono', monospace",
      padding: "2px 9px", borderRadius: 99,
      background: style.bg, color: style.color,
    }}>
      {s}
    </span>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div style={{
      background: "var(--card-bg)", border: "0.5px solid var(--border)",
      borderRadius: 16, padding: "20px 24px", animation: "fadeUp 0.4s ease both",
    }}>
      <div style={{
        fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-secondary)",
        letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── KV ROW ───────────────────────────────────────────────────────────────────
function KVRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "9px 0", borderBottom: "0.5px solid var(--border)", gap: 16, fontSize: 13,
    }}>
      <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontWeight: 500, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

// ─── PHASE PILL ───────────────────────────────────────────────────────────────
function PhasePill({ label, state }) {
  const styles = {
    idle:    { background: "var(--surface)", color: "var(--text-tertiary)", border: "0.5px solid var(--border)" },
    running: { background: "rgba(186,117,23,0.12)", color: "#854F0B", border: "0.5px solid rgba(186,117,23,0.4)", animation: "pulse 1.2s ease-in-out infinite" },
    done:    { background: "rgba(29,158,117,0.12)", color: "#0F6E56", border: "0.5px solid rgba(29,158,117,0.4)" },
    skipped: { background: "var(--surface)", color: "var(--text-tertiary)", border: "0.5px dashed var(--border)" },
  };
  return (
    <span style={{
      ...styles[state || "idle"], fontSize: 11, fontFamily: "'DM Mono', monospace",
      padding: "5px 14px", borderRadius: 99, transition: "all 0.25s",
    }}>
      {label}
    </span>
  );
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
function ErrorBanner({ type, message }) {
  const fixes = {
    CONNECTION_ERROR: 'Run "OLLAMA_ORIGINS=* ollama serve" then "node server.js" in ollama-nodejs/',
    MODEL_NOT_FOUND:  'Run "ollama pull mistral" in a terminal',
    TIMEOUT_ERROR:    "Try a shorter or simpler idea description",
  };
  return (
    <div style={{
      background: "rgba(226,75,74,0.08)", border: "0.5px solid rgba(226,75,74,0.3)",
      borderRadius: 12, padding: "14px 18px", fontSize: 13,
    }}>
      <div style={{ color: "#A32D2D", fontWeight: 500, marginBottom: 4 }}>{message}</div>
      {fixes[type] && (
        <div style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace", fontSize: 12, marginTop: 4 }}>
          Fix → {fixes[type]}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function BusinessAnalyzer() {
  const [idea, setIdea]         = useState("A platform connecting freelance developers with equity-based startup projects");
  const [running, setRunning]   = useState(false);
  const [error, setError]       = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [phases, setPhases]     = useState({ p1: "idle", p2: "idle", p3: "idle", p4: "idle", p5: "idle" });

  const setPhase = (key, state) =>
    setPhases((prev) => ({ ...prev, [key]: state }));

  // ─── CALL BACKEND ────────────────────────────────────────────────────────
  async function startAnalysis() {
    if (!idea.trim() || running) return;

    setRunning(true);
    setError(null);
    setAnalysis(null);
    setPhases({ p1: "running", p2: "running", p3: "running", p4: "running", p5: "running" });

    try {
      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idea }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw { message: data.error || "Analysis failed", type: data.type || "UNKNOWN_ERROR" };
      }

      const { overview, market, competition, businessModel, risks } = data.analysis;

      setPhase("p1", "done");
      setPhase("p2", overview?.score >= 5 && market        ? "done" : "skipped");
      setPhase("p3", overview?.score >= 5 && competition   ? "done" : "skipped");
      setPhase("p4", overview?.score >= 5 && businessModel ? "done" : "skipped");
      setPhase("p5", risks ? "done" : "skipped");

      setAnalysis(data.analysis);
    } catch (err) {
      setError({ message: err.message || "Something went wrong", type: err.type || "UNKNOWN_ERROR" });
      setPhases({ p1: "idle", p2: "idle", p3: "idle", p4: "idle", p5: "idle" });
    }

    setRunning(false);
  }

  // ─── DESTRUCTURE ANALYSIS ────────────────────────────────────────────────
  const overview    = analysis?.overview;
  const market      = analysis?.market;
  const competition = analysis?.competition;
  const business    = analysis?.businessModel;
  const risks       = analysis?.risks;

  const recConfig = {
    proceed: { bg: "rgba(29,158,117,0.1)",  color: "#0F6E56", border: "rgba(29,158,117,0.35)", icon: "↑" },
    modify:  { bg: "rgba(186,117,23,0.1)",  color: "#854F0B", border: "rgba(186,117,23,0.35)", icon: "~" },
    abandon: { bg: "rgba(226,75,74,0.1)",   color: "#A32D2D", border: "rgba(226,75,74,0.35)",  icon: "✕" },
  };

  // ─── STYLES ──────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; }
    :root {
      --text-primary: #0f0f0e; --text-secondary: #5f5e5a; --text-tertiary: #888780;
      --border: rgba(0,0,0,0.1); --surface: #f4f2eb; --card-bg: #ffffff; --page-bg: #f4f2eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --text-primary: #f0ede6; --text-secondary: #b4b2a9; --text-tertiary: #888780;
        --border: rgba(255,255,255,0.1); --surface: #1c1c1a; --card-bg: #252523; --page-bg: #161614;
      }
    }
    body { font-family: 'Syne', sans-serif; background: var(--page-bg); color: var(--text-primary); margin: 0; }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }
    @keyframes spin    { to { transform: rotate(360deg); } }
    .idea-input {
      width:100%; padding:14px 18px; font-size:15px; font-family:'Syne',sans-serif;
      background:var(--card-bg); color:var(--text-primary);
      border:0.5px solid var(--border); border-radius:12px; outline:none; transition:border-color 0.15s;
    }
    .idea-input:focus    { border-color: rgba(128,128,128,0.5); }
    .idea-input:disabled { opacity: 0.5; }
    .analyze-btn {
      padding:14px 28px; font-size:14px; font-weight:500; font-family:'Syne',sans-serif;
      background:var(--text-primary); color:var(--page-bg);
      border:none; border-radius:12px; cursor:pointer; white-space:nowrap;
      transition:opacity 0.15s, transform 0.1s;
    }
    .analyze-btn:hover:not(:disabled) { opacity:0.85; transform:translateY(-1px); }
    .analyze-btn:disabled             { opacity:0.35; cursor:not-allowed; }
    .metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
    @media (max-width:640px) { .metric-grid { grid-template-columns:repeat(2,1fr); } }
    .metric-card { background:var(--surface); border-radius:10px; padding:14px 16px; animation:fadeUp 0.35s ease both; }
    .metric-label { font-size:10px; font-family:'DM Mono',monospace; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    @media (max-width:640px) { .two-col { grid-template-columns:1fr; } }
    .save-btn {
      padding:10px 22px; font-size:13px; font-family:'Syne',sans-serif; font-weight:500;
      background:transparent; color:var(--text-primary);
      border:0.5px solid var(--border); border-radius:10px; cursor:pointer; transition:background 0.15s;
    }
    .save-btn:hover   { background:var(--surface); }
    .risk-bar-bg { background:var(--border); border-radius:99px; height:5px; flex:1; overflow:hidden; }
  `;

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "var(--page-bg)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: "2.5rem", animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", boxShadow: "0 0 0 3px rgba(29,158,117,0.2)" }} />
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-tertiary)", letterSpacing: 1 }}>
                BACKEND · localhost:3001 · mistral
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.8px", margin: 0 }}>
              Business Idea Analyzer
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
              Progressive AI analysis — market, competition, business model, risks
            </p>
          </div>

          {/* ── Input ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem", animation: "fadeUp 0.4s ease 0.05s both" }}>
            <input
              className="idea-input"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startAnalysis()}
              placeholder="Describe your business idea..."
              disabled={running}
            />
            <button className="analyze-btn" onClick={startAnalysis} disabled={running}>
              {running ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  Analyzing
                </span>
              ) : "Analyze →"}
            </button>
          </div>

          {/* ── Phase Pills ── */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.5rem", animation: "fadeUp 0.4s ease 0.1s both" }}>
            {[
              { key: "p1", label: "01 overview" },
              { key: "p2", label: "02 market" },
              { key: "p3", label: "03 competition" },
              { key: "p4", label: "04 business model" },
              { key: "p5", label: "05 risks" },
            ].map((p) => <PhasePill key={p.key} label={p.label} state={phases[p.key]} />)}
          </div>

          {/* ── Loading ── */}
          {running && (
            <div style={{
              background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12,
              padding: "20px 24px", marginBottom: "1.5rem", animation: "fadeUp 0.3s ease",
            }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace", animation: "pulse 1.2s ease-in-out infinite" }}>
                ● Running all 5 phases on the backend...
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                This may take 1–3 minutes depending on your hardware
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ marginBottom: "1.5rem", animation: "fadeUp 0.3s ease" }}>
              <ErrorBanner type={error.type} message={error.message} />
            </div>
          )}

          {/* ── Results ── */}
          {overview && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Metric Cards */}
              <div className="metric-grid">

                <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ScoreRing score={overview.score} />
                  <div>
                    <div className="metric-label">Viability</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {overview.score >= 7 ? "Strong" : overview.score >= 5 ? "Moderate" : "Weak"}
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-label">Market size</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
                    {overview.marketSize || "—"}
                  </div>
                  {market && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                      {market.growthRate}
                    </div>
                  )}
                </div>

                <div className="metric-card">
                  <div className="metric-label">Competition</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
                    {overview.competition || "—"}
                  </div>
                  {competition && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                      {(competition.directCompetitors || []).length} direct
                    </div>
                  )}
                </div>

                <div className="metric-card">
                  <div className="metric-label">Recommendation</div>
                  {(() => {
                    const rec = (overview.recommendation || "").toLowerCase();
                    const cfg = recConfig[rec] || recConfig.proceed;
                    return (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4,
                        padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                        background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`,
                      }}>
                        {cfg.icon} {rec.toUpperCase()}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Overview */}
              <SectionCard title="Overview & Reasoning">
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-primary)", marginBottom: 16 }}>
                  {overview.reasoning}
                </p>
                <div style={{ borderTop: "0.5px solid var(--border)" }}>
                  <KVRow label="Target customer" value={overview.targetCustomer} />
                  <KVRow label="Main risk"       value={overview.mainRisk} />
                </div>
              </SectionCard>

              {/* Market + Competition */}
              {(market || competition) && (
                <div className="two-col">

                  {market && (
                    <SectionCard title="Market">
                      <KVRow label="TAM estimate" value={market.tamEstimate} />
                      <KVRow label="Growth rate"  value={market.growthRate} />
                      <KVRow label="Demographics" value={market.targetDemographics} />
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-tertiary)", marginBottom: 8, letterSpacing: "0.6px" }}>
                          KEY TRENDS
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(market.keyTrends || []).map((t, i) => <Tag key={i} variant="blue">{t}</Tag>)}
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {competition && (
                    <SectionCard title="Competition">
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-tertiary)", marginBottom: 8 }}>DIRECT</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(competition.directCompetitors || []).map((c, i) => <Tag key={i} variant="coral">{c}</Tag>)}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-tertiary)", marginBottom: 8 }}>INDIRECT</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(competition.indirectCompetitors || []).map((c, i) => <Tag key={i}>{c}</Tag>)}
                        </div>
                      </div>
                      <div style={{ borderTop: "0.5px solid var(--border)" }}>
                        <KVRow label="Edge"     value={competition.differentiation} />
                        <KVRow label="Barriers" value={competition.barriers} />
                      </div>
                    </SectionCard>
                  )}

                </div>
              )}

              {/* Business Model */}
              {business && (
                <SectionCard title="Business Model">
                  <div className="two-col">
                    <div>
                      <KVRow label="Pricing"       value={business.pricing} />
                      <KVRow label="Scalability"   value={business.scalability} />
                      <KVRow label="Profitability" value={business.profitabilityTimeline} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-tertiary)", marginBottom: 8 }}>
                        REVENUE STREAMS
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(business.revenueStreams || []).map((s, i) => <Tag key={i} variant="teal">{s}</Tag>)}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Risks */}
              {risks && (
                <SectionCard title="Risk Assessment">
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {risks.map((r, i) => {
                      const sevPct   = { low: 30, medium: 65, high: 100 }[(r.severity || "medium").toLowerCase()] || 65;
                      const sevColor = { low: "#639922", medium: "#BA7517", high: "#E24B4A" }[(r.severity || "medium").toLowerCase()] || "#BA7517";
                      return (
                        <div key={i} style={{ padding: "14px 0", borderBottom: i < risks.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{r.risk}</span>
                            <SeverityBadge level={r.severity} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <div className="risk-bar-bg">
                              <div style={{ width: `${sevPct}%`, height: "100%", background: sevColor, borderRadius: 99, transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--text-tertiary)", fontSize: 11 }}>MITIGATION </span>
                            {r.mitigation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {/* Download */}
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                <button className="save-btn" onClick={() => saveAnalysis(idea, analysis)}>
                  Download full analysis JSON ↓
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
}