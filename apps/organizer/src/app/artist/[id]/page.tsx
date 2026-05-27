'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { Spinner } from '@arteve/ui/components';

// Legacy route — canonical URL is /profile/[handle].
// Looks up the handle for the given id and redirects.
export default function LegacyArtistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', id)
        .single();
      router.replace(data?.handle ? `/profile/${data.handle}` : '/find');
    })();
  }, [id, router]);

  return (
    <main className="page page-narrow flex items-center justify-center">
      <Spinner />
    </main>
  );
}
