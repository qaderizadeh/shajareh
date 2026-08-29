import type { Env } from "../env";
import type { GenealogyProposal, MatchSuggestion } from "./types";
import { RuleBasedParser } from "./providers/ruleBased";
import { LazyWorkersProvider } from "./providers/workersAi";

export interface GenealogyAIProvider {
  readonly name: string;
  /** متن طبیعی → پیشنهاد ساخت‌یافتهٔ شجره */
  parseGenealogyText(input: string): Promise<GenealogyProposal>;
  /** شرح رابطهٔ دو فرد به زبان ساده */
  explainRelationship(from: string, to: string, chain: string): Promise<string>;
  /** پیشنهاد اتصال دو فرد */
  suggestMatches(a: string, b: string): Promise<MatchSuggestion>;
}

let workersProvider: GenealogyAIProvider | undefined;

/** انتخاب provider بر اساس config؛ در صورت نبودن AI از parser قاعده‌محور استفاده می‌شود. */
export function createProvider(env: Env): GenealogyAIProvider {
  const useAI = (env.AI_PROVIDER || "rules").toLowerCase() === "workers-ai" && !!env.AI;
  if (useAI) {
    workersProvider ??= new LazyWorkersProvider(env);
    return workersProvider;
  }
  return new RuleBasedParser();
}

export type { GenealogyProposal, MatchSuggestion };