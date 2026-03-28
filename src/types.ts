export type Location = "Salta" | "Jujuy";

export type AuditStructureScope = "global" | Location;

export type Role = string;

export interface Auditor {
  id: string;
  name: string;
}

export interface AuditTemplateItem {
  id: string;
  text: string;
  required: boolean;
}

export interface AuditCategory {
  id: string;
  name: string;
  items: AuditTemplateItem[];
  staffOptions: string[];
}

export interface AuditItem {
  id: string;
  question: string;
  category: Role;
  status: "pass" | "fail" | "na";
  comment?: string;
  photoUrl?: string;
}

export interface AuditSession {
  id: string;
  date: string;
  auditorId: string;
  location: Location;
  staffName?: string;
  role?: Role;
  items: AuditItem[];
  totalScore: number;
  orderNumber?: string;
  notes?: string;
}