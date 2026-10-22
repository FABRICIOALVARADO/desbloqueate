/** Identificador único. randomUUID solo existe en contextos seguros (https/localhost), de ahí el respaldo. */
export function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
