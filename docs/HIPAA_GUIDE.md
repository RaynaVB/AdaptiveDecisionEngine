# HIPAA & Health Data Compliance Guide
## Veyra — Beta Assessment (March 2026)

> **Disclaimer**: This document is for informational purposes and does not constitute legal advice. Consult a qualified compliance attorney or HIPAA compliance officer before handling protected health information in a production environment.

---

## 1. Does HIPAA Apply to Veyra?

HIPAA applies to two categories of organizations:
- **Covered Entities** — healthcare providers, health plans, healthcare clearinghouses
- **Business Associates** — entities that create, receive, maintain, or transmit PHI on behalf of a covered entity

**Veyra is currently neither.** It is a direct-to-consumer wellness app with no affiliation with healthcare providers or insurers. Users submit self-reported wellness data directly; Veyra does not receive referrals from covered entities and does not transmit data to or from any covered entity.

**Conclusion: HIPAA does not directly apply to Veyra in its current form.** However:
- The **FTC Health Breach Notification Rule** likely applies, as Veyra is a Personal Health Record (PHR) application that is not covered by HIPAA.
- **State privacy laws** may apply (e.g., CCPA for California users, Illinois BIPA considerations for biometric-adjacent data).
- If Veyra ever integrates with a healthcare provider's systems, a BAA with Google and HIPAA compliance would become mandatory.

**Best practice**: Follow HIPAA-aligned technical safeguards now. The cost of doing so is low and protects users.

---

## 2. Data Classification

| Data Type | Where Stored | Sensitivity | Notes |
|---|---|---|---|
| Email address | Firebase Auth (Google) | Medium | Used for auth only; never in Firestore health data |
| Display name | Device AsyncStorage only | Low | Never transmitted to servers |
| Wellness goals | Firestore `users/{uid}` | Low | General preference data |
| Symptom history | Firestore `users/{uid}/symptoms` | **High** | Physical symptoms, severity |
| Mood / stress logs | Firestore `users/{uid}/moods` | **High** | Mental health dimensions |
| Dietary restrictions / allergies | Firestore `users/{uid}` | **High** | Medical allergy data |
| Meal photos | Processed by Gemini AI in transit | Medium | Not stored by Veyra post-processing |
| Behavioral patterns / insights | Firestore `users/{uid}/insight_generations` | Medium | Derived, not raw PHI |
| Experiment runs | Firestore `users/{uid}/experiments` | Medium | Behavioral experiment results |
| Pattern alerts | Firestore `users/{uid}/pattern_alerts` | Medium | Derived short-window signals |

---

## 3. Current Technical Safeguard Assessment

### ✅ Strengths (Already in Place)

| Safeguard | Implementation | Status |
|---|---|---|
| **Access Control** | Firestore rules restrict every subcollection to `request.auth.uid == userId` — users can only access their own data | ✅ Implemented |
| **PII / Health Data Separation** | Email and name are structurally separated from health data. Name lives in AsyncStorage only; email is in Firebase Auth, never in Firestore health collections | ✅ Implemented |
| **Encryption in Transit** | All Firebase SDK communications use TLS 1.2+ | ✅ Platform-provided |
| **Encryption at Rest** | Google Cloud Firestore uses AES-256 encryption at rest by default | ✅ Platform-provided |
| **Authentication** | Firebase Auth with email/password; `onAuthStateChanged` listener drives all screen routing | ✅ Implemented |
| **Medical Disclaimer** | Full disclaimer shown at onboarding; user must explicitly accept before proceeding | ✅ Implemented |
| **Micro-Disclaimers** | Contextual disclaimers on Insights, Recommendations, Experiments, Weekly screens | ✅ Implemented |
| **Data Deletion** | `StorageService.clearAllLogs()` deletes all user health records from Firestore + AsyncStorage caches | ✅ Implemented |
| **Audit Logging** | `logAuditAction()` records data modifications with timestamp | ✅ Implemented |
| **No Third-Party Tracking** | No analytics SDKs (Firebase Analytics inactive), no ad networks, no crash reporters with PII | ✅ Verified |
| **Privacy Policy** | Full in-app Privacy Policy screen; linked from onboarding consent and Settings > Legal | ✅ Implemented |
| **Consent at Onboarding** | Users must check "I have read and agree to the Privacy Policy and Medical Disclaimer" before proceeding | ✅ Implemented |

---

### ⚠️ Gaps and Required Actions

