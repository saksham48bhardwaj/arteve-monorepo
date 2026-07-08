'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import {
  Page,
  PageHeader,
  EmptyState,
  Button,
  Avatar,
  Skeleton,
  usePullToRefresh,
  PullToRefreshIndicator,
} from '@arteve/ui/components';

type OtherProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
};

type LastMsg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  read_at: string | null;
};

type ConvoItem = {
  conversationId: string;
  other: OtherProfile | null;
  last: LastMsg | null;
  unread: number;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 1 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function OrganizerChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ConvoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // 1. Conversations I'm part of
    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);
    const convoIds = Array.from(new Set((myParts ?? []).map((p) => p.conversation_id)));
    if (convoIds.length === 0) { setItems([]); setLoading(false); return; }

    // 2. The other participant in each conversation
    const { data: otherParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convoIds)
      .neq('user_id', user.id);

    const otherIds = Array.from(new Set((otherParts ?? []).map((p) => p.user_id)));
    const { data: profs } = otherIds.length
      ? await supabase
          .from('profiles')
          .select('id, display_name, handle, avatar_url')
          .in('id', otherIds)
      : { data: [] as OtherProfile[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p as OtherProfile]));

    // 3. Messages across those conversations (newest first)
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false });

    const list: ConvoItem[] = convoIds
      .map((cid) => {
        const other = (otherParts ?? []).find((p) => p.conversation_id === cid);
        const convoMsgs = (msgs ?? []).filter((m) => m.conversation_id === cid);
        const unread = convoMsgs.filter((m) => m.sender_id !== user.id && !m.read_at).length;
        return {
          conversationId: cid,
          other: other ? profMap.get(other.user_id) ?? null : null,
          last: (convoMsgs[0] as LastMsg) ?? null,
          unread,
        };
      })
      // Only surface conversations that have actually been used, newest first
      .filter((c) => c.last !== null)
      .sort((a, b) => new Date(b.last!.created_at).getTime() - new Date(a.last!.created_at).getTime());

    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: any new/updated message refreshes the inbox ordering + unread.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-list-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const pull = usePullToRefresh({ onRefresh: load });

  return (
    <Page>
      <PullToRefreshIndicator {...pull} />
      <PageHeader
        title="Messages"
        subtitle="Your conversations with artists, venues and organizers."
        actions={
          <Link href="/find" className="btn btn-outline btn-sm">
            New message
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card card-padded flex items-center gap-3">
              <Skeleton shape="circle" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <Skeleton width="40%" height={12} />
                <Skeleton width="65%" height={10} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
            </svg>
          }
          title="No conversations yet"
          description="Message someone from their profile, or apply to a gig — your chats will show up here."
          action={
            <Link href="/find">
              <Button>Find people</Button>
            </Link>
          }
        />
      ) : (
        <ul className="card divide-y divide-line p-0 overflow-hidden">
          {items.map((c) => {
            const name = c.other?.display_name || (c.other?.handle ? `@${c.other.handle}` : 'Conversation');
            return (
              <li key={c.conversationId}>
                <Link
                  href={`/chat/${c.conversationId}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-sunken transition"
                >
                  <Avatar src={c.other?.avatar_url} alt={name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm text-ink-strong ${c.unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                        {name}
                      </p>
                      {c.last && (
                        <span className="text-[11px] text-ink-subtle shrink-0">{formatTime(c.last.created_at)}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${c.unread > 0 ? 'text-ink font-medium' : 'text-ink-subtle'}`}>
                        {c.last?.content ?? 'No messages yet'}
                      </p>
                      {c.unread > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white shrink-0">
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
