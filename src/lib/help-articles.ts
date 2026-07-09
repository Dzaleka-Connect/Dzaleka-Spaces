export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "provider-guide",
    title: "Provider guide: using the system well",
    summary:
      "A step-by-step guide for space providers — from listing to verification, enquiries, occupancy and payments.",
    sections: [
      {
        heading: "1. Create your account",
        body: "Sign in with your email — you get a one-time link, so there's no password to lose. Your name is shown to people you deal with and on your published listings; add a phone or WhatsApp number in Account → Profile so enquiries can reach you. No smartphone? Ask for an assisted listing and a field representative will do the visit and set-up with you.",
      },
      {
        heading: "2. Submit a space",
        body: "Open 'List a space'. Describe the space honestly, choose its category and zone, add a nearby landmark (only the zone and landmark are shown publicly — never the exact location), set a fair price and deposit, and tick the facilities that are really there. You must state your authority to offer the space — how you came to manage it. This is checked in person and never shown publicly; it never claims ownership.",
      },
      {
        heading: "3. Get verified",
        body: "After you submit, a field representative arranges a visit to confirm the space exists, that photographs match, the facilities and price are right, and your authority to offer it. A separate reviewer then approves and publishes it — the person who visits never publishes their own visit. Track where each listing sits in Provider → Verifications. Keep your listing accurate; a re-check date is set and stale listings are paused.",
      },
      {
        heading: "4. Handle enquiries and viewings",
        body: "Enquiries appear in Provider → Enquiries. Reply through the channel the person asked for, and offer a viewing time. Only share directions once a viewing is confirmed. Never ask anyone to pay before they have seen the space — it breaks the rules and loses trust.",
      },
      {
        heading: "5. Record the arrangement",
        body: "When someone takes the space, create an occupancy record (Provider → Occupancies). It captures the amount, deposit, start date, notice period and any conditions, and both sides confirm it — so there is one shared, written record. This documents the arrangement; it does not create or transfer ownership.",
      },
      {
        heading: "6. Record payments and give receipts",
        body: "During the pilot the platform records payments — it never holds your money. Log each payment (cash, Airtel Money, TNM Mpamba or a DzalekaPay reference) against the occupancy and issue a receipt. Both sides then see the same history, which prevents most disputes.",
      },
      {
        heading: "Getting the most from it",
        body: "Add clear photos and an honest description — verified, well-described spaces get far more enquiries. Keep availability up to date so you are not chasing people for a space that is taken. Invite trusted helpers through Provider → Team with only the permissions they need. And use the Report button if anyone behaves badly; reports are confidential.",
      },
    ],
  },
  {
    slug: "searching",
    title: "Searching for a space",
    summary: "Find spaces by zone, landmark, category, budget and facilities.",
    sections: [
      {
        heading: "Browsing without an account",
        body: "You never need an account to search. Open Browse spaces and filter by zone, category, budget or facilities. Every card shows the zone, a nearby landmark, the amount and whether the space has been verified in person.",
      },
      {
        heading: "Understanding locations",
        body: "Public listings show only the zone and a nearby landmark — never an exact location. Exact directions are shared by the provider after a viewing is arranged. This protects households and providers.",
      },
      {
        heading: "Saving spaces and searches",
        body: "With a free account you can save spaces to compare later and save a search with your filters. Saved searches can alert you when a matching space is published.",
      },
    ],
  },
  {
    slug: "listing",
    title: "Listing a space",
    summary: "Who may list, what is checked, and what is not allowed.",
    sections: [
      {
        heading: "Who may list",
        body: "Anyone who currently manages a space or is authorised to offer it: venue operators, organisation managers, family representatives and authorised agents. You state this basis when submitting; a field representative checks it during the verification visit. It is never shown publicly and never establishes ownership.",
      },
      {
        heading: "The verification visit",
        body: "Nothing is published until a field representative has visited the space and a separate reviewer has approved the listing. The visit confirms the space exists, the photographs match, the price is as advertised and your stated authority to offer it.",
      },
      {
        heading: "What is not allowed",
        body: "Land sales, shelter sales presented as ownership, listings for spaces you are not authorised to offer, and discriminatory conditions are prohibited and removed. Residential room listings open later under a separately approved pilot.",
      },
      {
        heading: "Assisted listings",
        body: "No smartphone? Request an assisted listing and a field representative will visit, photograph the space and prepare the listing with you for an agreed fee.",
      },
    ],
  },
  {
    slug: "viewings",
    title: "Viewings",
    summary: "Requesting, confirming and attending a viewing safely.",
    sections: [
      {
        heading: "Requesting a viewing",
        body: "Send an enquiry from the listing page and ask for a viewing time. The provider confirms or suggests another time. Once confirmed, directions are shared.",
      },
      {
        heading: "Viewing safely",
        body: "Always view before paying anything. Dzaleka Spaces never charges for viewings, and no legitimate provider asks for money to show a space. If possible, bring someone with you and tell someone where you are going.",
      },
      {
        heading: "After the viewing",
        body: "If you agree to take the space, ask the provider to create an occupancy record so both of you hold the same written terms — amount, deposit, start date and notice period.",
      },
    ],
  },
  {
    slug: "verification",
    title: "Verification",
    summary: "Exactly what the Verified badge does and does not mean.",
    sections: [
      {
        heading: "What we check",
        body: "A field representative visits in person and confirms the space exists, photographs match, facilities are as advertised, the price and deposit are as stated, and the provider showed evidence of their authority to offer the space.",
      },
      {
        heading: "What we do not check",
        body: "Verification never confirms legal ownership of land or property, a land title, approval to sell a structure, or government registration. Nobody can sell camp land or issue ownership certificates through this platform.",
      },
      {
        heading: "Reporting inaccurate listings",
        body: "If a verified listing no longer matches reality, use the report function on the listing page. Reports are confidential and reviewed by moderation staff.",
      },
    ],
  },
  {
    slug: "payments",
    title: "Payments and receipts",
    summary: "How the payment record works during the pilot.",
    sections: [
      {
        heading: "Dzaleka Spaces never holds money",
        body: "During the pilot the platform records payments — it does not process or hold them. You pay the provider directly by cash, Airtel Money, TNM Mpamba or a DzalekaPay reference, and the payment is recorded against your occupancy so both sides see the same history.",
      },
      {
        heading: "Receipts",
        body: "Every recorded payment can produce a receipt. Ask for one every time you pay; a provider who refuses receipts should be reported.",
      },
      {
        heading: "Deposits",
        body: "Deposits are recorded, not held, by the platform. Never pay a deposit before viewing the space, and make sure the deposit amount is written in your occupancy record.",
      },
    ],
  },
  {
    slug: "account",
    title: "Your account and privacy",
    summary: "Sign-in, your data, and what is shared.",
    sections: [
      {
        heading: "Signing in",
        body: "You can sign in with email and password, or request a one-time magic link. Creating an account on /register sets a password; magic links still work afterward if you prefer not to type it.",
      },
      {
        heading: "What others can see",
        body: "Your name is shown to providers you contact and appears as the provider name on your own published listings. Your contact details are only shared when you send them in an enquiry. Identity documents are never requested by the platform and should never be handed over as a rental condition.",
      },
      {
        heading: "Your data rights",
        body: "Malawi's Data Protection Act 2024 applies. You can ask for your information to be corrected or deleted by contacting support; some records (such as confirmed occupancy history) may be retained where rules require it.",
      },
    ],
  },
];

export function getHelpArticle(slug: string): HelpArticle | null {
  return HELP_ARTICLES.find((a) => a.slug === slug) ?? null;
}
