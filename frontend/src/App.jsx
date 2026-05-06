const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import './App.css';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── PDF GENERATOR ────────────────────────────────────────────────────────────
function generatePDF(idea, analysis) {
  const doc      = new jsPDF({ unit: 'mm', format: 'a4' });
  const W        = doc.internal.pageSize.getWidth();
  const H        = doc.internal.pageSize.getHeight();
  const MARGIN   = 20;
  const COL      = W - MARGIN * 2;
  let   y        = 0;

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

  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setColor  = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (style = 'normal', size = 10) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };

  const writeText = (text, x, startY, maxW, lineH = 5) => {
    const lines = doc.splitTextToSize(String(text || ''), maxW);
    doc.text(lines, x, startY);
    return startY + lines.length * lineH;
  };

  const checkPage = (needed = 20) => {
    if (y + needed > H - 20) {
      doc.addPage();
      setFill(C.pageBg);
      doc.rect(0, 0, W, H, 'F');
      y = 20;
    }
  };

  const rule = (color = C.grey4, weight = 0.3) => {
    setStroke(color);
    doc.setLineWidth(weight);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 4;
  };

  const sectionHead = (label, accentColor = C.teal) => {
    checkPage(16);
    setFill(accentColor);
    doc.roundedRect(MARGIN, y, COL, 9, 2, 2, 'F');
    setColor(C.white);
    setFont('bold', 10);
    doc.text(label.toUpperCase(), MARGIN + 4, y + 6);
    y += 13;
  };

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

  setFill(C.grey1);
  doc.rect(0, 0, W, H, 'F');
  setFill(C.teal);
  doc.rect(0, 0, W, 3, 'F');
  setFont('normal', 8);
  setColor(C.grey3);
  doc.text('AI-POWERED STARTUP ANALYSIS', MARGIN, 22);
  setFont('bold', 28);
  setColor(C.white);
  doc.text('Business Idea', MARGIN, 48);
  doc.text('Analyzer', MARGIN, 62);
  setFill(C.teal);
  doc.rect(MARGIN, 66, 40, 2, 'F');
  setFill([25, 25, 23]);
  doc.roundedRect(MARGIN, 80, COL, 36, 4, 4, 'F');
  setFont('bold', 8);
  setColor(C.teal);
  doc.text('BUSINESS IDEA', MARGIN + 8, 91);
  setFont('normal', 10);
  setColor(C.white);
  const ideaLines = doc.splitTextToSize(idea, COL - 16);
  doc.text(ideaLines.slice(0, 3), MARGIN + 8, 99);

  const score = analysis.overview?.score || 0;
  const rec   = (analysis.overview?.recommendation || 'proceed').toLowerCase();
  const recColors = {
    proceed: { bg: C.teal,  text: C.white },
    modify:  { bg: C.amber, text: C.white },
    abandon: { bg: C.red,   text: C.white },
  };
  const recC = recColors[rec] || recColors.proceed;

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
  setFill(recC.bg);
  doc.roundedRect(MARGIN + 50, 133, 50, 14, 3, 3, 'F');
  setFont('bold', 12);
  setColor(recC.text);
  doc.text(rec.toUpperCase(), MARGIN + 75, 142, { align: 'center' });
  setFont('normal', 8);
  setColor(C.grey3);
  doc.text('RECOMMENDATION', MARGIN + 75, 153, { align: 'center' });

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
  setFont('normal', 7);
  setColor(C.grey3);
  doc.text(`Generated ${new Date().toLocaleString()} · Business Idea Analyzer`, MARGIN, H - 12);

  setFill(C.pageBg);
  doc.rect(0, 0, W, H, 'F');
  setFill(C.grey1);
  doc.rect(0, 0, W, 14, 'F');
  setFont('bold', 8);
  setColor(C.grey3);
  doc.text('BUSINESS IDEA ANALYZER — FULL REPORT', MARGIN, 9);
  setFont('normal', 7);
  setColor(C.grey3);
  doc.text(new Date().toLocaleDateString(), W - MARGIN, 9, { align: 'right' });

  y = 24;
  sectionHead('01  Overview & Reasoning', C.grey1);
  const ov = analysis.overview || {};
  setFont('normal', 9);
  setColor(C.grey1);
  y = writeText(ov.reasoning || '—', MARGIN, y, COL, 5.5);
  y += 4;
  rule(C.grey4);
  kv('Target Customer:  ', ov.targetCustomer);
  kv('Main Risk:  ', ov.mainRisk);
  y += 4;

  if (analysis.market) {
    checkPage(20);
    sectionHead('02  Market Analysis', C.blue);
    const m = analysis.market;
    kv('TAM Estimate:  ', m.tamEstimate);
    kv('Growth Rate:  ', m.growthRate);
    kv('Demographics:  ', m.targetDemographics);
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
    kv('Your Edge:  ', c.differentiation);
    kv('Barriers:  ', c.barriers);
    y += 2;
  }

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
    kv('Pricing:  ', b.pricing);
    kv('Scalability:  ', b.scalability);
    kv('Profitability:  ', b.profitabilityTimeline);
    y += 2;
  }

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
      setFont('bold', 9);
      setColor(C.grey1);
      doc.text(`${i + 1}.`, MARGIN, y);
      setFont('bold', 9);
      const nameY = writeText(r.risk, MARGIN + 6, y, COL - 50, 5);
      setFill(sc.bg);
      doc.roundedRect(W - MARGIN - 28, y - 4, 28, 6, 2, 2, 'F');
      setFont('bold', 7);
      setColor(sc.text);
      doc.text(sev.toUpperCase(), W - MARGIN - 14, y, { align: 'center' });
      y = Math.max(nameY, y + 5) + 1;
      const barW = COL * 0.5;
      setFill(C.grey4);
      doc.roundedRect(MARGIN + 6, y, barW, 2.5, 1, 1, 'F');
      setFill(sc.text);
      doc.roundedRect(MARGIN + 6, y, barW * (sevBar[sev] || 0.5), 2.5, 1, 1, 'F');
      y += 6;
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

  checkPage(0);
  setFill(C.grey1);
  doc.rect(0, H - 16, W, 16, 'F');
  setFont('normal', 7);
  setColor(C.grey3);
  doc.text('Generated by Business Idea Analyzer · Powered by Ollama / Mistral', MARGIN, H - 7);
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, W - MARGIN, H - 7, { align: 'right' });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  doc.save(`business-analysis-${timestamp}.pdf`);
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 1200 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count}</>;
}

