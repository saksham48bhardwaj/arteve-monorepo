'use client';

import { useEffect, useState } from 'react';
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

export default function ApplicationChatPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const applicationId = params.applicationId;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // TODO: integrate your existing chat messages hook / component here
  // const { messages, sendMessage } = useApplicationChat(applicationId);

  useEffect(() => {
    async function loadApplication() {
      setLoading(true);

      const { data, error } = await supabase
        .from('applications')
        .select('id, status, message, gig_id, musician_id, organizer_id')
        .eq('id', applicationId)
        .single();

      if (error) {
        console.error('Error loading application', error);
        setErrorMsg('Failed to load application');
        setLoading(false);
        return;
      }

      setApplication(data as Application);
      setLoading(false);
    }

    if (applicationId) loadApplication();
  }, [applicationId]);

  const handleAccept = async () => {
    if (!application || application.status === 'accepted') return;
    setActionLoading(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', application.id);

    if (error) {
      console.error('Failed to accept application', error);
      setErrorMsg('Failed to accept application');
      setActionLoading(false);
      return;
    }

    // notify musician
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

    // redirect to booking flow
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
      console.error('Failed to decline application', error);
      setErrorMsg('Failed to decline application');
      setActionLoading(false);
      return;
    }

    // notify musician
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

  if (loading) {
    return <div className="p-4">Loading application…</div>;
  }

  if (!application) {
    return <div className="p-4">Application not found.</div>;
  }

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

      {/* Chat area (placeholder for your existing chat component) */}
      <div className="flex-1 p-4 overflow-y-auto border-b">
        {/* Replace this block with your real chat UI */}
        <p className="text-sm text-gray-500">
          Chat messages go here (integrate with your existing chat system).
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="px-4 py-2 text-sm text-red-600">{errorMsg}</div>
      )}

      {/* Actions */}
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
    status === 'pending'
      ? 'Pending'
      : status === 'accepted'
      ? 'Accepted'
      : status === 'declined'
      ? 'Declined'
      : status;

  const colorClasses =
    status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : status === 'accepted'
      ? 'bg-green-100 text-green-800'
      : status === 'declined'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colorClasses}`}>
      {label}
    </span>
  );
}
