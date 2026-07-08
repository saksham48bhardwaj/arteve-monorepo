'use client';

import { supabase } from '@arteve/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@arteve/ui/components';

export default function LogoutButton({
  className,
  variant = 'outline',
  size = 'sm',
  ...rest
}: Omit<ButtonProps, 'onClick' | 'children'> & { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut({ scope: 'local' }); // default 'global' would kill sessions on the other Arteve app + all devices
      router.push('/login');
    } catch (err) {
      console.error('SIGN OUT ERROR:', err);
    }
  }

  return (
    <Button
      onClick={handleSignOut}
      variant={variant}
      size={size}
      className={className}
      {...rest}
    >
      Sign out
    </Button>
  );
}
