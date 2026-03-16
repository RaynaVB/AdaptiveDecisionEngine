# HIPAA Administrative Requirements Guide

Implementing technical safeguards is only part of HIPAA compliance. You must also address administrative and physical requirements.

## 1. Business Associate Agreement (BAA)
**Action Required**: You must sign a BAA with Google Cloud/Firebase.
- Go to the [Google Cloud Console HIPAA Compliance page](https://cloud.google.com/security/compliance/hipaa).
- Follow the instructions to review and accept the BAA. PHI should not be stored until this is done.

## 2. Access Controls
- **MFA**: Enable Multi-Factor Authentication for all accounts with access to the Firebase Console or Google Cloud project.
- **Least Privilege**: Only grant project access to individuals who strictly need it for their role.

## 3. Audit Logging (GCP Level)
While the application now logs actions at the DB level, you should enable comprehensive Cloud Audit Logs:
- In Google Cloud Console, go to **IAM & Admin > Audit Logs**.
- Enable "Data Read" and "Data Write" logs for Cloud Firestore and Cloud Storage.

## 4. Workstation and Device Security
- Ensure all developer devices are encrypted.
- Use strong passwords and auto-lock features.

## 5. Data Retention and Disposal
- Establish a policy for how long PHI is kept and how it is securely deleted when no longer needed.
- Note that `clearAllLogs()` in the app deletes documents, but Firestore backups may persist for a limited time.

## 6. Incident Response
- Have a plan in place to handle potential data breaches, including notification procedures required by law.

> [!NOTE]
> This guide is for informational purposes and does not constitute legal advice. Consult with a compliance professional for a full audit.