// ─── PHASE PILL ───────────────────────────────────────────────────────────────
function PhasePill({ label, state, index }) {
  const icons = { idle: '○', running: '◉', done: '✓', skipped: '—' };
  return (
    <span
      className={`phase-pill ${state || 'idle'}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className="phase-icon">{icons[state] || '○'}</span>
      {label}
    </span>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r      = 28;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 10;
  const color  = score >= 7 ? '#1D9E75' : score >= 5 ? '#BA7517' : '#E24B4A';
  const [animated, setAnimated] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(false), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="score-ring-wrap">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animated ? circ : offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
        <circle cx="36" cy="36" r="22" fill={`${color}18`} />
      </svg>
      <div className="score-ring-inner">
        <span className="score-num" style={{ color }}>
          <AnimatedCounter target={score} duration={1000} />
        </span>
        <span className="score-denom">/ 10</span>
      </div>
    </div>
  );
}

// ─── TAG ──────────────────────────────────────────────────────────────────────
function Tag({ children, variant = 'default', delay = 0 }) {
  return (
    <span
      className={`tag tag-${variant} tag-animate`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

// ─── SEVERITY BADGE ───────────────────────────────────────────────────────────
function SeverityBadge({ level }) {
  const s = (level || 'medium').toLowerCase();
  const pulse = s === 'high';
  return (
    <span className={`severity-badge sev-${s} ${pulse ? 'sev-pulse' : ''}`}>
      {s === 'high' ? '⚠ HIGH' : s === 'low' ? '✓ LOW' : '~ MED'}
    </span>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ title, children, accent, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`section-card ${visible ? 'card-visible' : ''}`}
      style={{
        '--accent': accent,
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="section-title">
        {accent && <span className="section-accent-dot" style={{ background: accent }} />}
        {title}
      </div>
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

// ─── RISK METER ───────────────────────────────────────────────────────────────
function RiskMeter({ severity }) {
  const sevPct   = { low: 30, medium: 65, high: 100 }[(severity || 'medium').toLowerCase()] || 65;
  const sevColor = { low: '#7ab83a', medium: '#BA7517', high: '#E24B4A' }[(severity || 'medium').toLowerCase()] || '#BA7517';
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(sevPct), 200);
    return () => clearTimeout(t);
  }, [sevPct]);

  return (
    <div className="risk-bar-bg">
      <div
        className="risk-bar-fill"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${sevColor}99, ${sevColor})`,
          transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: `0 0 8px ${sevColor}66`,
        }}
      />
    </div>
  );
}

