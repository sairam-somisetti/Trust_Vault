# TrustVault Engineering Write-up

## 1. What We Built

TrustVault is a zero-trust, security-first document management platform engineered around the core premise that **a document platform that leaks is not a partially working document platform**.

Key technical pillars built:
1. **The Central Authorization Choke Point**:
   All document content access, streaming, metadata, and grant operations funnel through `authorizeDocumentAccess(req, docId, action)`. There is zero client-side trust.
2. **Instant Revocation Engine (0-Millisecond Latency)**:
   We deliberately eliminated presigned URLs and stateless permission claims. Every single download request checks real-time database grants at the exact millisecond byte streaming begins.
3. **Cryptographically Chained Audit Ledger (SHA-256 Merkle-Chaining)**:
   Every upload, download, permission change, and—crucially—**denied attempt** is hashed and chained to the previous record's hash (`current_hash = SHA256(prev_hash + entry)`). Modifying or deleting a historical database row breaks the cryptographic chain immediately, provable via the verification engine (`/api/admin/audit/verify`).
4. **Deep File Ingestion Defense**:
   Uploads undergo server-side magic-byte sniffing (PDF `%PDF-`, PNG, JPEG) rather than relying on spoofable client MIME headers. Executable scripts and HTML/SVG polyglots are rejected.
5. **AES-256-GCM Encryption at Rest**:
   Files on disk are stored strictly outside the web root under randomized UUID keys, encrypted with dynamic 96-bit initialization vectors and 128-bit authentication tags.
6. **Human-in-the-Loop AI Advisor**:
   The AI analyzes document metadata and suggests relevant recipients, but **strictly cannot widen access autonomously**. Every grant requires explicit document owner sign-off.

---

## 2. What We Deliberately Did Not Build (and Why)

As requested by the specification ("Tell us what you chose not to build, and why. A smaller system with a permission model that holds beats a larger one with a hole in it"):

1. **We Deliberately Did Not Build Presigned URLs (AWS S3 Presigned Links)**:
   *Why*: AWS presigned URLs have a fixed Time-to-Live (e.g., 5 or 15 minutes). If an owner revokes access 10 seconds after issuing a link, the presigned URL remains valid in S3. That violates the non-negotiable rule: *"Whatever you have issued to that person before that moment stops working."* Piping downloads through our authenticated backend stream guarantees instant revocation.
2. **We Deliberately Did Not Put Permissions Inside Stateless JWTs**:
   *Why*: Storing `permissions: ['READ_DOC_1']` in a JWT means revocation requires complex distributed token blacklists. Instead, our JWT solely authenticates user identity; permissions are queried against indexed relational grants.
3. **We Deliberately Did Not Implement Deep Hierarchical Folder Inheritance**:
   *Why*: Folder inheritance is the #1 cause of accidental privilege creep ("Someone is given access to a folder so they can see one file, and they can now see forty"). TrustVault uses explicit per-document discretionary grants (ACL) grouped by category tags.
4. **We Deliberately Did Not Build Client-Side DRM / Screen Watermark Traps**:
   *Why*: Browser-based canvas watermarking and right-click disabling provide a false sense of security that can be trivially bypassed by developer tools or taking a photo of the monitor. We focused all engineering firepower on the unbreakable server-side perimeter.

---

## 3. Our Permission Model in Our Own Words

TrustVault enforces a hybrid **Role-Based Identity + Per-Document Discretionary Access Control (DAC)** model:

- **Identity Roles**:
  - `ADMIN`: Platform operator. Administers user status, reviews compliance logs, and monitors security anomaly spikes. **Crucially: Administrators CANNOT view or download confidential documents unless granted access by the owner.** This preserves least-privilege separation of duties.
  - `DOCUMENT_OWNER`: The author/custodian of a document. Has sovereign control: upload, edit, delete, grant access, and revoke access instantly.
  - `VIEWER`: Standard user who can only discover and read documents explicitly granted to them by named email.
- **Granular Actions**:
  - `READ`: Allows metadata retrieval and decrypted file downloading.
  - `EDIT`: Allows updating metadata (name, category). Does NOT allow deleting or managing grants.
  - `DELETE` & `MANAGE_ACCESS`: Strictly reserved for the original document owner.

---

## 4. How We Used AI and Where It Was Wrong

Throughout development, AI was utilized for boilerplate generation and code review, but strictly supervised against security regressions. As documented in `PROMPTS.md`:

1. **AI's Fatal Proposal on Downloads**:
   The AI initially generated code using 15-minute AWS S3 presigned URLs for "scalability". We caught this flaw immediately: presigned links violate instant revocation. We replaced it with our real-time database-backed streaming choke point.
2. **AI's Dangerous Proposal on Audit Logging**:
   The AI proposed writing audit logs with unawaited fire-and-forget promises (`prisma.auditLog.create(...).catch(...)`) and plain SQL tables without cryptographic hashes. Under load, dropped promises lose evidence of leaks, and rogue DBAs could quietly edit records. We engineered synchronous cryptographic SHA-256 hash chaining.
3. **AI's Admin Privilege Escalation Flaw**:
   The AI wrote authorization middleware with `if (user.role === 'ADMIN') return next();`. This would allow any IT admin to read employee salaries and executive contracts. We stripped this bypass, enforcing that Admins also require explicit grants to view payloads.
4. **AI's Weak MIME Filter**:
   The AI checked `file.mimetype === 'application/pdf'` from the request header. We replaced this with deep byte-level magic-number validation (`%PDF-`).
5. **AI Suggestion Engine Privilege Widening**:
   The AI attempted to automatically insert database rows based on LLM suggestions. We enforced a strict Human-in-the-Loop boundary where the machine is strictly read-only advisory.

---

## 5. What Is Unfinished / Known Limitations

We believe in complete transparency about current boundaries:
1. **Physical Host Memory Extraction**:
   If an adversary achieves root execution on the operating system host, they could inspect memory to capture the symmetric AES-256 master key. Production mitigation: integrate with Hardware Security Modules (AWS KMS, Azure Key Vault, or HashiCorp Vault).
2. **Concurrent Database Writes in Multi-Region Clusters**:
   Our cryptographic hash chaining uses strict serial ordering (`prevHash` of row `N-1`). In a distributed multi-primary database, serial hash chaining requires a distributed consensus sequencer (such as Raft or Kafka) to prevent hash bifurcations.
3. **File Chunking for Massive Files (>2GB)**:
   Current AES-256-GCM implementation buffers and decrypts the file in memory. Files larger than 2GB would benefit from streaming chunked cipher blocks (`crypto.createCipheriv` chunk piping).
