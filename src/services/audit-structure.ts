import { AUDIT_QUESTIONS, STAFF } from "../constants";
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
    staffOptions: STAFF[name] ?? [],
    items: questions.map((question, index) => ({
      id: `${slugify(name)}-${index + 1}`,
      text: question,
      required: true,
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
    staffOptions: Array.isArray(category.staffOptions) ? category.staffOptions : [],
    items: Array.isArray(category.items)
      ? category.items.map((item: any, index: number) => ({
          id: item.id || `${slugify(category.name)}-${index + 1}`,
          text: item.text,
          required: typeof item.required === "boolean" ? item.required : true,
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