// ─── FLOATING PARTICLES ───────────────────────────────────────────────────────
function Particles() {
  return (
    <div className="particles" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 8}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            opacity: 0.15 + Math.random() * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// ─── TYPING PLACEHOLDER ───────────────────────────────────────────────────────
const PLACEHOLDERS = [
  'An app that connects local farmers to urban restaurants…',
  'A subscription box for rare teas from around the world…',
  'An AI tutor for competitive coding interviews…',
  'A marketplace for pre-owned luxury furniture…',
  'A mobile gym that comes to your neighbourhood…',
];

function useTypingPlaceholder() {
  const [text, setText] = useState('');
  const [pIdx, setPIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const phrase = PLACEHOLDERS[pIdx];
    if (paused) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (!deleting) {
      if (text.length < phrase.length) {
        const t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 45);
        return () => clearTimeout(t);
      } else {
        setPaused(true);
      }
    } else {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), 22);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setPaused(false);
        setPIdx((pIdx + 1) % PLACEHOLDERS.length);
      }
    }
  }, [text, deleting, paused, pIdx]);

  return text + '|';
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const [idea, setIdea]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError]       = useState(null);
  const [logs, setLogs]         = useState([]);
  const [phases, setPhases]     = useState({ p1: 'idle', p2: 'idle', p3: 'idle', p4: 'idle', p5: 'idle' });
  const [charCount, setCharCount] = useState(0);
  const logRef  = useRef(null);
  const inputRef = useRef(null);
  const placeholder = useTypingPlaceholder();

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog  = (msg, type = 'inf') =>
    setLogs(prev => [...prev, { msg, type, id: Date.now() + Math.random() }]);
  const setPhase = (key, state) =>
    setPhases(prev => ({ ...prev, [key]: state }));

  const handleIdeaChange = (e) => {
    setIdea(e.target.value);
    setCharCount(e.target.value.length);
  };

  // ─── ANALYZE ────────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (idea.trim().length < 10) {
      setError({ title: 'Idea too short', fix: 'Please enter at least 10 characters.' });
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setLogs([]);
    setPhases({ p1: 'running', p2: 'running', p3: 'running', p4: 'running', p5: 'running' });
    addLog('Connecting to AI backend…', 'inf');

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, { idea: idea });

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
        addLog('Analysis complete ✓  Download your PDF below.', 'ok');

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
  }, [idea]);

  // ─── DERIVED ─────────────────────────────────────────────────────────────────
  const overview    = analysis?.overview;
  const market      = analysis?.market;
  const competition = analysis?.competition;
  const business    = analysis?.businessModel;
  const risks       = analysis?.risks;

  const recClass = { proceed: 'rec-proceed', modify: 'rec-modify', abandon: 'rec-abandon' };
  const recIcon  = { proceed: '↑', modify: '⇄', abandon: '✕' };
  const recLabel = { proceed: 'Proceed', modify: 'Modify', abandon: 'Abandon' };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Particles />

      {/* Ambient glow orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <div className="container">

        {/* ── Header ── */}
        <div className="header">
          <div className="header-meta">
            <span className="status-dot" />
            <span className="header-label">mistral · localhost:3001</span>
            <span className="header-sep">·</span>
            <span className="header-label header-version">v2.0</span>
          </div>
          <h1 className="header-title">
            <span className="title-glow">Business Idea</span>
            <span className="title-outline"> Analyzer</span>
          </h1>
          <p className="header-sub">
            Progressive AI analysis — market, competition, business model &amp; risks
          </p>
        </div>

        {/* ── Input ── */}
        <div className="input-section">
          <div className={`input-wrapper ${loading ? 'input-loading' : ''} ${idea.length > 0 ? 'input-filled' : ''}`}>
            <textarea
              ref={inputRef}
              value={idea}
              onChange={handleIdeaChange}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAnalyze()}
              placeholder={placeholder}
              rows={3}
              disabled={loading}
              maxLength={500}
              className="idea-input"
            />
            <div className="input-footer">
              <span className={`char-count ${charCount > 450 ? 'char-warn' : ''}`}>
                {charCount} / 500
              </span>
              <button
                className={`analyze-btn ${loading ? 'btn-loading' : ''}`}
                onClick={handleAnalyze}
                disabled={loading || idea.trim().length < 10}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Analyzing…</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">◈</span>
                    <span>Analyze</span>
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Phase Pills ── */}
        <div className="phase-bar">
          {[
            { key: 'p1', label: '01 overview' },
            { key: 'p2', label: '02 market' },
            { key: 'p3', label: '03 competition' },
            { key: 'p4', label: '04 business model' },
            { key: 'p5', label: '05 risks' },
          ].map((p, i) => (
            <PhasePill key={p.key} label={p.label} state={phases[p.key]} index={i} />
          ))}
        </div>

        {/* ── Log Box ── */}
        <div className="log-box" ref={logRef}>
          {logs.length === 0 ? (
            <span className="log-dim">
              <span className="log-cursor">_</span> Ready · Enter your idea to begin…
            </span>
          ) : (
            logs.map((l, i) => (
              <span
                key={l.id}
                className={`log-${l.type} log-line`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="log-prompt">›</span> {l.msg}
              </span>
            ))
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="error-box error-animate">
            <div className="error-icon">⚠</div>
            <div>
              <div className="error-title">{error.title}</div>
              {error.fix && <div className="error-fix">Fix → {error.fix}</div>}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {overview && (
          <div className="results results-animate">

            {/* Metric Cards */}
            <div className="metric-grid">
              <div className="metric-card metric-card--score">
                <ScoreRing score={overview.score} />
                <div className="metric-card-body">
                  <div className="metric-label">Viability Score</div>
                  <div className="metric-strength">
                    {overview.score >= 7 ? '🟢 Strong' : overview.score >= 5 ? '🟡 Moderate' : '🔴 Weak'}
                  </div>
                </div>
              </div>

              <div className="metric-card" style={{ animationDelay: '100ms' }}>
                <div className="metric-icon">📊</div>
                <div className="metric-label">Market Size</div>
                <div className="metric-value">{overview.marketSize || '—'}</div>
                {market && <div className="metric-sub">{market.growthRate}</div>}
              </div>

              <div className="metric-card" style={{ animationDelay: '200ms' }}>
                <div className="metric-icon">⚔</div>
                <div className="metric-label">Competition</div>
                <div className="metric-value">{overview.competition || '—'}</div>
                {competition && (
                  <div className="metric-sub">
                    {(competition.directCompetitors || []).length} direct rivals
                  </div>
                )}
              </div>

              <div className="metric-card" style={{ animationDelay: '300ms' }}>
                <div className="metric-icon">🎯</div>
                <div className="metric-label">Recommendation</div>
                {(() => {
                  const rec = (overview.recommendation || '').toLowerCase();
                  return (
                    <div className={`rec-badge ${recClass[rec] || 'rec-proceed'}`}>
                      <span className="rec-icon">{recIcon[rec] || '↑'}</span>
                      <span>{recLabel[rec] || rec.toUpperCase()}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Overview */}
            <SectionCard title="Overview & Reasoning" accent="#1D9E75" delay={0}>
              <p className="reasoning-text">{overview.reasoning}</p>
              <div className="kv-divider">
                <KVRow label="Target customer" value={overview.targetCustomer} />
                <KVRow label="Main risk"       value={overview.mainRisk} />
              </div>
            </SectionCard>

            {/* Market + Competition */}
            {(market || competition) && (
              <div className="two-col">
                {market && (
                  <SectionCard title="Market Analysis" accent="#378ADD" delay={100}>
                    <KVRow label="TAM estimate" value={market.tamEstimate} />
                    <KVRow label="Growth rate"  value={market.growthRate} />
                    <KVRow label="Demographics" value={market.targetDemographics} />
                    <div className="tags-section">
                      <div className="sub-label">Key trends</div>
                      <div className="tag-list">
                        {(market.keyTrends || []).map((t, i) => (
                          <Tag key={i} variant="blue" delay={i * 50}>{t}</Tag>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                )}
                {competition && (
                  <SectionCard title="Competition" accent="#D85A30" delay={150}>
                    <div className="tags-section">
                      <div className="sub-label">Direct rivals</div>
                      <div className="tag-list">
                        {(competition.directCompetitors || []).map((c, i) => (
                          <Tag key={i} variant="coral" delay={i * 50}>{c}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="tags-section">
                      <div className="sub-label">Indirect rivals</div>
                      <div className="tag-list">
                        {(competition.indirectCompetitors || []).map((c, i) => (
                          <Tag key={i} delay={i * 50}>{c}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="kv-divider">
                      <KVRow label="Your edge"  value={competition.differentiation} />
                      <KVRow label="Barriers"   value={competition.barriers} />
                    </div>
                  </SectionCard>
                )}
              </div>
            )}

            {/* Business Model */}
            {business && (
              <SectionCard title="Business Model" accent="#1D9E75" delay={200}>
                <div className="two-col">
                  <div>
                    <KVRow label="Pricing"       value={business.pricing} />
                    <KVRow label="Scalability"   value={business.scalability} />
                    <KVRow label="Profitability" value={business.profitabilityTimeline} />
                  </div>
                  <div className="tags-section">
                    <div className="sub-label">Revenue streams</div>
                    <div className="tag-list tag-list--col">
                      {(business.revenueStreams || []).map((s, i) => (
                        <Tag key={i} variant="teal" delay={i * 60}>{s}</Tag>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Risks */}
            {risks && (
              <SectionCard title="Risk Assessment" accent="#E24B4A" delay={250}>
                {risks.map((r, i) => (
                  <div key={i} className="risk-item risk-item-animate" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="risk-header">
                      <span className="risk-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="risk-name">{r.risk}</span>
                      <SeverityBadge level={r.severity} />
                    </div>
                    <div className="risk-bar-wrap">
                      <RiskMeter severity={r.severity} />
                    </div>
                    <div className="risk-mitigation">
                      <span className="mit-label">MITIGATION </span>
                      {r.mitigation}
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Download */}
            <div className="download-row">
              <button
                className="save-btn"
                onClick={() => generatePDF(idea, analysis)}
              >
                <span className="save-icon">↓</span>
                <span>Download PDF Report</span>
                <span className="save-sparkle">✦</span>
              </button>
              <button
                className="reset-btn"
                onClick={() => {
                  setAnalysis(null);
                  setLogs([]);
                  setIdea('');
                  setCharCount(0);
                  setPhases({ p1: 'idle', p2: 'idle', p3: 'idle', p4: 'idle', p5: 'idle' });
                }}
              >
                New Analysis ↺
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;
