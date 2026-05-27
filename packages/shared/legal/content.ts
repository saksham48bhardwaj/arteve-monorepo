// Single source of truth for Arteve's Terms of Use and Privacy Policy.
// These are pre-launch placeholders — replace with reviewed legal copy before
// onboarding paying users. Updating here updates both apps.

export const LEGAL_LAST_UPDATED = '2026-05-27';

export interface LegalSection {
  heading: string;
  body: string[]; // each entry is one paragraph
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS_OF_USE: LegalDocument = {
  title: 'Terms of Use',
  intro:
    "Welcome to Arteve. These terms describe the rules for using the Arteve platform " +
    "(\"Arteve\", \"we\", \"us\") and our musician and organizer apps. By creating an " +
    "account or using the service you agree to be bound by these terms.",
  sections: [
    {
      heading: '1. Eligibility',
      body: [
        'You must be at least 18 years old, or the legal age of majority where you live, to use Arteve.',
        'You must provide accurate, current information when creating your account, and keep it up to date.',
      ],
    },
    {
      heading: '2. Accounts and security',
      body: [
        'You are responsible for activity that happens under your account, including any bookings, posts, or messages you send.',
        'Keep your password confidential. If you suspect your account has been compromised, change your password immediately and contact us.',
        'One person should only operate one account. Creating multiple accounts to evade limits or moderation is not allowed.',
      ],
    },
    {
      heading: '3. Content you post',
      body: [
        'You retain ownership of the media, performances, and text you post on Arteve.',
        'By posting, you grant Arteve a worldwide, non-exclusive, royalty-free license to host, display, distribute, and promote that content within the product and in related marketing.',
        'You must have the rights to everything you upload. Do not upload material you did not create unless you have permission.',
      ],
    },
    {
      heading: '4. Acceptable use',
      body: [
        'Do not use Arteve to harass, threaten, impersonate, or defraud other users.',
        'Do not upload content that is unlawful, hateful, sexually explicit involving minors, or that infringes intellectual property.',
        'Do not interfere with the operation of the platform, including scraping, reverse engineering, or attempting to bypass rate limits.',
      ],
    },
    {
      heading: '5. Bookings and payments',
      body: [
        'Arteve facilitates connections between musicians and organizers but is not a party to bookings made between them, unless explicitly stated.',
        'When payments are introduced, they will be handled by a third-party processor under separate terms which you will accept at that time.',
      ],
    },
    {
      heading: '6. Termination',
      body: [
        'You may delete your account at any time from the Account settings page. Deletion is permanent.',
        'We may suspend or terminate accounts that violate these terms, or where required by law.',
      ],
    },
    {
      heading: '7. Disclaimer and limitation of liability',
      body: [
        'Arteve is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Arteve and its team are not liable for indirect or consequential damages arising from use of the service.',
      ],
    },
    {
      heading: '8. Changes to these terms',
      body: [
        'We may update these terms from time to time. We will notify users of material changes by email or in-product notice before they take effect.',
      ],
    },
    {
      heading: '9. Contact',
      body: [
        'Questions about these terms can be sent to hello@arteve.app.',
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  intro:
    "This policy explains what information Arteve collects, how we use it, and the " +
    "controls you have. We collect only what we need to run the product and to keep " +
    "your account safe.",
  sections: [
    {
      heading: '1. Information we collect',
      body: [
        'Account information you provide: email address, display name, handle, profile bio, location, links, and uploaded media.',
        'Activity information: posts, bits, applications, bookings, messages, follows, likes, comments, and notification preferences.',
        'Technical information: IP address, device type, browser, and basic usage metrics needed to keep the service running and secure.',
      ],
    },
    {
      heading: '2. How we use it',
      body: [
        'To provide and improve the product — show your profile to people who would book you, deliver messages, send notifications.',
        'To keep the platform safe — prevent fraud, abuse, and spam.',
        'To communicate with you about your account, bookings, and important changes to the service.',
      ],
    },
    {
      heading: '3. Sharing',
      body: [
        'Profile information you have made public is visible to other Arteve users so they can find and book you.',
        'We use trusted infrastructure providers (Supabase for data storage and authentication, Vercel for hosting) which process your data on our behalf under their own privacy commitments.',
        'We do not sell your personal information.',
      ],
    },
    {
      heading: '4. Cookies and storage',
      body: [
        'Arteve uses cookies and local browser storage only as needed to keep you signed in and to remember your preferences. We do not use third-party advertising cookies.',
      ],
    },
    {
      heading: '5. Your controls',
      body: [
        'You can edit or delete most of your profile information from the Profile page at any time.',
        'You can change your password and email, and delete your account, from the Account settings page.',
        'When you delete your account we remove or anonymize your personal information, except where retention is required by law.',
      ],
    },
    {
      heading: '6. Data security',
      body: [
        'We use industry-standard practices to protect your data, including encryption in transit, row-level security in the database, and regular audits.',
      ],
    },
    {
      heading: '7. Children',
      body: [
        'Arteve is not directed to children under 16. If you become aware that a child has provided us with personal information, please contact us so we can delete it.',
      ],
    },
    {
      heading: '8. Changes',
      body: [
        'We will post updates to this policy on this page and update the "Last updated" date. Material changes will be communicated by email or in-product notice.',
      ],
    },
    {
      heading: '9. Contact',
      body: [
        'For privacy questions or requests, contact privacy@arteve.app.',
      ],
    },
  ],
};
