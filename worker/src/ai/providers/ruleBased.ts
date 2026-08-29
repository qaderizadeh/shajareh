import type { GenealogyAIProvider } from "../provider";
import type { GenealogyProposal, MatchSuggestion } from "../types";
import { toLatinDigits } from "../../util/persian";

const STOP = new Set([
  "و", "که", "را", "به", "از", "با", "یک", "بود", "است", "شد", "می", "این", "آن", "برای", "در",
  "بودند", "دارد", "داشت", "خواهد", "می‌شود", "نام", "به‌نام", "استاد",
]);

/** توکن‌های احتمالاً نام: چند کلمهٔ پشت‌سرهم که در STOP و علائم نیستند */
function isNameToken(w: string): boolean {
  if (w.length < 3) return false;
  if (STOP.has(w)) return false;
  if (/^[۰-۹0-9]+$/.test(toLatinDigits(w))) return false;
  return true;
}

const KIN = {
  "پدر": "PARENT",
  "مادر": "PARENT",
  "پدربزرگ": "PARENT",
  "مادربزرگ": "PARENT",
  "پسر": "CHILD",
  "دختر": "CHILD",
  "فرزند": "CHILD",
  "همسر": "SPOUSE",
  "عروس": "SPOUSE",
  "داماد": "SPOUSE",
  "برادر": "SIBLING",
  "خواهر": "SIBLING",
} as const;

function splitSentences(text: string): string[] {
  return text
    .replace(/\u200c/g, " ")
    .split(/[.\n!؟?؛]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Determininistic parser — حداقل برای آزمایش و محیط بدون AI */
export class RuleBasedParser implements GenealogyAIProvider {
  readonly name = "rules";

  async parseGenealogyText(input: string): Promise<GenealogyProposal> {
    const persons: GenealogyProposal["persons"] = [];
    const relationships: GenealogyProposal["relationships"] = [];
    const byName = new Map<string, string>();
    const ensure = (name: string): string | null => {
      const key = name.trim();
      if (!isNameToken(key)) return null;
      const exist = byName.get(key);
      if (exist) return exist;
      const id = `p${persons.length + 1}`;
      byName.set(key, id);
      persons.push({ temp_id: id, first_name: key, notes: "استخراج قاعده‌محور؛ احتمال خطا دارد" });
      return id;
    };

    const sentences = splitSentences(input);
    for (const s of sentences) {
      // «اسم من X است»
      const withName = s.match(/اسم\s+من\s+(\S+)\s+است/i);
      if (withName && withName[1]) {
        const id = ensure(withName[1]);
        if (id) persons.find((p) => p.temp_id === id)!.notes += " (راوی)";
      }
      // «X پدر Y بود/است»، «X همسر Y»، «X با Y ازدواج کرد»
      for (const [kindWord, type] of Object.entries(KIN)) {
        const re = new RegExp(`([\\u0600-\\u06FF]{3,})\\s*${kindWord}\\s*(?:ی|ش|م|مون)?\\s*(?:به‌نام|به نام)?\\s*([\\u0600-\\u06FF]{3,})`);
        const mm = s.match(re);
        if (mm && mm[1] && mm[2]) {
          const aToken = mm[1];
          const bToken = mm[2];
          const a = ensure(aToken);
          const b = ensure(bToken);
          if (a && b) {
            if (type === "PARENT") {
              // «X پدر Y» → X والدِ Y
              relationships.push({ type: "PARENT", from: a, to: b });
            } else if (type === "CHILD") {
              // «X پسر/دختر/فرزند Y» → Y والدِ X
              relationships.push({ type: "PARENT", from: b, to: a });
            } else {
              relationships.push({ type: type as any, from: a, to: b });
            }
          }
        }
      }
      // «X با Y ازدواج کرد»
      const marriage = s.match(/([\u0600-\u06FF]{3,})\s+با\s+([\u0600-\u06FF]{3,})\s+ازدواج/);
      if (marriage && marriage[1] && marriage[2]) {
        const a = ensure(marriage[1]);
        const b = ensure(marriage[2]);
        if (a && b) relationships.push({ type: "SPOUSE", from: a, to: b });
      }
    }

    return {
      persons,
      relationships: relationships.filter(
        (r, i, arr) => arr.findIndex((x) => x.from === r.from && x.to === r.to && x.type === r.type) === i
      ),
      provenance: { source: "RULES", confidence: 0.55, note: "استخراج قاعده‌محور؛ لطفاً تأیید کنید" },
    };
  }

  async explainRelationship(_from: string, _to: string, _chain: string): Promise<string> {
    return "توضیح خودکار برای این رابطه در دسترس نیست؛ مسیر رابطه را در شجره ببینید.";
  }

  async suggestMatches(a: string, b: string): Promise<MatchSuggestion> {
    const shareA = a.split(/\s+/);
    const shareB = b.split(/\s+/);
    const common = shareA.filter((x) => shareB.includes(x));
    return {
      personA: a,
      personB: b,
      confidence: common.length > 0 ? 0.7 : 0.3,
      reason: common.length > 0 ? ["اشتراک در نام خانوادگی"] : ["شباهت مشخص نشد"],
    };
  }
}