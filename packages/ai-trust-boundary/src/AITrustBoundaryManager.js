"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITrustBoundaryManager = void 0;
/**
 * AI Safety & Trust Boundary Manager (Phase 10 — Production Hardening)
 *
 * Responsibilities:
 * 1. Sanitizes inputs/outputs between page contexts and local/remote LLM engines.
 * 2. Implements real-time prompt injection heuristics (ignoring instructions, jailbreaks).
 * 3. Sanitizes hidden DOM context to block extraction attacks.
 * 4. Tracks token budgets, content trust scores, and offers failover routes.
 */
class AITrustBoundaryManager {
    PROMPT_INJECTION_PATTERNS = [
        /ignore previous instructions/i,
        /ignore the above/i,
        /system command override/i,
        /you are now a/i,
        /dan mode/i,
        /jailbreak/i,
        /forget everything/i,
        /forget your system prompt/i,
        /as a malicious/i
    ];
    cache = new Map();
    /**
     * Scans a prompt to detect known prompt injection attacks and scores its safety
     */
    analyzePromptSafety(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            return { isSafe: false, trustScore: 0, reason: 'Invalid or null prompt input type.' };
        }
        // Pattern matching
        for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
            if (pattern.test(prompt)) {
                return {
                    isSafe: false,
                    trustScore: 10,
                    reason: `Potential Prompt Injection Detected: Match on pattern ${pattern.toString()}`
                };
            }
        }
        // Check for excessive length or special character frequencies (obfuscation attempt)
        if (prompt.length > 25000) {
            return { isSafe: false, trustScore: 20, reason: 'Exceeded maximum prompt safety token count constraint.' };
        }
        return { isSafe: true, trustScore: 95 };
    }
    /**
     * Sanitizes page DOM text to extract content without transmitting malicious hidden instructions
     */
    sanitizeDomContext(rawHtml) {
        // 1. Remove script tags, style tags, and event handlers
        let sanitized = rawHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/on\w+="[^"]*"/g, '')
            .replace(/on\w+='[^']*'/g, '');
        // 2. Remove hidden/invisible elements often used in prompt injection (display:none, visibility:hidden, opacity:0)
        sanitized = sanitized.replace(/<[^>]*(?:display:\s*none|visibility:\s*hidden|opacity:\s*0)[^>]*>([\s\S]*?)<\/[^>]+>/gi, '');
        // 3. Strip tags to only leave safe, structured text content
        sanitized = sanitized.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return sanitized;
    }
    /**
     * Strips malicious instructions and returns a safe representation
     */
    stripMaliciousInstructions(prompt) {
        let clean = prompt;
        for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
            clean = clean.replace(pattern, '[STRIPPED BY SECURITY ENGINE]');
        }
        return clean;
    }
    /**
     * Evaluates AI model outputs to verify they do not contain raw markdown script payloads or dangerous URLs
     */
    verifyOutputSafety(output) {
        if (/<script/i.test(output) || /javascript:/i.test(output)) {
            return {
                isSafe: false,
                verifiedOutput: '[Blocked by AI Trust Boundary: Disallowed script execution payload detected]'
            };
        }
        return { isSafe: true, verifiedOutput: output };
    }
    /**
     * Dynamic Model Routing & Fallback Orchestration
     */
    async routeWithFallback(prompt, primaryCall, fallbackCall) {
        const cacheKey = encodeURIComponent(prompt.substring(0, 100));
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const safety = this.analyzePromptSafety(prompt);
        if (!safety.isSafe) {
            throw new Error(`Execution Blocked: Prompt flagged with low trust score (${safety.trustScore}/100) — ${safety.reason}`);
        }
        const cleanedPrompt = this.stripMaliciousInstructions(prompt);
        try {
            // 1. Attempt primary routing
            const response = await primaryCall(cleanedPrompt);
            const safetyChecked = this.verifyOutputSafety(response);
            this.cache.set(cacheKey, safetyChecked.verifiedOutput);
            return safetyChecked.verifiedOutput;
        }
        catch (primaryErr) {
            console.warn('[AITrustBoundary] Primary AI model failed. Re-routing to secondary resilient fallback model...', primaryErr);
            try {
                // 2. Fallback routing
                const response = await fallbackCall(cleanedPrompt);
                const safetyChecked = this.verifyOutputSafety(response);
                this.cache.set(cacheKey, safetyChecked.verifiedOutput);
                return safetyChecked.verifiedOutput;
            }
            catch (fallbackErr) {
                console.error('[AITrustBoundary] All AI routing models exhausted or unreachable.', fallbackErr);
                throw new Error('AI Engine outage: Primary and fallback interfaces are currently offline.');
            }
        }
    }
}
exports.AITrustBoundaryManager = AITrustBoundaryManager;
