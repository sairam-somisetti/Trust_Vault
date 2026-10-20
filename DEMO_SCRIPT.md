# 5-Minute Demo Video & Interview Walkthrough Script

This script provides an exact 5-minute storyboard for recording the evaluation video demo and preparing for the live candidate interview.

---

## 5-Minute Demo Video Storyboard

### [0:00 - 0:45] Intro & Architectural Overview
- **Visual**: Open TrustVault homepage, showing the top posture badges (Central Choke Point, Cryptographic Audit Ledger, Instant Revocation).
- **Narration**:
  > *"Welcome to TrustVault. TrustVault was built on the core principle that a document platform that leaks is not a partially working document platform. Our architecture solves the two classic failure modes in enterprise sharing: permission creep and the inability to prove who accessed what afterwards."*

### [0:45 - 1:45] Persona Walkthrough & Separation of Roles
- **Visual**: Log in as `owner@trustvault.local`. Show confidential document `Executive_Salaries_2026.pdf`.
- **Narration**:
  > *"Here I am logged in as Sarah, the document owner. Notice she has exclusive access to her executive payroll documents. Let's switch to John (`viewer@trustvault.local`)."*
- **Visual**: Click the 1-click switcher to `viewer@trustvault.local`. Search for `Executive_Salaries_2026`.
- **Narration**:
  > *"Notice that John sees zero results. The query filters at the database level: no titles, metadata, or hit counts are leaked."*
- **Visual**: Switch to `admin@trustvault.local`. Attempt to open the confidential salary document.
- **Narration**:
  > *"Even the Administrator role cannot read private employee salaries without an explicit grant. Least-privilege separation of duties is strictly enforced."*

### [1:45 - 2:45] Granting Access & Proving Instant Revocation (0ms Lag)
- **Visual**: Switch back to Sarah (`owner@trustvault.local`). Open the **Manage Access** modal for `Executive_Salaries_2026.pdf`.
- **Action**: Grant `READ` access to `viewer@trustvault.local`.
- **Visual**: Switch to John (`viewer@trustvault.local`). The document appears. Click **Download**. Decrypted PDF opens.
- **Action**: Switch back to Sarah. Click **Revoke Access** on John.
- **Action**: Switch immediately to John and click **Download** again.
- **Visual**: HTTP 403 Forbidden is displayed instantly.
- **Narration**:
  > *"Notice what happened here: taking access away worked immediately. Because we rejected presigned URLs and stale token claims, every request checks real-time database grants at the exact millisecond of the stream."*

### [2:45 - 3:45] The Cryptographic Audit Trail & Tamper Evidence
- **Visual**: Switch to `admin@trustvault.local` and click the **Admin Audit & Compliance** tab.
- **Narration**:
  > *"Here is the audit ledger. Notice that every action is logged: uploads, downloads, grant creations, grant revocations, and crucially, the denied attempts we just triggered."*
- **Visual**: Click **Verify Cryptographic Integrity**. The green badge confirms mathematical chain integrity across all records.
- **Narration**:
  > *"Every row is cryptographically chained using SHA-256 to the previous hash. If an insider or DBA edits a single row in the database, the hash verification engine flags the exact broken record ID immediately."*

### [3:45 - 4:30] AI Advisor with Human-in-the-Loop Guardrail
- **Visual**: Switch to Sarah (`owner@trustvault.local`). Click the **AI Advisor** sparkles button on a legal document.
- **Narration**:
  > *"Our AI analyzes document categories and suggests relevant team members. But notice the invariant: the machine cannot widen access autonomously. Sarah must inspect each suggestion and click Approve. Both the AI's recommendation and Sarah's human decision are recorded in the cryptographic audit ledger."*

### [4:30 - 5:00] Automated Tests & Defensibility Wrap-up
- **Visual**: Open terminal. Run `npm test`. Show all 15 security and authorization tests passing in sub-seconds.
- **Narration**:
  > *"Our test suite verifies every threat identified in THREATS.md. Let's look at the interview defense point next."*

---

## The Live Interview Defense Guide

During the interview, the judges will ask:
> *"Where is the authorisation decision made when someone downloads a file, and what would happen if that line were removed?"*

### Your Exact Answer:
1. **Show the file**: Open `backend/src/middleware/authorizeDocument.ts`.
2. **Point to the line**: Lines 78–110 in `authorizeDocumentAccess(req, documentId, 'READ')`:
   ```typescript
   const grant = await prisma.documentGrant.findUnique({
     where: { documentId_userId: { documentId, userId: actor.id } },
   });
   if (!grant) {
     await AuditService.log({ ... action: 'ACCESS_DENIED', status: 'DENIED' });
     throw new AuthorizationError('Access Denied', 403);
   }
   ```
3. **Explain what happens if removed**:
   > *"If line 92 (`if (!grant) throw new AuthorizationError(...)`) is removed or commented out, an ungranted user would bypass the check and proceed to the decryption stream. However, our automated tests immediately catch this: running `npm test` will fail Suite 1 (Negative Access Control) and Suite 2 (Instant Revocation Guarantee). The test suite guarantees that authorization is strictly verified on every access attempt."*
