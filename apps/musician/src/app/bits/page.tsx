'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

type Bit = {
  id: string; video_url: string; caption: string | null; created_at: string;
};

export default function BitsPage() {
  const [rows, setRows] = useState<Bit[]>([]);

  useEffect(()=> {
    (async ()=>{
      const { data } = await supabase
        .from('bits')
        .select('id,video_url,caption,created_at')
        .order('created_at', { ascending: false })
        .limit(12);
      setRows((data as Bit[]) || []);
    })();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Bits</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rows.map(b => (
          <a key={b.id} href={`/bits/${b.id}`} className="block">
            <video className="w-full rounded-xl" src={b.video_url} muted playsInline />
            {b.caption && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{b.caption}</div>}
          </a>
        ))}
      </div>
      {rows.length === 0 && <p className="text-gray-600">No bits yet. Try creating one from the Post tab.</p>}
    </section>
  );
}
