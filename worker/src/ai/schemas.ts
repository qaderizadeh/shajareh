import { z } from "zod";

export const ProposalPersonSchema = z
  .object({
    temp_id: z.string().min(1),
    first_name: z.string().min(1),
    last_name: z.string().optional().or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
    birth_date_text: z.string().optional().or(z.literal("")),
    birth_place: z.string().optional().or(z.literal("")),
    death_date_text: z.string().optional().or(z.literal("")),
    death_place: z.string().optional().or(z.literal("")),
    occupation: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    is_narrator: z.boolean().optional(),
  })
  .strict();

export const ProposalRelationshipSchema = z
  .object({
    type: z.enum(["PARENT", "CHILD", "SPOUSE", "PARTNER", "SIBLING"]),
    from: z.string().min(1),
    to: z.string().min(1),
  })
  .strict();

export const GenealogyProposalSchema = z
  .object({
    persons: z.array(ProposalPersonSchema).max(300),
    relationships: z.array(ProposalRelationshipSchema).max(600),
  })
  .strict();

export type ValidatedProposal = z.infer<typeof GenealogyProposalSchema>;

/** اعتبارسنجی کسب‌وکار: ارجاع‌ها معتبر، خودارجاعی نباشد، حداقل یک فرد */
export function businessValidate(p: ValidatedProposal): { error?: string } {
  if (p.persons.length === 0) return { error: "هیچ فردی استخراج نشد. متن را دقیق‌تر بنویسید." };
  const ids = new Set(p.persons.map((x) => x.temp_id));
  for (const r of p.relationships) {
    if (!ids.has(r.from) || !ids.has(r.to)) return { error: "ارجاع به فرد ناموجود در رابطه وجود دارد." };
    if (r.from === r.to) return { error: "رابطهٔ یک فرد با خودش مجاز نیست." };
    // جلوگیری از حلقهٔ والد بودن/بودن
    if (r.type === "PARENT") {
      for (const r2 of p.relationships) {
        if (r2.type === "CHILD" && r2.from === r.from && r2.to === r.to) return { error: "رابطهٔ تکراری/ناسازگار است." };
      }
    }
  }
  return {};
}