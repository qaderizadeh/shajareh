export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "ADMIN" | "USER";
  created_at: string;
}

export interface FamilySummary {
  id: string;
  name: string;
  description: string | null;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  persons_count: number;
  members_count: number;
}

export interface FamilyStats {
  persons: number;
  generations: number;
  media: number;
  spouses: number;
}

export interface Person {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  father_name: string;
  mother_name: string;
  gender: Gender;
  birth_date_text: string;
  birth_place: string;
  death_date_text: string;
  death_place: string;
  is_living: number;
  occupation: string;
  residence: string;
  education: string;
  biography: string;
  is_private: number;
}

export interface PersonGraphNode {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_living: number;
  birth_date_text: string;
  death_date_text: string;
  birth_year_min: number | null;
  birth_place: string;
}

export interface GraphData {
  persons: PersonGraphNode[];
  links: Record<string, string[]>;
  parentMap: Record<string, string[]>;
  childMap: Record<string, string[]>;
  spouseMap: Record<string, string[]>;
}

export interface ProposalPerson {
  temp_id: string;
  first_name: string;
  last_name?: string;
  gender?: Gender;
  birth_date_text?: string;
  birth_place?: string;
  death_date_text?: string;
  is_narrator?: boolean;
  notes?: string;
}

export interface ProposalRelationship {
  type: "PARENT" | "SPOUSE" | "PARTNER" | "SIBLING" | "CHILD";
  from: string;
  to: string;
}

export interface AIProposal {
  id: string;
  proposal: { persons: ProposalPerson[]; relationships: ProposalRelationship[] };
  warning: string | null;
  provenance?: { source: "AI" | "RULES"; confidence: number; note?: string };
}

export interface MediaItem {
  id: string;
  family_id: string;
  person_id: string | null;
  kind: "PHOTO" | "DOCUMENT";
  storage_key: string;
  mime_type: string;
  caption: string;
  size: number;
}

export interface SearchResult {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date_text: string;
  death_date_text: string;
  birth_place: string;
  is_living: number;
  family_name: string;
}