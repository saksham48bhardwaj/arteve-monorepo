'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setMsg(null);

  try {

    if (mode === 'signup') {
      // 1️⃣ create user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      // 2️⃣ immediately sign them in (signUp doesn't always start a session)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    }

    // 3️⃣ verify we have a session and cookie is written
    const { data } = await supabase.auth.getSession();
    console.log('SESSION AFTER LOGIN →', data.session);

    router.push('/profile');
  } catch (err: unknown) {
    setMsg(err instanceof Error ? err.message : 'Something went wrong');
  } finally {
    setLoading(false);
  }
}


  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Log in / Sign up</h1>
      <div className="flex gap-2">
        <button className={`px-3 py-1 border ${mode==='signup'?'bg-black text-white':''}`} onClick={()=>setMode('signup')}>Sign up</button>
        <button className={`px-3 py-1 border ${mode==='signin'?'bg-black text-white':''}`} onClick={()=>setMode('signin')}>Sign in</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border p-2" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} className="px-4 py-2 border">{loading? 'Please wait…' : (mode==='signup'?'Create account':'Sign in')}</button>
      </form>
      {msg && <p className="text-red-600">{msg}</p>}
    </main>
  );
}
