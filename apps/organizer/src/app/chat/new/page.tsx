'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { toast } from '@arteve/ui/components';

export const dynamic = 'force-dynamic';

export default function NewChatPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewChatContent />
    </Suspense>
  );
}

function NewChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handle = searchParams.get('user');

  useEffect(() => {
    if (!handle) return;

    async function startChat() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push('/login');
        return;
      }
      const me = auth.user.id;

      // Target profile
      const { data: target, error: targetErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('handle', handle)
        .single();

      if (targetErr || !target) {
        toast.error('User not found');
        router.replace('/chat');
        return;
      }

      // Prevent self-chat
      if (me === target.id) {
        router.replace('/chat');
        return;
      }

      // Find existing 1:1 conversation
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', me);

      if (existing?.length) {
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', target.id)
          .in(
            'conversation_id',
            existing.map((c) => c.conversation_id)
          )
          .limit(1);

        if (shared?.length) {
          router.replace(`/chat/${shared[0].conversation_id}`);
          return;
        }
      }

      // Create new conversation
      const { data: convo, error: convoErr } = await supabase
        .from('conversations')
        .insert({ created_by: me, booking_id: null })
        .select('id')
        .single();

      if (convoErr || !convo) {
        toast.error(convoErr?.message || 'Failed to start chat');
        router.replace('/chat');
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', me)
        .single();

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: convo.id, user_id: me, role: myProfile?.role ?? 'organizer' },
          { conversation_id: convo.id, user_id: target.id, role: target.role },
        ]);

      if (partError) {
        toast.error(partError.message || 'Failed to start chat');
        return;
      }

      router.replace(`/chat/${convo.id}`);
    }

    startChat();
  }, [handle, router]);

  return <Loading />;
}

function Loading() {
  return (
    <main className="page page-narrow">
      <div className="card card-padded flex items-center gap-3">
        <span className="inline-block h-4 w-4 rounded-full border-2 border-brand border-r-transparent animate-spin" />
        <p className="text-sm text-ink-muted">Starting chat…</p>
      </div>
    </main>
  );
}
