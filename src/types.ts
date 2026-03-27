export type Location = "Salta" | "Jujuy";

export type Role = 
  | "Asesores de servicio"
  | "Asesores de cita"
  | "Subgerente de servicio"
  | "Jefe de Taller"
  | "Técnicos"
  | "Garantía"
  | "Repuestos"
  | "Jefe de Repuestos"
  | "Lavadero"
  | "Pre Entrega"
  | "Ordenes";

export interface Auditor {
  id: string;
  name: string;
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
