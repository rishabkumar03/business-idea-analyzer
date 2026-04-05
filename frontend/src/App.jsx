import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// ─── PHASE PILL ───
function PhasePill({ label, state }) {
  return (
    <span className={`phase-pill ${state || 'idle'}`}>
      {label}
    </span>
  );
}

// ─── SCORE RING ───
function ScoreRing({ score }) {
  const r      = 28;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 10;
  const color  = score >= 7 ? '#1D9E75' : score >= 5 ? '#BA7517' : '#E24B4A';
  return (
    <div className="score-ring-wrap">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-num" style={{ color }}>{score}</span>
        <span className="score-denom">/ 10</span>
      </div>
    </div>
  );
}

// ─── TAG ───
function Tag({ children, variant = 'default' }) {
  return <span className={`tag tag-${variant}`}>{children}</span>;
}

// ─── SEVERITY BADGE ───
function SeverityBadge({ level }) {
  const s = (level || 'medium').toLowerCase();
  return <span className={`severity-badge sev-${s}`}>{s}</span>;
}

// ─── SECTION CARD ───
function SectionCard({ title, children }) {
  return (
    <div className="section-card">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

// ─── KV ROW ───
function KVRow({ label, value }) {
  return (
    <div className="kv-row">
      <span className="kv-key">{label}</span>
      <span className="kv-val">{value || '—'}</span>
    </div>
  );
}

// ─── MAIN APP ───
function App() {
  const [idea, setIdea]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError]       = useState(null);
  const [logs, setLogs]         = useState([]);
  const [phases, setPhases]     = useState({ p1: 'idle', p2: 'idle', p3: 'idle', p4: 'idle', p5: 'idle' });
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg, type = 'inf') =>
    setLogs(prev => [...prev, { msg, type, id: Date.now() + Math.random() }]);

  const setPhase = (key, state) =>
    setPhases(prev => ({ ...prev, [key]: state }));

  // ─── ANALYZE ───
  const handleAnalyze = async () => {
    if (idea.trim().length < 10) {
      setError({ title: 'Idea too short', fix: 'Please enter at least 10 characters describing your idea.' });
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setLogs([]);
    setPhases({ p1: 'running', p2: 'running', p3: 'running', p4: 'running', p5: 'running' });
    addLog('Sending idea to backend...', 'inf');

    try {
      const response = await axios.post('http://localhost:3001/api/analyze', { idea });

      if (response.data.success) {
        const { overview, market, competition, businessModel, risks } = response.data.analysis;

        addLog(`Score: ${overview?.score}/10 · ${overview?.recommendation?.toUpperCase()}`, 'ok');
        setPhase('p1', 'done');
        setPhase('p2', overview?.score >= 5 && market        ? 'done' : 'skipped');
        setPhase('p3', overview?.score >= 5 && competition   ? 'done' : 'skipped');
        setPhase('p4', overview?.score >= 5 && businessModel ? 'done' : 'skipped');
        setPhase('p5', risks ? 'done' : 'skipped');

        if (market)       addLog(`Market TAM: ${market.tamEstimate}`, 'ok');
        if (competition)  addLog(`Competitors: ${(competition.directCompetitors || []).slice(0,2).join(', ')}`, 'ok');
        if (businessModel) addLog(`Revenue: ${(businessModel.revenueStreams || []).join(', ')}`, 'ok');
        if (risks)        addLog(`Top risk: ${risks[0]?.risk}`, 'ok');
        addLog('Analysis complete!', 'ok');

        setAnalysis(response.data.analysis);
      } else {
        throw { message: response.data.error, type: response.data.type };
      }
    } catch (err) {
      const msg  = err.response?.data?.error || err.message || 'Failed to connect to server';
      const type = err.response?.data?.type  || err.type   || 'UNKNOWN_ERROR';
      const fixes = {
        CONNECTION_ERROR: 'Run "node server.js" inside ollama-nodejs/ folder',
        MODEL_NOT_FOUND:  'Run "ollama pull mistral" in a terminal',
        TIMEOUT_ERROR:    'Try a shorter or simpler idea description',
      };
      addLog(`Error: ${msg}`, 'err');
      setError({ title: msg, fix: fixes[type] || null });
      setPhases({ p1: 'idle', p2: 'idle', p3: 'idle', p4: 'idle', p5: 'idle' });
    }

    setLoading(false);
  };

  // ─── SAVE ───
  const handleSave = () => {
    if (!analysis) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const output    = { idea, analyzedAt: new Date().toISOString(), analysis };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `analysis_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── DERIVED ───
  const overview    = analysis?.overview;
  const market      = analysis?.market;
  const competition = analysis?.competition;
  const business    = analysis?.businessModel;
  const risks       = analysis?.risks;

  const recClass = {
    proceed: 'rec-proceed',
    modify:  'rec-modify',
    abandon: 'rec-abandon',
  };
  const recIcon = { proceed: '↑', modify: '~', abandon: '✕' };

  // ─── RENDER ───
  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <div className="header">
          <div className="header-meta">
            <div className="status-dot" />
            <span className="header-label">Backend · localhost:3001 · mistral</span>
          </div>
          <h1>Business Idea Analyzer</h1>
          <p>Progressive AI analysis — market, competition, business model, risks</p>
        </div>

        {/* Input */}
        <div className="input-section">
          <div className="input-row">
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAnalyze()}
              placeholder="Describe your business idea... (e.g. 'A mobile app that helps people find pet-friendly restaurants')"
              rows={2}
              disabled={loading}
            />
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || idea.trim().length < 10}
            >
              {loading ? (
                <><span className="btn-spinner" /> Analyzing</>
              ) : 'Analyze →'}
            </button>
          </div>
        </div>

        {/* Phase Pills */}
        <div className="phase-bar">
          {[
            { key: 'p1', label: '01 overview' },
            { key: 'p2', label: '02 market' },
            { key: 'p3', label: '03 competition' },
            { key: 'p4', label: '04 business model' },
            { key: 'p5', label: '05 risks' },
          ].map(p => <PhasePill key={p.key} label={p.label} state={phases[p.key]} />)}
        </div>

        {/* Log Box */}
        <div className="log-box" ref={logRef}>
          {logs.length === 0
            ? <span className="log-dim">Enter an idea and click Analyze to begin...</span>
            : logs.map(l => (
                <span key={l.id} className={`log-${l.type}`}>
                  {'>'} {l.msg}
                </span>
              ))
          }
        </div>

        {/* Error */}
        {error && (
          <div className="error-box">
            <div className="error-title">{error.title}</div>
            {error.fix && <div className="error-fix">Fix → {error.fix}</div>}
          </div>
        )}

        {/* Results */}
        {overview && (
          <div className="results">

            {/* Metric Cards */}
            <div className="metric-grid">

              <div className="metric-card flex-center">
                <ScoreRing score={overview.score} />
                <div>
                  <div className="metric-label">Viability</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {overview.score >= 7 ? 'Strong' : overview.score >= 5 ? 'Moderate' : 'Weak'}
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Market size</div>
                <div className="metric-value">{overview.marketSize || '—'}</div>
                {market && <div className="metric-sub">{market.growthRate}</div>}
              </div>

              <div className="metric-card">
                <div className="metric-label">Competition</div>
                <div className="metric-value">{overview.competition || '—'}</div>
                {competition && (
                  <div className="metric-sub">{(competition.directCompetitors || []).length} direct</div>
                )}
              </div>

              <div className="metric-card">
                <div className="metric-label">Recommendation</div>
                {(() => {
                  const rec = (overview.recommendation || '').toLowerCase();
                  return (
                    <div className={`rec-badge ${recClass[rec] || 'rec-proceed'}`}>
                      {recIcon[rec] || '↑'} {rec.toUpperCase()}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Overview */}
            <SectionCard title="Overview & Reasoning">
              <p className="reasoning-text">{overview.reasoning}</p>
              <div style={{ borderTop: '0.5px solid var(--border)' }}>
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
                      <div className="sub-label">Key trends</div>
                      <div className="tag-list">
                        {(market.keyTrends || []).map((t, i) => (
                          <Tag key={i} variant="blue">{t}</Tag>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                )}

                {competition && (
                  <SectionCard title="Competition">
                    <div style={{ marginBottom: 12 }}>
                      <div className="sub-label">Direct</div>
                      <div className="tag-list">
                        {(competition.directCompetitors || []).map((c, i) => (
                          <Tag key={i} variant="coral">{c}</Tag>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="sub-label">Indirect</div>
                      <div className="tag-list">
                        {(competition.indirectCompetitors || []).map((c, i) => (
                          <Tag key={i}>{c}</Tag>
                        ))}
                      </div>
                    </div>
                    <div style={{ borderTop: '0.5px solid var(--border)' }}>
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
                    <div className="sub-label">Revenue streams</div>
                    <div className="tag-list" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      {(business.revenueStreams || []).map((s, i) => (
                        <Tag key={i} variant="teal">{s}</Tag>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Risks */}
            {risks && (
              <SectionCard title="Risk Assessment">
                {risks.map((r, i) => {
                  const sevPct   = { low: 30, medium: 65, high: 100 }[(r.severity || 'medium').toLowerCase()] || 65;
                  const sevColor = { low: '#7ab83a', medium: '#BA7517', high: '#E24B4A' }[(r.severity || 'medium').toLowerCase()] || '#BA7517';
                  return (
                    <div key={i} className="risk-item">
                      <div className="risk-header">
                        <span className="risk-name">{r.risk}</span>
                        <SeverityBadge level={r.severity} />
                      </div>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-bg">
                          <div className="risk-bar-fill" style={{ width: `${sevPct}%`, background: sevColor }} />
                        </div>
                      </div>
                      <div className="risk-mitigation">
                        <span className="mit-label">MITIGATION</span>
                        {r.mitigation}
                      </div>
                    </div>
                  );
                })}
              </SectionCard>
            )}

            {/* Download */}
            <div>
              <button className="save-btn" onClick={handleSave}>
                Download full analysis JSON ↓
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;