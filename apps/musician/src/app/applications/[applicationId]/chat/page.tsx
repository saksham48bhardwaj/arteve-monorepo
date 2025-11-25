'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Message = {
  id: string;
  created_at: string;
  sender_id: string;
  body: string;
  application_id: string;
};

export default function ChatThread() {
  const { applicationId } = useParams<{ applicationId: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const endRef = useRef<HTMLDivElement>(null);

  // Load initial messages + user
  async function loadMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMsgs(data as Message[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
  }, [applicationId]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`application-chat-${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Send message
  async function sendMessage() {
    if (!userId || !body.trim()) return;

    const { error } = await supabase.from('messages').insert({
      application_id: applicationId,
      sender_id: userId,
      body: body.trim(),
    });

    if (!error) {
      setBody('');
    }
  }

  if (loading) {
    return <main className="p-6">Loading chat…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-3 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto space-y-2">
        {msgs.map((m) => {
          const isMine = m.sender_id === userId;

          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2 border-t pt-2"
      >
        <input
          className="flex-1 border rounded-full px-3 py-2"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 border rounded-full bg-blue-600 text-white"
        >
          Send
        </button>
      </form>
    </main>
  );
}
