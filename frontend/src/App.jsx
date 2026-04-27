import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import './App.css';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── PDF GENERATOR ────────────────────────────────────────────────────────────
function generatePDF(idea, analysis) {
  const doc      = new jsPDF({ unit: 'mm', format: 'a4' });
  const W        = doc.internal.pageSize.getWidth();   // 210
  const H        = doc.internal.pageSize.getHeight();  // 297
  const MARGIN   = 20;
  const COL      = W - MARGIN * 2;
  let   y        = 0;

  // ── Colour palette ──────────────────────────────────────────────────────────
  const C = {
    black:     [15,  15,  14],
    white:     [255, 255, 255],
    teal:      [29,  158, 117],
    tealLight: [220, 245, 237],
    amber:     [186, 117, 23],
    amberLight:[250, 238, 218],
    red:       [226, 75,  74],
    redLight:  [252, 235, 235],
    blue:      [55,  138, 221],
    blueLight: [230, 241, 251],
    coral:     [216, 90,  48],
    coralLight:[250, 236, 231],
    grey1:     [30,  30,  28],
    grey2:     [80,  78,  74],
    grey3:     [140, 138, 132],
    grey4:     [210, 208, 202],
    grey5:     [245, 243, 238],
    pageBg:    [252, 251, 248],
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setColor  = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (style = 'normal', size = 10) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };

  // Wrap + write text, return new y
  const writeText = (text, x, startY, maxW, lineH = 5) => {
    const lines = doc.splitTextToSize(String(text || ''), maxW);
    doc.text(lines, x, startY);
    return startY + lines.length * lineH;
  };

  // Check if we need a new page
  const checkPage = (needed = 20) => {
    if (y + needed > H - 20) {
      doc.addPage();
      setFill(C.pageBg);
      doc.rect(0, 0, W, H, 'F');
      y = 20;
    }
  };

  // Horizontal rule
  const rule = (color = C.grey4, weight = 0.3) => {
    setStroke(color);
    doc.setLineWidth(weight);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 4;
  };

  // Section heading pill
  const sectionHead = (label, accentColor = C.teal) => {
    checkPage(16);
    setFill(accentColor);
    doc.roundedRect(MARGIN, y, COL, 9, 2, 2, 'F');
    setColor(C.white);
    setFont('bold', 10);
    doc.text(label.toUpperCase(), MARGIN + 4, y + 6);
    y += 13;
  };

  // KV pair
  const kv = (label, value, indent = 0) => {
    checkPage(8);
    setFont('bold', 9);
    setColor(C.grey2);
    doc.text(label, MARGIN + indent, y);
    setFont('normal', 9);
    setColor(C.grey1);
    const valX = MARGIN + indent + doc.getTextWidth(label) + 2;
    const newY = writeText(value || '—', valX, y, COL - indent - doc.getTextWidth(label) - 2, 5);
    y = Math.max(y + 5, newY);
  };

  // Tag / pill chip
  const chip = (text, bgColor, textColor, startX, chipY) => {
    setFont('normal', 8);
    const tw  = doc.getTextWidth(text);
    const pw  = tw + 6;
    const ph  = 5.5;
    setFill(bgColor);
    setStroke(bgColor);
    doc.roundedRect(startX, chipY - 4, pw, ph, 1.5, 1.5, 'F');
    setColor(textColor);
    doc.text(text, startX + 3, chipY);
    return startX + pw + 3;
  };

  // Row of chips
  const chipRow = (items, bgColor, textColor) => {
    checkPage(10);
    let cx = MARGIN;
    items.forEach(item => {
      const tw = doc.getTextWidth(String(item));
      if (cx + tw + 10 > W - MARGIN) { y += 8; cx = MARGIN; }
      cx = chip(String(item), bgColor, textColor, cx, y);
    });
    y += 8;
  };

  // ── PAGE 1: Cover ────────────────────────────────────────────────────────────
  // Background
  setFill(C.grey1);
  doc.rect(0, 0, W, H, 'F');

  // Top accent bar
  setFill(C.teal);
  doc.rect(0, 0, W, 3, 'F');

  // Brand label
  setFont('normal', 8);
  setColor(C.grey3);
  doc.text('AI-POWERED STARTUP ANALYSIS', MARGIN, 22);

  // Title
  setFont('bold', 28);
  setColor(C.white);
  doc.text('Business Idea', MARGIN, 48);
  doc.text('Analyzer', MARGIN, 62);

  // Teal underline accent
  setFill(C.teal);
  doc.rect(MARGIN, 66, 40, 2, 'F');

  // Idea box
  setFill([25, 25, 23]);
  doc.roundedRect(MARGIN, 80, COL, 36, 4, 4, 'F');
  setFont('bold', 8);
  setColor(C.teal);
  doc.text('BUSINESS IDEA', MARGIN + 8, 91);
  setFont('normal', 10);
  setColor(C.white);
  const ideaLines = doc.splitTextToSize(idea, COL - 16);
  doc.text(ideaLines.slice(0, 3), MARGIN + 8, 99);

  // Score + Rec side by side
  const score = analysis.overview?.score || 0;
  const rec   = (analysis.overview?.recommendation || 'proceed').toLowerCase();
  const recColors = {
    proceed: { bg: C.teal,  text: C.white },
    modify:  { bg: C.amber, text: C.white },
    abandon: { bg: C.red,   text: C.white },
  };
  const recC = recColors[rec] || recColors.proceed;

  // Score circle
  setFill(C.teal);
  doc.circle(MARGIN + 20, 145, 18, 'F');
  setFont('bold', 22);
  setColor(C.white);
  doc.text(String(score), MARGIN + 20, 148, { align: 'center' });
  setFont('normal', 7);
  doc.text('/ 10', MARGIN + 20, 154, { align: 'center' });
  setFont('bold', 8);
  setColor(C.grey3);
  doc.text('VIABILITY SCORE', MARGIN + 20, 167, { align: 'center' });

  // Recommendation badge
  setFill(recC.bg);
  doc.roundedRect(MARGIN + 50, 133, 50, 14, 3, 3, 'F');
  setFont('bold', 12);
  setColor(recC.text);
  doc.text(rec.toUpperCase(), MARGIN + 75, 142, { align: 'center' });
  setFont('normal', 8);
  setColor(C.grey3);
  doc.text('RECOMMENDATION', MARGIN + 75, 153, { align: 'center' });

  // Quick stats row
  const stats = [
    { label: 'MARKET SIZE',  value: (analysis.overview?.marketSize  || '—').toUpperCase() },
    { label: 'COMPETITION',  value: (analysis.overview?.competition || '—').toUpperCase() },
    { label: 'ANALYZED',     value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
  ];
  stats.forEach((s, i) => {
    const sx = MARGIN + i * 58;
    setFill([22, 22, 20]);
    doc.roundedRect(sx, 175, 54, 20, 3, 3, 'F');
    setFont('normal', 7);
    setColor(C.grey3);
    doc.text(s.label, sx + 27, 183, { align: 'center' });
    setFont('bold', 10);
    setColor(C.white);
    doc.text(s.value, sx + 27, 191, { align: 'center' });
  });

  // Footer on cover
  setFont('normal', 7);
  setColor(C.grey3);
  doc.text(`Generated ${new Date().toLocaleString()} · Business Idea Analyzer`, MARGIN, H - 12);

  // ── PAGE 2+: Report ──────────────────────────────────────────────────────────
  doc.addPage();
  setFill(C.pageBg);
  doc.rect(0, 0, W, H, 'F');

  // Top bar
  setFill(C.grey1);
  doc.rect(0, 0, W, 14, 'F');
  setFont('bold', 8);
  setColor(C.grey3);
  doc.text('BUSINESS IDEA ANALYZER — FULL REPORT', MARGIN, 9);
  setFont('normal', 7);
  setColor(C.grey3);
  doc.text(new Date().toLocaleDateString(), W - MARGIN, 9, { align: 'right' });

  y = 24;

  // ── OVERVIEW SECTION ────────────────────────────────────────────────────────
  sectionHead('01  Overview & Reasoning', C.grey1);

  const ov = analysis.overview || {};
  setFont('normal', 9);
  setColor(C.grey1);
  y = writeText(ov.reasoning || '—', MARGIN, y, COL, 5.5);
  y += 4;

  rule(C.grey4);
  kv('Target Customer:  ', ov.targetCustomer);
  kv('Main Risk:  ',        ov.mainRisk);
  y += 4;

  // ── MARKET SECTION ───────────────────────────────────────────────────────────
  if (analysis.market) {
    checkPage(20);
    sectionHead('02  Market Analysis', C.blue);
    const m = analysis.market;
    kv('TAM Estimate:  ',    m.tamEstimate);
    kv('Growth Rate:  ',     m.growthRate);
    kv('Demographics:  ',    m.targetDemographics);
    if (m.keyTrends?.length) {
      checkPage(12);
      setFont('bold', 9);
      setColor(C.grey2);
      doc.text('Key Trends:', MARGIN, y);
      y += 6;
      chipRow(m.keyTrends, C.blueLight, C.blue);
    }
    y += 2;
  }

  // ── COMPETITION SECTION ──────────────────────────────────────────────────────
  if (analysis.competition) {
    checkPage(20);
    sectionHead('03  Competition', C.coral);
    const c = analysis.competition;
    if (c.directCompetitors?.length) {
      checkPage(12);
      setFont('bold', 9);
      setColor(C.grey2);
      doc.text('Direct Competitors:', MARGIN, y);
      y += 6;
      chipRow(c.directCompetitors, C.coralLight, C.coral);
    }
    if (c.indirectCompetitors?.length) {
      checkPage(12);
      setFont('bold', 9);
      setColor(C.grey2);
      doc.text('Indirect Competitors:', MARGIN, y);
      y += 6;
      chipRow(c.indirectCompetitors, C.grey5, C.grey2);
    }
    kv('Your Edge:  ',   c.differentiation);
    kv('Barriers:  ',    c.barriers);
    y += 2;
  }

  // ── BUSINESS MODEL SECTION ───────────────────────────────────────────────────
  if (analysis.businessModel) {
    checkPage(20);
    sectionHead('04  Business Model', C.teal);
    const b = analysis.businessModel;
    if (b.revenueStreams?.length) {
      checkPage(12);
      setFont('bold', 9);
      setColor(C.grey2);
      doc.text('Revenue Streams:', MARGIN, y);
      y += 6;
      chipRow(b.revenueStreams, C.tealLight, C.teal);
    }
    kv('Pricing:  ',          b.pricing);
    kv('Scalability:  ',      b.scalability);
    kv('Profitability:  ',    b.profitabilityTimeline);
    y += 2;
  }

  // ── RISKS SECTION ────────────────────────────────────────────────────────────
  if (analysis.risks?.length) {
    checkPage(20);
    sectionHead('05  Risk Assessment', C.red);

    const sevColor = {
      low:    { bg: [220, 240, 210], text: [60, 110, 30]  },
      medium: { bg: C.amberLight,   text: C.amber         },
      high:   { bg: C.redLight,     text: C.red           },
    };
    const sevBar = { low: 0.3, medium: 0.65, high: 1.0 };

    analysis.risks.forEach((r, i) => {
      checkPage(24);
      const sev  = (r.severity || 'medium').toLowerCase();
      const sc   = sevColor[sev] || sevColor.medium;

      // Risk number + name
      setFont('bold', 9);
      setColor(C.grey1);
      doc.text(`${i + 1}.`, MARGIN, y);
      setFont('bold', 9);
      const nameY = writeText(r.risk, MARGIN + 6, y, COL - 50, 5);

      // Severity badge
      setFill(sc.bg);
      doc.roundedRect(W - MARGIN - 28, y - 4, 28, 6, 2, 2, 'F');
      setFont('bold', 7);
      setColor(sc.text);
      doc.text(sev.toUpperCase(), W - MARGIN - 14, y, { align: 'center' });

      y = Math.max(nameY, y + 5) + 1;

      // Severity bar
      const barW = COL * 0.5;
      setFill(C.grey4);
      doc.roundedRect(MARGIN + 6, y, barW, 2.5, 1, 1, 'F');
      setFill(sc.text);
      doc.roundedRect(MARGIN + 6, y, barW * (sevBar[sev] || 0.5), 2.5, 1, 1, 'F');
      y += 6;

      // Mitigation
      setFont('bold', 8);
      setColor(C.grey3);
      doc.text('MITIGATION  ', MARGIN + 6, y);
      setFont('normal', 8);
      setColor(C.grey2);
      const mitX = MARGIN + 6 + doc.getTextWidth('MITIGATION  ');
      y = writeText(r.mitigation, mitX, y, COL - mitX + MARGIN, 5);
      y += 5;

      if (i < analysis.risks.length - 1) rule(C.grey4, 0.2);
    });
  }

  // ── FOOTER on last page ──────────────────────────────────────────────────────
  checkPage(0);
  setFill(C.grey1);
  doc.rect(0, H - 16, W, 16, 'F');
  setFont('normal', 7);
  setColor(C.grey3);
  doc.text('Generated by Business Idea Analyzer · Powered by Ollama / Mistral', MARGIN, H - 7);
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, W - MARGIN, H - 7, { align: 'right' });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  doc.save(`business-analysis-${timestamp}.pdf`);
}

