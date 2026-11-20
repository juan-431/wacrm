// Reglas de propiedad de un chat cuando hay varios asesores.
//
// - Un chat sin asesor lo puede tomar cualquiera (agente o más).
// - Un chat con asesor solo lo atiende ese asesor.
// - Un administrador (o el dueño de la cuenta) puede actuar sobre
//   cualquier chat y reasignarlo.
//
// Funciones puras: las usan las rutas del servidor y la bandeja, para
// que pantalla y servidor apliquen exactamente la misma regla.
import { hasMinRole, type AccountRole } from '@/lib/auth/roles'

function isAdmin(role: AccountRole | null | undefined): boolean {
  return !!role && hasMinRole(role, 'admin')
}

/** ¿Puede este usuario escribir, tomar o devolver a la IA este chat? */
export function canActOnConversation(
  assignedAgentId: string | null | undefined,
  userId: string | null | undefined,
  role: AccountRole | null | undefined,
): boolean {
  if (!userId || !role) return false
  if (!hasMinRole(role, 'agent')) return false
  if (!assignedAgentId || assignedAgentId === userId) return true
  return isAdmin(role)
}

/**
 * ¿Puede este usuario cambiar el asesor del chat de `current` a `next`?
 * Un administrador puede todo. Un asesor solo puede tomar un chat libre
 * para sí mismo o soltar uno que ya es suyo.
 */
export function canChangeAssignment(
  current: string | null | undefined,
  next: string | null | undefined,
  userId: string | null | undefined,
  role: AccountRole | null | undefined,
): boolean {
  if (!userId || !role) return false
  if (isAdmin(role)) return true
  if (!hasMinRole(role, 'agent')) return false
  const cur = current ?? null
  const nxt = next ?? null
  if (cur === null) return nxt === userId
  if (cur === userId) return nxt === null || nxt === userId
  return false
}

/**
 * Elige al asesor con menos chats abiertos. Empates: al azar, para que
 * no le toquen siempre al mismo. Devuelve null si no hay asesores.
 */
export function chooseLeastLoaded(
  agentIds: readonly string[],
  openCounts: ReadonlyMap<string, number>,
  rand: () => number = Math.random,
): string | null {
  if (agentIds.length === 0) return null
  let min = Infinity
  for (const id of agentIds) min = Math.min(min, openCounts.get(id) ?? 0)
  const tied = agentIds.filter((id) => (openCounts.get(id) ?? 0) === min)
  return tied[Math.min(tied.length - 1, Math.floor(rand() * tied.length))]
}
