'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { Button } from '@arteve/ui/components';

type Message = {
  id: string;
  created_at: string;
  sender_id: string;
  body: string;
  application_id: string;
};

export default function ApplicationChatThread() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    if (!error && data) setMsgs(data as Message[]);
    setLoading(false);
  }

  useEffect(() => { loadMessages(); }, [applicationId]);

  useEffect(() => {
    const channel = supabase
      .channel(`application-chat-${applicationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${applicationId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [applicationId]);

  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    const stream = endRef.current?.parentElement;
    if (!stream) return;
    stream.scrollTo({
      top: stream.scrollHeight,
      behavior: didInitialScrollRef.current ? 'smooth' : 'auto',
    });
    didInitialScrollRef.current = true;
  }, [msgs]);

  async function sendMessage() {
    if (!userId || !body.trim()) return;
    const { error } = await supabase.from('messages').insert({
      application_id: applicationId,
      sender_id: userId,
      body: body.trim(),
    });
    if (!error) setBody('');
  }

  if (loading) {
    return (
      <main className="chat-shell">
        <header className="chat-header">
          <div className="skeleton h-3 w-32" />
        </header>
        <div className="chat-stream" />
      </main>
    );
  }

  let lastDateLabel = '';

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <button type="button" onClick={() => router.back()} className="chat-back-btn" aria-label="Back">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-strong">Application chat</p>
          <p className="text-xs text-ink-subtle">Talk to the organizer about your application</p>
        </div>
      </header>

      <div className="chat-stream">
        {msgs.length === 0 && (
          <div className="text-center text-sm text-ink-subtle py-12">
            No messages yet — introduce yourself.
          </div>
        )}
        {msgs.map((m) => {
          const isMine = m.sender_id === userId;
          const date = new Date(m.created_at);
          const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const showDate = dateLabel !== lastDateLabel;
          if (showDate) lastDateLabel = dateLabel;
          return (
            <Fragment key={m.id}>
              {showDate && (<div className="chat-day-divider"><span>{dateLabel}</span></div>)}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
                  {m.body}
                  <div className={isMine ? 'chat-meta-mine' : 'chat-meta-theirs'}>
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="chat-input-bar"
      >
        <input
          className="chat-input"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" disabled={!body.trim()}>Send</Button>
      </form>
    </main>
  );
}
