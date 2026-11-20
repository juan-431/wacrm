import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { canChangeAssignment } from '@/lib/inbox/ownership'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { getT } from '@/lib/i18n/translate'

const t = getT('Api')

type Params = { params: Promise<{ conversationId: string }> }

/**
 * POST /api/conversations/:id/assign — cambia el asesor de un chat.
 *
 * Body: { agent_id: string | null }
 *
 * Reglas (ver lib/inbox/ownership.ts): un administrador reasigna
 * cualquier chat; un asesor solo puede tomar un chat libre para sí o
 * soltar uno suyo. Si el destino no es miembro de la cuenta, el
 * disparador de la base de datos (migración 055) lo rechaza y la
 * respuesta devuelve el asesor que quedó guardado.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, accountId, userId, role } = await requireRole('agent')

    const limit = checkRateLimit(`assign:${userId}`, RATE_LIMITS.send)
    if (!limit.success) return rateLimitResponse(limit)

    const { conversationId } = await params
    const body = await request.json().catch(() => null)
    const next = body?.agent_id
    if (body === null || (next !== null && typeof next !== 'string')) {
      return NextResponse.json({ error: t('common.invalidRequestBody') }, { status: 400 })
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, assigned_agent_id')
      .eq('id', conversationId)
      .eq('account_id', accountId)
      .maybeSingle()
    if (!conv) {
      return NextResponse.json({ error: t('common.conversationNotFound') }, { status: 404 })
    }

    if (!canChangeAssignment(conv.assigned_agent_id ?? null, next, userId, role)) {
      return NextResponse.json({ error: t('common.assignedToOtherAgent') }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('conversations')
      .update({ assigned_agent_id: next })
      .eq('id', conversationId)
      .eq('account_id', accountId)
      .select('assigned_agent_id')
      .single()
    if (error) {
      console.error('[conversations/assign] update error:', error)
      return NextResponse.json({ error: t('common.internalServerError') }, { status: 500 })
    }
    return NextResponse.json({ assigned_agent_id: data?.assigned_agent_id ?? null })
  } catch (err) {
    return toErrorResponse(err)
  }
}
