import type { SupabaseClient } from '@supabase/supabase-js'
import { chooseLeastLoaded } from './ownership'

/**
 * A quién va un chat que la IA traspasa (o que una automatización
 * asigna "por reparto").
 *
 * Reparto entre los miembros con rol **Agente** (los asesores): gana el
 * que tenga menos chats abiertos asignados. Los administradores y el
 * dueño no entran en el reparto. Si la cuenta no tiene asesores, se usa
 * `fallback` (el "Derivar a" de la configuración de la IA).
 *
 * Nunca lanza: ante cualquier error devuelve `fallback`.
 */
export async function pickHandoffAgent(
  db: SupabaseClient,
  accountId: string,
  fallback: string | null,
): Promise<string | null> {
  try {
    const { data: agents, error } = await db
      .from('profiles')
      .select('user_id')
      .eq('account_id', accountId)
      .eq('account_role', 'agent')
    if (error || !agents) return fallback
    const ids = (agents as { user_id: string | null }[])
      .map((a) => a.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (ids.length === 0) return fallback

    const { data: convs, error: convErr } = await db
      .from('conversations')
      .select('assigned_agent_id')
      .eq('account_id', accountId)
      .neq('status', 'closed')
      .in('assigned_agent_id', ids)
    if (convErr) return chooseLeastLoaded(ids, new Map())
    const counts = new Map<string, number>()
    for (const c of (convs ?? []) as { assigned_agent_id: string | null }[]) {
      if (c.assigned_agent_id) counts.set(c.assigned_agent_id, (counts.get(c.assigned_agent_id) ?? 0) + 1)
    }
    return chooseLeastLoaded(ids, counts)
  } catch {
    return fallback
  }
}
