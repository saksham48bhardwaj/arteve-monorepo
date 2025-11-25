import { supabase } from '@arteve/supabase/client';

export type NotificationPayload = {
  userId: string;              // recipient
  type: string;                // e.g. "gig_application"
  title?: string | null;
  body?: string | null;
  entityType?: string | null;  // "gig" | "application" | "booking"
  entityId?: string | number | null;
  data?: Record<string, unknown> | null;
};

export async function sendNotification(payload: NotificationPayload) {
  const {
    userId,
    type,
    title = null,
    body = null,
    entityType = null,
    entityId = null,
    data = null
  } = payload;

  const { data: auth } = await supabase.auth.getUser();
  const actor = auth?.user?.id ?? null;
  if (!actor) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: actor,
    type,
    title,
    body,
    entity_type: entityType,
    entity_id: entityId,
    data,
    created_at: new Date().toISOString()
  });
}
