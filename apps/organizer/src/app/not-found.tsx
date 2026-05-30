import Link from 'next/link';
import { Button } from '@arteve/ui/components';

export default function NotFound() {
  return (
    <main className="page page-narrow flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-[64px] leading-none font-display tracking-tight text-ink-strong">
        404
      </div>
      <h1 className="page-title mt-3">Page not found</h1>
      <p className="text-ink-muted mt-2 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button>Go home</Button>
        </Link>
        <Link href="/find">
          <Button variant="ghost">Find artists</Button>
        </Link>
      </div>
    </main>
  );
}
