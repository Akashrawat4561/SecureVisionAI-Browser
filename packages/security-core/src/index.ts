export interface UrlEvaluationResult {
  score: number
  category: string
  details: string[]
}

const SUSPICIOUS_PATTERNS = [
  /phishing/i,
  /login-verify/i,
  /secure-update/i,
  /\.tk$/i,
  /\.ml$/i,
]

export const globalEvaluator = {
  async evaluateUrl(url: string): Promise<UrlEvaluationResult> {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1') {
        return { score: 0, category: 'SAFE', details: [] }
      }
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(url) || pattern.test(host)) {
          return {
            score: 85,
            category: 'PHISHING',
            details: ['Heuristic match on suspicious URL pattern'],
          }
        }
      }
    } catch {
      return { score: 50, category: 'INVALID', details: ['Malformed URL'] }
    }
    return { score: 0, category: 'SAFE', details: [] }
  },
}
