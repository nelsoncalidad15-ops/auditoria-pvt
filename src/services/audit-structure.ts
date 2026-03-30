import { AUDIT_QUESTIONS, OR_CHECKLIST_ITEMS, STAFF } from "../constants";
import { createClientId } from "../lib/utils";
import { AuditCategory, AuditStructureScope } from "../types";

function getStorageKey(scope: AuditStructureScope) {
  return `audit-structure-v1:${scope}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || createClientId();
}

export function getDefaultAuditCategories(): AuditCategory[] {
  return Object.entries(AUDIT_QUESTIONS).map(([name, questions]) => ({
    id: slugify(name),
    name,
    description: "",
    staffOptions: STAFF[name] ?? [],
    items: name === "Ordenes"
      ? OR_CHECKLIST_ITEMS.map((item, index) => ({
          ...item,
          id: item.id || `${slugify(name)}-${index + 1}`,
          text: item.text,
          required: false,
          block: item.block || "General",
          priority: item.priority || "medium",
          guidance: item.guidance || "",
          requiresCommentOnFail: typeof item.requiresCommentOnFail === "boolean" ? item.requiresCommentOnFail : false,
          description: item.description || "",
          responsibleRoles: Array.isArray(item.responsibleRoles) ? item.responsibleRoles : [],
          sector: item.sector || "recepcion",
          allowsNa: typeof item.allowsNa === "boolean" ? item.allowsNa : true,
          weight: typeof item.weight === "number" ? item.weight : 1,
          order: typeof item.order === "number" ? item.order : index + 1,
          active: typeof item.active === "boolean" ? item.active : true,
        }))
      : questions.map((question, index) => ({
          id: `${slugify(name)}-${index + 1}`,
          text: question,
          required: false,
          block: "General",
          priority: "medium",
          guidance: "",
          requiresCommentOnFail: false,
          description: "",
          responsibleRoles: [],
          sector: "resumen",
          allowsNa: true,
          weight: 1,
          order: index + 1,
          active: true,
        })),
  }));
}

export function normalizeAuditCategories(categories: AuditCategory[] | unknown): AuditCategory[] {
  const defaultCategories = getDefaultAuditCategories();

  if (!Array.isArray(categories) || categories.length === 0) {
    return defaultCategories;
  }

  return categories.map((category: any) => ({
    id: category.id || slugify(category.name),
    name: category.name,
    description: typeof category.description === "string" ? category.description : "",
    staffOptions: Array.isArray(category.staffOptions) ? category.staffOptions : [],
    items: Array.isArray(category.items)
      ? category.items.map((item: any, index: number) => ({
          id: item.id || `${slugify(category.name)}-${index + 1}`,
          text: item.text,
          required: false,
          block: typeof item.block === "string" && item.block.trim() ? item.block.trim() : "General",
          priority: item.priority === "high" || item.priority === "medium" || item.priority === "low" ? item.priority : "medium",
          guidance: typeof item.guidance === "string" ? item.guidance : "",
          requiresCommentOnFail: typeof item.requiresCommentOnFail === "boolean" ? item.requiresCommentOnFail : false,
          description: typeof item.description === "string" ? item.description : "",
          responsibleRoles: Array.isArray(item.responsibleRoles) ? item.responsibleRoles : [],
          sector: typeof item.sector === "string" && item.sector.trim() ? item.sector : "resumen",
          allowsNa: typeof item.allowsNa === "boolean" ? item.allowsNa : true,
          weight: typeof item.weight === "number" ? item.weight : 1,
          order: typeof item.order === "number" ? item.order : index + 1,
          active: typeof item.active === "boolean" ? item.active : true,
        }))
      : [],
  }));
}

export function getStoredAuditCategories(scope: AuditStructureScope = "global"): AuditCategory[] {
  try {
    const rawValue = localStorage.getItem(getStorageKey(scope));
    if (!rawValue) {
      return getDefaultAuditCategories();
    }

    return normalizeAuditCategories(JSON.parse(rawValue) as AuditCategory[]);
  } catch {
    return getDefaultAuditCategories();
  }
}

export function saveAuditCategories(categories: AuditCategory[], scope: AuditStructureScope = "global") {
  localStorage.setItem(getStorageKey(scope), JSON.stringify(categories));
}

export function resetAuditCategories(scope: AuditStructureScope = "global") {
  const defaults = getDefaultAuditCategories();
  saveAuditCategories(defaults, scope);
  return defaults;
}