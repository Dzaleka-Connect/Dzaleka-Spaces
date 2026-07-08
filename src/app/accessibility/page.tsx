import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Accessibility",
};

export default function AccessibilityPage() {
  return (
    <ContentPage
      title="Accessibility"
      intro="Dzaleka Spaces is built mobile-first for low-cost devices, expensive data and users with different abilities."
      sections={[
        {
          heading: "Finding accessible spaces",
          body: "Listings carry a wheelchair-accessible facility tag, checked during the field visit like every other facility. Use the facilities filter on the browse page, and ask in your enquiry about specific needs — step-free entry, door widths or toilet access.",
        },
        {
          heading: "Using the platform",
          items: [
            "Works on low-cost Android phones and slow connections; pages stay light",
            "Public pages are readable without signing in",
            "Keyboard navigation and screen-reader labels on interactive controls",
            "No auto-playing video; images are compressed for expensive data",
            "Support available by phone, WhatsApp and in person for anyone who cannot use the app",
          ],
        },
        {
          heading: "Assisted access",
          body: "The Dzaleka Online Services desk can search, enquire, list and record arrangements on your behalf, and assisted listings bring a field representative to you. Telephone support covers the same tasks.",
        },
        {
          heading: "Tell us what is missing",
          body: "If any part of the platform is hard to use with your device or assistive technology, report it through the Contact page — accessibility fixes are prioritised alongside safety issues.",
        },
      ]}
    />
  );
}
