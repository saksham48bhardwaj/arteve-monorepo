'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { sendNotification } from '@arteve/shared/notifications';

type Application = {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | string;
  message: string | null;
  gig_id: string;
  musician_id: string;
  organizer_id: string;
};

type Message = {
  id: string;
  created_at: string;
  sender_id: string;
  body: string;
  application_id: string;
};

export default function ApplicationChatPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const applicationId = params.applicationId;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chat state
  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Load application + user + messages
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, status, message, gig_id, musician_id, organizer_id')
        .eq('id', applicationId)
        .single();

      if (appError) {
        setErrorMsg('Failed to load application');
        setLoading(false);
        return;
      }

      setApplication(appData as Application);

      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      setMsgs((msgData ?? []) as Message[]);
      setLoading(false);
    }

    if (applicationId) load();
  }, [applicationId]);

  // Realtime subscription
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

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleAccept = async () => {
    if (!application || application.status === 'accepted') return;
    setActionLoading(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', application.id);

    if (error) {
      setErrorMsg('Failed to accept application');
      setActionLoading(false);
      return;
    }

    try {
      await sendNotification({
        userId: application.musician_id,
        type: 'application_accepted',
        data: {
          application_id: application.id,
          gig_id: application.gig_id,
        },
      });
    } catch (err) {
      console.error('Failed to send notification', err);
    }

    setApplication({ ...application, status: 'accepted' });
    setActionLoading(false);
    router.push(`/book/${application.musician_id}?gigId=${application.gig_id}`);
  };

  const handleDecline = async () => {
    if (!application || application.status === 'declined') return;
    setActionLoading(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from('applications')
      .update({ status: 'declined' })
      .eq('id', application.id);

    if (error) {
      setErrorMsg('Failed to decline application');
      setActionLoading(false);
      return;
    }

    try {
      await sendNotification({
        userId: application.musician_id,
        type: 'application_declined',
        data: {
          application_id: application.id,
          gig_id: application.gig_id,
        },
      });
    } catch (err) {
      console.error('Failed to send notification', err);
    }

    setApplication({ ...application, status: 'declined' });
    setActionLoading(false);
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (!application) return <div className="p-4">Application not found.</div>;

  const isPending = application.status === 'pending';

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">Application Chat</h1>
          <p className="text-xs text-gray-500">Application ID: {application.id}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 border-b">
        {msgs.map((m) => {
          const isMine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Message input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="flex gap-2 px-4 py-3 border-b"
      >
        <input
          className="flex-1 border rounded-full px-3 py-2 text-sm"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 border rounded-full bg-blue-600 text-white text-sm"
        >
          Send
        </button>
      </form>

      {/* Error */}
      {errorMsg && (
        <div className="px-4 py-2 text-sm text-red-600">{errorMsg}</div>
      )}

      {/* Accept / Decline actions */}
      <div className="p-4 flex items-center justify-between gap-3 border-t bg-white">
        <button
          onClick={handleDecline}
          disabled={!isPending || actionLoading}
          className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          disabled={!isPending || actionLoading}
          className="flex-1 rounded-lg px-3 py-2 text-sm text-white bg-black disabled:opacity-50"
        >
          {actionLoading && isPending ? 'Processing…' : 'Accept & Create Booking'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const label =
    status === 'pending' ? 'Pending'
    : status === 'accepted' ? 'Accepted'
    : status === 'declined' ? 'Declined'
    : status;

  const colorClasses =
    status === 'pending' ? 'bg-yellow-100 text-yellow-800'
    : status === 'accepted' ? 'bg-green-100 text-green-800'
    : status === 'declined' ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-800';

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colorClasses}`}>
      {label}
    </span>
  );
}
