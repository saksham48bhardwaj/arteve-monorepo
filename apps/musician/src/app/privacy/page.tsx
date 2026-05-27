import { LegalPage } from '@arteve/shared/legal/LegalPage';
import { PRIVACY_POLICY } from '@arteve/shared/legal/content';

export const metadata = { title: 'Privacy Policy · Arteve' };

export default function PrivacyPage() {
  return (
    <LegalPage
      doc={PRIVACY_POLICY}
      related={{ label: 'Terms of Use', href: '/terms' }}
    />
  );
}
