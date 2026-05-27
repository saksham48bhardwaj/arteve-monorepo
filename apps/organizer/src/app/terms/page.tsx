import { LegalPage } from '@arteve/shared/legal/LegalPage';
import { TERMS_OF_USE } from '@arteve/shared/legal/content';

export const metadata = { title: 'Terms of Use · Arteve' };

export default function TermsPage() {
  return (
    <LegalPage
      doc={TERMS_OF_USE}
      related={{ label: 'Privacy Policy', href: '/privacy' }}
    />
  );
}
