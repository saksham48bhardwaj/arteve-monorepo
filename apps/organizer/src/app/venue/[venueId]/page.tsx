'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { Spinner } from '@arteve/ui/components';

// Legacy route — canonical URL is /profile/[handle].
export default function LegacyVenuePage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params?.venueId as string | undefined;

  useEffect(() => {
    if (!venueId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', venueId)
        .single();
      router.replace(data?.handle ? `/profile/${data.handle}` : '/find');
    })();
  }, [venueId, router]);

  return (
    <main className="page page-narrow flex items-center justify-center">
      <Spinner />
    </main>
  );
}
