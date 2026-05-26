'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: other } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', handle)
        .single();

      if (!other) return;

      // Find existing conversation
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existing?.length) {
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', other.id)
          .in(
            'conversation_id',
            existing.map((c) => c.conversation_id)
          );

        if (shared?.length) {
          router.replace(`/chat/${shared[0].conversation_id}`);
          return;
        }
      }

      // Create new conversation
      const { data: convo } = await supabase
        .from('conversations')
        .insert({ created_by: user.id })
        .select()
        .single();

      await supabase.from('conversation_participants').insert([
        { conversation_id: convo.id, user_id: user.id },
        { conversation_id: convo.id, user_id: other.id },
      ]);

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