#### 1. Sign Google's BAA (HIGH PRIORITY if PHI is ever involved)
- **What**: A Business Associate Agreement with Google/Firebase is required before storing PHI under HIPAA.
- **Action**: Go to [Google Cloud Console HIPAA page](https://cloud.google.com/security/compliance/hipaa) and accept the BAA.
- **Current risk**: If Veyra is used in conjunction with a covered entity in the future, storing data without a BAA is a HIPAA violation.

#### 2. No In-App Account Deletion (MEDIUM PRIORITY — CCPA / GDPR required)
- **What**: Users have the right to request full deletion of their account and all associated data. `clearAllLogs()` deletes health data but the Firebase Auth account and Firestore `users/{uid}` document remain.
- **Action**: Add a "Delete Account" option in Settings that: (1) calls `clearAllLogs()`, (2) deletes the `users/{uid}` document, (3) calls `auth.currentUser.delete()`.
- **Note**: Firebase Auth account deletion requires recent authentication; prompt re-auth before proceeding.

#### 3. Admin Role Has Broad Data Access (MEDIUM PRIORITY)
- **What**: The `isAdmin()` Firestore rule function grants admin-role users read/write access to ALL user data. While operationally necessary for support, this is a significant privilege.
- **Action**:
  - Enforce MFA on all admin accounts in Firebase Console.
  - Enable Cloud Audit Logs (IAM & Admin > Audit Logs) for Firestore Data Read and Data Write.
  - Consider scoping admin access to specific fields only (not raw symptom/mood logs) using field-level Firestore rules.

#### 4. Password Strength (LOW PRIORITY)
- **What**: The current minimum is 6 characters (Firebase Auth default).
- **Action**: Enforce a minimum of 8 characters client-side. Consider adding Firebase App Check to prevent automated account creation.

#### 5. No Data Retention Policy Enforcement (LOW PRIORITY)
- **What**: The HIPAA_GUIDE notes that Firestore backups may persist. There is no automated TTL on health data beyond the 72-hour TTL on pattern alerts.
- **Action**: Document the data retention policy (already done in Privacy Policy). Consider Firestore TTL policies for old logs once the app matures.

#### 6. FTC Health Breach Notification Rule
- **What**: As a PHR application not covered by HIPAA, Veyra is subject to the FTC Health Breach Notification Rule. If a breach of user health data occurs, Veyra must notify affected users, the FTC, and (for breaches of 500+ users) prominent media outlets.
- **Action**: Establish an incident response plan that includes these notification procedures.

---

## 4. Administrative Requirements

### 4.1 Business Associate Agreement
Sign Google's BAA before this becomes relevant (covered entity integration). See [Google Cloud HIPAA page](https://cloud.google.com/security/compliance/hipaa).

### 4.2 Access Controls
- Enable **MFA** for all Firebase Console and Google Cloud Console accounts.
- Apply **Least Privilege**: only grant project access to individuals who need it.
- Rotate the Firebase Service Account key stored in GitHub Secrets periodically.

### 4.3 Cloud Audit Logging
In Google Cloud Console → IAM & Admin → Audit Logs:
- Enable **Data Read** and **Data Write** logs for Cloud Firestore.
- Enable **Admin Activity** logs for Cloud Functions.

### 4.4 Workstation Security
- All developer devices must be encrypted.
- Use strong passwords and auto-lock.
- Do not store Firebase credentials in plaintext outside of GitHub Secrets / secure vaults.

### 4.5 Incident Response Plan
Document procedures for:
1. Detecting a potential breach (Cloud Audit Logs alert → investigate)
2. Determining scope (which UIDs affected, what data accessed)
3. Notifying affected users within 60 days (FTC HBN Rule requirement)
4. Notifying the FTC (if 500+ users affected, also notify media)
5. Post-incident remediation

---

## 5. Privacy Policy Implementation

The Privacy Policy is now implemented in-app at:
- **`app/screens/PrivacyPolicyScreen.tsx`** — full-screen readable policy
- **`app/constants/legal.ts`** — `PRIVACY_POLICY_SECTIONS` and `PRIVACY_POLICY_EFFECTIVE_DATE` constants
- **Onboarding**: `OnboardingWelcomeScreen` links to the policy; users must check "I have read and agree to the Privacy Policy and Medical Disclaimer" before proceeding
- **Settings**: Settings → Legal → Privacy Policy

Key policy disclosures:
- Email stored by Firebase Auth only; not linked to health data in Firestore
- Name stored on-device only, never transmitted
- Health data (symptoms, mood, dietary) stored in Firestore, encrypted at rest
- Meal photos processed by Gemini AI in transit; not stored by Veyra
- No advertising, no analytics SDKs, no data sharing for commercial purposes
- User rights: access, correction, deletion, portability
- CCPA rights for California residents
- Contact: privacy@veyrahealth.com (update before launch)

---

## 6. Pre-Launch Compliance Checklist

| Item | Priority | Status |
|---|---|---|
| Privacy Policy in-app and linked at onboarding | HIGH | ✅ Done |
| Medical Disclaimer with explicit acceptance | HIGH | ✅ Done |
| Firestore security rules (user-scoped access) | HIGH | ✅ Done |
| PII separated from health data | HIGH | ✅ Done |
| No third-party analytics/tracking | HIGH | ✅ Done |
| Sign Google BAA | HIGH (if PHI) | ⏳ Pending |
| In-app account deletion | MEDIUM | ⏳ Pending |
| MFA on all admin Firebase accounts | MEDIUM | ⏳ Pending |
| Enable Cloud Audit Logs | MEDIUM | ⏳ Pending |
| Incident response plan documented | MEDIUM | ⏳ Pending |
| Enforce 8+ char password minimum | LOW | ⏳ Pending |
| Update Privacy Policy contact email | BEFORE LAUNCH | ⏳ Replace placeholder |
