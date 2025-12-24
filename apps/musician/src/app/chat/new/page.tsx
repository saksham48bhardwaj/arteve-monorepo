'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const params = useSearchParams();
  const handle = params.get('user');

  useEffect(() => {
    if (!handle) return;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push('/login');
        return;
      }

      const me = auth.user.id;

      // 1️⃣ Get target profile
      const { data: target, error: targetErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('handle', handle)
        .single();

      if (targetErr || !target) {
        alert('User not found');
        return;
      }

      // 🚫 Prevent self-chat
      if (me === target.id) {
        router.push('/chat');
        return;
      }

      // 2️⃣ Check for existing conversation
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', me);

      if (existing?.length) {
        const convoIds = existing.map(e => e.conversation_id);

        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', target.id)
          .in('conversation_id', convoIds)
          .limit(1);

        if (shared?.length) {
          router.push(`/chat/${shared[0].conversation_id}`);
          return;
        }
      }

      // 3️⃣ Create conversation
      const { data: convo, error: convoErr } = await supabase
        .from('conversations')
        .insert({ created_by: me, booking_id: null })
        .select('id')
        .single();

      if (convoErr || !convo) {
        alert(convoErr?.message || 'Failed to create conversation');
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', me)
        .single();

      // 4️⃣ Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: convo.id,
            user_id: me,
            role: myProfile?.role ?? 'musician',
          },
          {
            conversation_id: convo.id,
            user_id: target.id,
            role: target.role,
          },
        ]);

      if (partError) {
        alert(partError.message);
        return;
      }

      // 5️⃣ Redirect
      router.push(`/chat/${convo.id}`);
    })();
  }, [handle, router]);

  return (
    <main className="p-6 text-center text-neutral-600">
      Starting chat…
    </main>
  );
}

function Loading() {
  return (
    <main className="p-6 text-center text-neutral-500">
      Preparing chat…
    </main>
  );
}
