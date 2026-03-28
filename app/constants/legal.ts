export const MEDICAL_DISCLAIMER_FULL = `This application provides general wellness insights based on user-reported data. It is not intended to diagnose, treat, cure, or prevent any medical condition.

The information and recommendations provided by this app are for informational and educational purposes only and should not be considered medical advice.

Always consult with a qualified healthcare professional before making any decisions related to your health, diet, or treatment.

If you are experiencing severe or persistent symptoms, seek medical attention immediately.`;

export const MICRO_DISCLAIMER_INSIGHTS = "Insights are based on your logged data and may not reflect clinical conclusions.";
export const MICRO_DISCLAIMER_RECOMMENDATIONS = "Based on your recent data patterns.";
export const MICRO_DISCLAIMER_EXPERIMENTS = "This experiment is designed to help you observe how your body responds to certain changes. It is not a medical treatment or diagnosis.";
export const MICRO_DISCLAIMER_WEEKLY = "Insights are based on your logged data and patterns.";

export const PRIVACY_POLICY_EFFECTIVE_DATE = "March 28, 2026";

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "1. Introduction",
    body: `Veyra ("we," "us," "our") is a personal wellness app that helps you understand how food affects your body. This Privacy Policy explains what information we collect, why we collect it, how it is stored and protected, and the rights you have over your data.\n\nBy using Veyra, you agree to the collection and use of information as described in this policy.`,
  },
  {
    title: "2. Information We Collect",
    body: `Account Information: When you create an account, we collect your email address through Firebase Authentication. This is used solely for account access and recovery.\n\nWellness & Health Data (voluntary): To provide personalized insights, you may provide wellness goals, symptoms you experience (e.g., bloating, fatigue, headaches), dietary information (allergies, preferences, sensitivities, foods to avoid), symptom frequency, meal logs (text or photos), mood and energy check-ins, and physical symptom logs.\n\nDevice-Local Data: Your display name is stored only on your device using AsyncStorage and is never transmitted to our servers.\n\nApp Usage: We do not collect analytics, advertising identifiers, crash reports, or behavioral telemetry beyond what is necessary to operate core features.`,
  },
  {
    title: "3. How We Use Your Information",
    body: `• Account Management: Your email authenticates your account.\n• Personalized Insights: Health data is analyzed to detect behavioral patterns and generate wellness insights.\n• Experiment Analysis: Meal, mood, and symptom logs are compared across time windows to measure the effects of behavioral experiments you choose to run.\n• Recommendations: Detected patterns are used to suggest personalized wellness interventions.\n• AI-Powered Meal Analysis: Meal photos and descriptions are sent to Google Gemini AI for real-time ingredient extraction. Images are processed in transit and are not permanently stored by Veyra.\n\nWe do not sell, rent, or share your personal information with third parties for advertising or marketing.`,
  },
  {
    title: "4. How Your Data Is Stored & Protected",
    body: `Authentication: Email credentials are managed by Firebase Authentication (Google LLC) using industry-standard security.\n\nHealth Data: Your wellness data is stored in Google Cloud Firestore, encrypted in transit (TLS 1.2+) and at rest (AES-256). Firestore security rules ensure only you can read or write your own data — no other user, including Veyra administrators, can access your health records without your account credentials.\n\nLocal Storage: Your name and app preferences are stored on-device (AsyncStorage) only.\n\nMeal Image Processing: Photos submitted for meal analysis are transmitted securely to Google Gemini AI and are not retained after processing.`,
  },
  {
    title: "5. Third-Party Services",
    body: `Veyra uses the following services to operate:\n\n• Firebase Authentication (Google LLC) — account login & security\n• Cloud Firestore (Google LLC) — health data storage\n• Cloud Functions (Google LLC) — AI analysis & pattern detection\n• Gemini AI (Google LLC) — meal ingredient extraction from photos\n\nAll services are operated by Google LLC. Google's Privacy Policy applies: https://policies.google.com/privacy\n\nNo other third-party SDKs for advertising, analytics, or tracking are present in the app.`,
  },
  {
    title: "6. HIPAA Notice",
    body: `Veyra is a general wellness application and is not a HIPAA-covered entity. It does not provide medical services, clinical care, or health insurance. The information you enter is self-reported wellness data — not Protected Health Information (PHI) as defined under HIPAA.\n\nWe follow HIPAA-aligned technical safeguards as best practice:\n• Your data is scoped exclusively to your user account\n• PII (email, name) is structurally separated from health data\n• Encryption in transit and at rest on all stored data\n• No third-party data sharing for commercial purposes`,
  },
  {
    title: "7. Your Rights",
    body: `You have the right to:\n\n• Access: View all data you've entered at any time within the app.\n• Correction: Update your profile and health preferences at any time via Settings.\n• Deletion: Delete all logged health data via Settings. To delete your account and all associated data, contact us at the address below.\n• Portability: Contact us to request an export of your data.\n\nCalifornia residents may have additional rights under the California Consumer Privacy Act (CCPA). Contact us to exercise these rights.`,
  },
  {
    title: "8. Data Retention",
    body: `Your health data is retained as long as your account is active. Logged events (meals, moods, symptoms) can be deleted at any time from within the app. Firestore backups managed by Google may persist for a short additional period per Google's standard retention policy.\n\nIf you delete your account, we will remove all associated Firestore data within 30 days of your request.`,
  },
  {
    title: "9. Children's Privacy",
    body: `Veyra is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information through our app, please contact us immediately and we will remove it promptly.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy as the app evolves. When we do, we will update the effective date at the top. We encourage you to review this policy periodically. Continued use of the app after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: "11. Contact Us",
    body: `If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:\n\nprivacy@veyrahealth.com\n\nVeyra Health\nUnited States`,
  },
];
