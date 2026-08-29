import type { Gender, RelationshipType } from "../env";

/** فرد استخراج‌شده توسط AI. temp_id برای ارتباط داخلی پیشنهاد است. */
export interface ProposalPerson {
  temp_id: string;
  first_name: string;
  last_name?: string;
  gender?: Gender;
  birth_date_text?: string;
  birth_place?: string;
  death_date_text?: string;
  death_place?: string;
  /** نکات/میلی‌آنچه که در متن آمده اما ساختارمند نشده */
  notes?: string;
}

export interface ProposalRelationship {
  type: RelationshipType;
  from: string; // temp_id
  to: string;   // temp_id
  /** جهت را طوری تعریف می‌کنیم: نوع SPOUSE متقارن است */
}

export interface GenealogyProposal {
  persons: ProposalPerson[];
  relationships: ProposalRelationship[];
  /** منشأ استخراج */
  provenance?: {
    source: "AI" | "RULES";
    confidence: number; // 0..1
    note?: string;
  };
}

/** پیشنهاد اتصال/تطابق دو فرد */
export interface MatchSuggestion {
  personA: string;
  personB: string;
  confidence: number;
  reason: string[];
}