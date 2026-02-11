
import { GoogleGenAI, Type } from "@google/genai";
import { Trade } from "./types";
import { QuantEngine } from "./logic/quantEngine";

const sanitizeJSON = (text: string): string => {
  if (!text) return "{}";
  const firstOpen = text.indexOf('{');
  const lastClose = text.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return text.substring(firstOpen, lastClose + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * GENERATE MARKET INSIGHT
 * Logic: Tries Gemini API first with a strict timeout. 
 * On failure or timeout, triggers the enhanced Quantitative Heuristic Engine.
 */
export const generateMarketInsight = async (pair: string, currentPrice?: number, change24h?: string, history?: number[]) => {
  const TIMEOUT_MS = 6500; // 6.5 seconds threshold for "Real-Time" feel

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const marketContext = currentPrice 
      ? `Current Price: $${currentPrice}. 24h Change: ${change24h || '0%'}.` 
      : 'Market data unavailable, assume neutral consolidation.';

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("AI_LATENCY_TIMEOUT")), TIMEOUT_MS)
    );

    const aiRequest = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a senior crypto quant trader. Analyze ${pair}. ${marketContext}
      Provide a strategic insight with: Confidence Score (0-100), Action (BUY, SELL, HOLD), Support/Resistance levels, and Technical Reasoning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pair: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            action: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            keyLevels: {
              type: Type.OBJECT,
              properties: {
                support: { type: Type.NUMBER },
                resistance: { type: Type.NUMBER }
              },
              required: ["support", "resistance"]
            }
          },
          required: ["pair", "confidence", "action", "reasoning", "keyLevels"],
        },
      },
    });

    // Race the AI against the clock
    const response: any = await Promise.race([aiRequest, timeoutPromise]);

    const text = response.text;
    if (!text) throw new Error("Empty AI Response");

    const data = JSON.parse(sanitizeJSON(text));
    return { ...data, timestamp: Date.now(), source: 'AI_GEN' };
  } catch (error) {
    // --- EMERGENCY QUANTITATIVE FALLBACK ---
    const basePrice = currentPrice || (pair.includes('BTC') ? 96500 : pair.includes('ETH') ? 2650 : 198);
    
    let analysis;
    if (history && history.length >= 20) {
      analysis = QuantEngine.analyzeTrend(history);
    } else {
      // Basic heuristic if no history provided
      const changeVal = parseFloat((change24h || "0").replace('%', ''));
      analysis = {
        action: changeVal > 2 ? 'BUY' : changeVal < -2 ? 'SELL' : 'HOLD',
        confidence: 70,
        reason: "Momentum analysis via 24h price deviation."
      };
    }

    const volatility = pair.includes('BTC') ? 0.02 : 0.04;
    return {
      pair,
      confidence: analysis.confidence,
      action: analysis.action,
      reasoning: `[QUANT ENGINE] ${analysis.reason} (Latency Bypass Active)`,
      keyLevels: {
        support: Math.floor(basePrice * (1 - volatility)),
        resistance: Math.floor(basePrice * (1 + volatility))
      },
      timestamp: Date.now(),
      source: 'QUANT_ENGINE'
    };
  }
};

export const auditStrategyPerformance = async (trades: Trade[]) => {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const wins = closed.filter(t => (t.pnl || 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const netPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Audit this bot's performance: Win Rate ${winRate.toFixed(1)}%, Net PnL $${netPnL.toFixed(2)}. Return rating (S, A, B, F), efficiency score, critique, and adjustment.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.STRING },
            efficiencyScore: { type: Type.NUMBER },
            critique: { type: Type.STRING },
            recommendedAdjustment: { type: Type.STRING }
          },
          required: ["rating", "efficiencyScore", "critique", "recommendedAdjustment"]
        }
      }
    });

    return JSON.parse(sanitizeJSON(response.text));
  } catch (error) {
    let rating = "C";
    let critique = "Performance is following market baseline. Edge is neutral.";
    if (winRate > 60 && netPnL > 0) { rating = "A"; critique = "Alpha generation confirmed. Positive expectancy."; }
    else if (netPnL < 0) { rating = "F"; critique = "Negative expectancy detected. Tighten stop-loss logic."; }

    return {
      rating,
      efficiencyScore: Math.floor(winRate),
      critique: `[MATH AUDIT] ${critique}`,
      recommendedAdjustment: "Continue standard operation with adjusted risk sizing."
    };
  }
};