// ─── PHASE PILL ───────────────────────────────────────────────────────────────
function PhasePill({ label, state }) {
  return <span className={`phase-pill ${state || 'idle'}`}>{label}</span>;
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
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

// ─── TAG ──────────────────────────────────────────────────────────────────────
function Tag({ children, variant = 'default' }) {
  return <span className={`tag tag-${variant}`}>{children}</span>;
}

// ─── SEVERITY BADGE ───────────────────────────────────────────────────────────
function SeverityBadge({ level }) {
  const s = (level || 'medium').toLowerCase();
  return <span className={`severity-badge sev-${s}`}>{s}</span>;
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div className="section-card">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

// ─── KV ROW ───────────────────────────────────────────────────────────────────
function KVRow({ label, value }) {
  return (
    <div className="kv-row">
      <span className="kv-key">{label}</span>
      <span className="kv-val">{value || '—'}</span>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
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

  const addLog  = (msg, type = 'inf') => setLogs(prev => [...prev, { msg, type, id: Date.now() + Math.random() }]);
  const setPhase = (key, state)       => setPhases(prev => ({ ...prev, [key]: state }));

  // ─── ANALYZE ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (idea.trim().length < 10) {
      setError({ title: 'Idea too short', fix: 'Please enter at least 10 characters.' });
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setLogs([]);
    setPhases({ p1: 'running', p2: 'running', p3: 'running', p4: 'running', p5: 'running' });
    addLog('Sending idea to backend...', 'inf');

    try {
      const response = await axios.post(`${API_BASE}/api/analyze`, { idea });

      if (response.data.success) {
        const { overview, market, competition, businessModel, risks } = response.data.analysis;

        addLog(`Score: ${overview?.score}/10 · ${overview?.recommendation?.toUpperCase()}`, 'ok');
        setPhase('p1', 'done');
        setPhase('p2', overview?.score >= 5 && market        ? 'done' : 'skipped');
        setPhase('p3', overview?.score >= 5 && competition   ? 'done' : 'skipped');
        setPhase('p4', overview?.score >= 5 && businessModel ? 'done' : 'skipped');
        setPhase('p5', risks ? 'done' : 'skipped');

        if (market)        addLog(`Market TAM: ${market.tamEstimate}`, 'ok');
        if (competition)   addLog(`Competitors: ${(competition.directCompetitors || []).slice(0, 2).join(', ')}`, 'ok');
        if (businessModel) addLog(`Revenue: ${(businessModel.revenueStreams || []).join(', ')}`, 'ok');
        if (risks)         addLog(`Top risk: ${risks[0]?.risk}`, 'ok');
        addLog('Analysis complete! Click below to download your PDF report.', 'ok');

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

  // ─── DERIVED ─────────────────────────────────────────────────────────────────
  const overview    = analysis?.overview;
  const market      = analysis?.market;
  const competition = analysis?.competition;
  const business    = analysis?.businessModel;
  const risks       = analysis?.risks;

  const recClass = { proceed: 'rec-proceed', modify: 'rec-modify', abandon: 'rec-abandon' };
  const recIcon  = { proceed: '↑', modify: '~', abandon: '✕' };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
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
              {loading
                ? <><span className="btn-spinner" /> Analyzing</>
                : 'Analyze →'}
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
                <span key={l.id} className={`log-${l.type}`}>{'>'} {l.msg}</span>
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
                        {(market.keyTrends || []).map((t, i) => <Tag key={i} variant="blue">{t}</Tag>)}
                      </div>
                    </div>
                  </SectionCard>
                )}
                {competition && (
                  <SectionCard title="Competition">
                    <div style={{ marginBottom: 12 }}>
                      <div className="sub-label">Direct</div>
                      <div className="tag-list">
                        {(competition.directCompetitors || []).map((c, i) => <Tag key={i} variant="coral">{c}</Tag>)}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="sub-label">Indirect</div>
                      <div className="tag-list">
                        {(competition.indirectCompetitors || []).map((c, i) => <Tag key={i}>{c}</Tag>)}
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
                      {(business.revenueStreams || []).map((s, i) => <Tag key={i} variant="teal">{s}</Tag>)}
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
                        <span className="mit-label">MITIGATION </span>
                        {r.mitigation}
                      </div>
                    </div>
                  );
                })}
              </SectionCard>
            )}

            {/* Download PDF Button */}
            <div>
              <button
                className="save-btn"
                onClick={() => generatePDF(idea, analysis)}
              >
                Download PDF Report ↓
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;