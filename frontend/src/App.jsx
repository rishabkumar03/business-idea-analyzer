import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (idea.trim().length < 10) {
      setError('Please enter at least 10 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await axios.post('http://localhost:3001/api/analyze', {
        idea: idea
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Business Idea Analyzer</h1>
        <p className="subtitle">Get instant AI-powered analysis of your startup idea</p>

        <div className="input-section">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Enter your business idea here... (e.g., 'A mobile app that helps people find pet-friendly restaurants')"
            rows="5"
            disabled={loading}
          />

          <button 
            onClick={handleAnalyze} 
            disabled={loading || idea.trim().length < 10}
            className="analyze-btn"
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Idea'}
          </button>
        </div>

        {error && (
          <div className="error-box">
           {error}
          </div>
        )}

        {loading && (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Analyzing your business idea...</p>
            <p className="loading-note">This may take 1-3 minutes</p>
          </div>
        )}

        {analysis && (
          <div className="results">
            <h2>📊 Analysis Results</h2>

            {/* Overview */}
            <div className="result-card">
              <h3>📝 Overview</h3>
              <div className="score-section">
                <div className="score-box">
                  <span className="score-label">Viability Score</span>
                  <span className="score-value">{analysis.overview.score}/10</span>
                </div>
                <div className="recommendation">
                  <span className="recommendation-badge">
                    {analysis.overview.recommendation.toUpperCase()}
                  </span>
                </div>
              </div>
              <p><strong>Market Size:</strong> {analysis.overview.marketSize}</p>
              <p><strong>Competition:</strong> {analysis.overview.competition}</p>
              <p><strong>Main Risk:</strong> {analysis.overview.mainRisk}</p>
              <p className="reasoning"><strong>Reasoning:</strong> {analysis.overview.reasoning}</p>
            </div>

            {/* Market */}
            {analysis.market && (
              <div className="result-card">
                <h3>📈 Market Analysis</h3>
                <p><strong>TAM Estimate:</strong> {analysis.market.tamEstimate}</p>
                <p><strong>Growth Rate:</strong> {analysis.market.growthRate}</p>
                <p><strong>Demographics:</strong> {analysis.market.targetDemographics}</p>
                <div>
                  <strong>Key Trends:</strong>
                  <ul>
                    {analysis.market.keyTrends.map((trend, i) => (
                      <li key={i}>{trend}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Competition */}
            {analysis.competition && (
              <div className="result-card">
                <h3>⚔️ Competition</h3>
                <p><strong>Direct Competitors:</strong> {analysis.competition.directCompetitors.join(', ')}</p>
                <p><strong>Indirect Competitors:</strong> {analysis.competition.indirectCompetitors.join(', ')}</p>
                <p><strong>Your Edge:</strong> {analysis.competition.differentiation}</p>
                <p><strong>Barriers:</strong> {analysis.competition.barriers}</p>
              </div>
            )}

            {/* Business Model */}
            {analysis.businessModel && (
              <div className="result-card">
                <h3>💰 Business Model</h3>
                <p><strong>Revenue Streams:</strong> {analysis.businessModel.revenueStreams.join(', ')}</p>
                <p><strong>Pricing:</strong> {analysis.businessModel.pricing}</p>
                <p><strong>Scalability:</strong> {analysis.businessModel.scalability}</p>
                <p><strong>Time to Profitability:</strong> {analysis.businessModel.profitabilityTimeline}</p>
              </div>
            )}

            {/* Risks */}
            {analysis.risks && (
              <div className="result-card">
                <h3>⚠️ Top Risks</h3>
                {analysis.risks.map((risk, i) => (
                  <div key={i} className="risk-item">
                    <p>
                      <strong>{i + 1}. [{risk.severity.toUpperCase()}]</strong> {risk.risk}
                    </p>
                    <p className="mitigation">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
