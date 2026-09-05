import * as fuzz from "fuzzball";
import { normalizeName } from "./normalize";

export const FUZZY_AUTO_ACCEPT = 92;
export const FUZZY_REVIEW_FLOOR = 78;

export interface Candidate {
  id: string;
  canonicalName: string;
  googleName?: string | null;
}

export type MatchMethod = "alias" | "exact" | "fuzzy" | "unmatched";

export interface Resolution {
  propertyId: string | null;
  method: MatchMethod;
  score: number | null;
  bestCandidateId: string | null;
  bestScore: number | null;
}

export class EntityResolver {
  private exact = new Map<string, string>(); // normName -> propertyId
  private aliasMap = new Map<string, string>(); // aliasNorm -> propertyId
  private candidates: Array<{ id: string; norm: string }> = [];
  private cache = new Map<string, Resolution>();

  constructor(candidates: Candidate[], aliases: Record<string, string> = {}) {
    for (const c of candidates) {
      const norm = normalizeName(c.canonicalName);
      // first writer wins so canonical names beat google names on collision
      if (!this.exact.has(norm)) this.exact.set(norm, c.id);
      this.candidates.push({ id: c.id, norm });
      if (c.googleName) {
        const gnorm = normalizeName(c.googleName);
        if (!this.exact.has(gnorm)) this.exact.set(gnorm, c.id);
      }
    }
    for (const [alias, propertyId] of Object.entries(aliases)) {
      this.aliasMap.set(normalizeName(alias), propertyId);
    }
  }

  resolve(rawName: string): Resolution {
    const norm = normalizeName(rawName);
    const cached = this.cache.get(norm);
    if (cached) return cached;

    let result: Resolution;
    const aliased = this.aliasMap.get(norm);
    const exact = this.exact.get(norm);
    if (aliased) {
      result = { propertyId: aliased, method: "alias", score: null, bestCandidateId: null, bestScore: null };
    } else if (exact) {
      result = { propertyId: exact, method: "exact", score: null, bestCandidateId: null, bestScore: null };
    } else {
      let bestId: string | null = null;
      let bestScore = 0;
      for (const c of this.candidates) {
        const score = fuzz.token_set_ratio(norm, c.norm);
        if (score > bestScore) {
          bestScore = score;
          bestId = c.id;
        }
      }
      if (bestId && bestScore >= FUZZY_AUTO_ACCEPT) {
        result = { propertyId: bestId, method: "fuzzy", score: bestScore, bestCandidateId: bestId, bestScore };
      } else {
        result = {
          propertyId: null,
          method: "unmatched",
          score: null,
          bestCandidateId: bestScore >= FUZZY_REVIEW_FLOOR ? bestId : null,
          bestScore: bestScore >= FUZZY_REVIEW_FLOOR ? bestScore : null,
        };
      }
    }
    this.cache.set(norm, result);
    return result;
  }
}
