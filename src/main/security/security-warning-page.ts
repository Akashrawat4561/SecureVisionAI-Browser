/**
 * SecurityWarningPage — generates a hardened HTML threat-blocking page
 * injected directly into a BrowserView when a threat is detected.
 *
 * Design: Arc-style, dark mode, glassmorphic — matching SecureVision's UI language.
 */
export function generateWarningPage(params: {
  url: string
  threatCategory: string
  threatScore: number
  threatDetails: string
}): string {
  const { url, threatCategory, threatScore, threatDetails } = params

  const scoreColor =
    threatScore >= 85 ? '#ef4444' : threatScore >= 60 ? '#f59e0b' : '#eab308'

  const severityLabel =
    threatScore >= 85 ? 'CRITICAL' : threatScore >= 60 ? 'HIGH' : 'MEDIUM'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline';" />
  <title>SecureVision — Threat Blocked</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .bg-glow {
      position: fixed;
      inset: 0;
      background: radial-gradient(ellipse at 50% 40%, rgba(239,68,68,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .card {
      position: relative;
      max-width: 560px;
      width: 90%;
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.6);
      animation: fadeIn 0.4s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    .shield-icon {
      font-size: 52px;
      margin-bottom: 20px;
      display: block;
      text-align: center;
      animation: pulse 2s ease infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.65;} }
    h1 {
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      color: ${scoreColor};
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .severity-badge {
      display: inline-block;
      margin: 0 auto 20px;
      padding: 3px 12px;
      border-radius: 999px;
      background: ${scoreColor}20;
      border: 1px solid ${scoreColor}40;
      color: ${scoreColor};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-align: center;
      width: 100%;
    }
    .url-box {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 12px;
      color: #a1a1aa;
      word-break: break-all;
      margin-bottom: 20px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 28px;
    }
    .detail-item {
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .detail-label { font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .detail-value { font-size: 14px; font-weight: 600; color: #fafafa; }
    .score-bar-bg { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 6px; }
    .score-bar { height: 4px; border-radius: 2px; background: ${scoreColor}; width: ${threatScore}%; }
    .actions { display: flex; gap: 12px; }
    .btn {
      flex: 1; padding: 12px; border-radius: 12px; border: none;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn-go-back {
      background: rgba(255,255,255,0.1); color: #e4e4e7;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .btn-go-back:hover { background: rgba(255,255,255,0.18); }
    .btn-proceed {
      background: rgba(239,68,68,0.12); color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.25);
    }
    .btn-proceed:hover { background: rgba(239,68,68,0.22); }
    .footer-note {
      margin-top: 20px; text-align: center; font-size: 11px; color: #52525b;
    }
  </style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="card">
    <span class="shield-icon">🛡️</span>
    <h1>Threat Detected &amp; Blocked</h1>
    <div class="severity-badge">⚠ ${severityLabel} RISK — ${threatCategory}</div>

    <div class="url-box">${url}</div>

    <div class="details-grid">
      <div class="detail-item">
        <div class="detail-label">Threat Score</div>
        <div class="detail-value">${threatScore}/100</div>
        <div class="score-bar-bg"><div class="score-bar"></div></div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Category</div>
        <div class="detail-value">${threatCategory}</div>
      </div>
      <div class="detail-item" style="grid-column:1/-1">
        <div class="detail-label">Security Analysis</div>
        <div class="detail-value" style="font-size:12px;font-weight:400;color:#a1a1aa;margin-top:4px">${threatDetails}</div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-go-back" onclick="window.history.back()">← Go Back to Safety</button>
      <button class="btn btn-proceed" onclick="document.body.innerHTML='<p style=\\'color:#999;text-align:center;padding:40px;font-size:13px\\'>Proceeding at your own risk…</p>';window.location.href='${url}'">
        Proceed Anyway (Risk)
      </button>
    </div>
    <p class="footer-note">SecureVision AI Security Engine • Real-time threat analysis</p>
  </div>
</body>
</html>`
}
