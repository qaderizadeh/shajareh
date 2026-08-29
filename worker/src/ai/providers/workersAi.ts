import type { Env } from "../../env";
import type { GenealogyAIProvider } from "../provider";
import type { GenealogyProposal, MatchSuggestion } from "../types";
import { PARSE_SYSTEM_PROMPT, PLOT_TO_GENEALOGY, RELATION_EXPLAIN_PROMPT } from "../prompts";
import { GenealogyProposalSchema, businessValidate } from "../schemas";
import { RuleBasedParser } from "./ruleBased";

/** جایگزینی که از bindings Workers AI (env.AI) استفاده می‌کند.
 *  ساخت آن lazy است تا فقط وقتی AI_PROVIDER=workers-ai فعال شود. */
export class LazyWorkersProvider implements GenealogyAIProvider {
  readonly name = "workers-ai";
  private fallback = new RuleBasedParser();
  constructor(private env: Env) {}
  private model(): string {
    return this.env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  }

  async parseGenealogyText(input: string): Promise<GenealogyProposal> {
    try {
      const out = await (this.env.AI as unknown as AiCallable)(this.model(), {
        messages: [
          { role: "system", content: PARSE_SYSTEM_PROMPT },
          { role: "user", content: PLOT_TO_GENEALOGY(input) },
        ],
      });
      const raw = extractJson(((out as { response?: string }).response ?? ""));
      const parsed = GenealogyProposalSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return this.fallback.parseGenealogyText(input);
      const biz = businessValidate(parsed.data);
      if (biz.error) return this.fallback.parseGenealogyText(input);
      return { ...parsed.data, provenance: { source: "AI", confidence: 0.9, note: "استخراج‌شده از متن شما" } };
    } catch (e) {
      // در صورت هر خطا، به parser قاعده‌محور برگرد تا تجربهٔ کاربر خراب نشود
      return this.fallback.parseGenealogyText(input);
    }
  }

  async explainRelationship(from: string, to: string, chain: string): Promise<string> {
    try {
      const out = await (this.env.AI as unknown as AiCallable)(this.model(), {
        messages: [{ role: "user", content: RELATION_EXPLAIN_PROMPT(from, to, chain) }],
      });
      return ((out as { response?: string }).response ?? "").trim() || this.fallback.explainRelationship(from, to, chain);
    } catch {
      return this.fallback.explainRelationship(from, to, chain);
    }
  }

  async suggestMatches(a: string, b: string): Promise<MatchSuggestion> {
    return this.fallback.suggestMatches(a, b);
  }
}

type AiCallable = (model: string, input: Record<string, unknown>) => Promise<unknown>;

/** استخراج اولین بلوک JSON از پاسخ احتمالیِ آمیخته */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}