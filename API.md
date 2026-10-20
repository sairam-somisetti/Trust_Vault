# TrustVault API Documentation

This document defines all HTTP REST endpoints in TrustVault, their authorization preconditions, role restrictions, and audit ledger consequences.

---

## Authentication & Identity

### `POST /api/auth/register`
- **Allowed Callers**: Anyone (Public / Unauthenticated)
- **Description**: Registers a new user account.
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "Password123!",
    "name": "Alice Smith",
    "role": "VIEWER" // "VIEWER" | "DOCUMENT_OWNER" | "ADMIN"
  }
  ```
- **Audit Action Logged**: `AUTH_REGISTER` (Status: `SUCCESS`)
- **Responses**:
  - `201 Created`: Returns created user object and signed 8-hour JWT.
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Email already exists.

### `POST /api/auth/login`
- **Allowed Callers**: Anyone (Public / Unauthenticated)
- **Description**: Authenticates user credentials via bcrypt comparison.
- **Request Body**:
  ```json
  {
    "email": "owner@trustvault.local",
    "password": "Password123!"
  }
  ```
- **Audit Action Logged**: `AUTH_LOGIN` (Status: `SUCCESS` or `ACCESS_DENIED`)
- **Responses**:
  - `200 OK`: Returns authenticated user context and JWT token.
  - `401 Unauthorized`: Invalid credentials or deactivated account.

### `GET /api/auth/me`
- **Allowed Callers**: Authenticated Users (`Bearer <token>`)
- **Description**: Returns the active session user identity verified against the database.
- **Responses**: `200 OK`, `401 Unauthorized`

---

## Documents & Storage

### `POST /api/documents/upload`
- **Allowed Callers**: `DOCUMENT_OWNER`, `ADMIN`
- **Description**: Uploads, inspects magic-bytes, encrypts with AES-256-GCM, and stores file outside web root.
- **Request**: Multipart Form Data (`file`: File binary, `category`: String)
- **Security Validations**:
  - Magic byte inspection: PDF (`%PDF-`), PNG, JPEG, UTF-8 text.
  - Hard-blocks executables and script polyglots (`.exe`, `.php`, `.sh`, `.bat`, `.html`, `.svg`).
- **Audit Action Logged**: `DOCUMENT_UPLOAD` (Status: `SUCCESS` or `ACCESS_DENIED`)
- **Responses**:
  - `201 Created`: Document metadata with SHA-256 plaintext checksum.
  - `400 Bad Request`: Disallowed file signature or empty file.

### `GET /api/documents`
- **Allowed Callers**: Authenticated Users (`ADMIN`, `DOCUMENT_OWNER`, `VIEWER`)
- **Description**: Lists documents available to the caller.
- **Strict Isolation Guarantee**: Only returns documents where `ownerId == currentUserId` OR an active grant exists for `currentUserId`. Unauthorized documents are completely hidden from search results (no metadata leakage).
- **Query Parameters**: `search`, `category`, `owner`, `startDate`, `endDate`.
- **Responses**: `200 OK`

### `GET /api/documents/:id`
- **Allowed Callers**: Document Owner OR Users with active `READ` / `EDIT` grant.
- **Description**: Retrieves single document metadata.
- **Choke Point**: Evaluated via `authorizeDocumentAccess(req, id, 'READ')`.
- **Audit Action Logged**: `DOCUMENT_READ` (Status: `SUCCESS` or `ACCESS_DENIED`)
- **Responses**:
  - `200 OK`: Document metadata.
  - `403 Forbidden`: Caller lacks grant.
  - `404 Not Found`: Document does not exist.

### `GET /api/documents/:id/download`
- **Allowed Callers**: Document Owner OR Users with active `READ` / `EDIT` grant.
- **Description**: Decrypts file from disk via AES-256-GCM and streams bytes directly.
- **Choke Point**: Live database grant verification at millisecond of request (Zero Revocation Lag).
- **Headers Enforced**:
  - `Content-Disposition: attachment; filename="sanitized.pdf"`
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: no-store, no-cache, must-revalidate, private`
- **Audit Action Logged**: `DOCUMENT_DOWNLOAD` (Status: `SUCCESS` or `ACCESS_DENIED`)
- **Responses**:
  - `200 OK`: Decrypted binary stream.
  - `403 Forbidden`: Unauthorized / Revoked access.

### `PATCH /api/documents/:id`
- **Allowed Callers**: Document Owner OR Users with active `EDIT` grant.
- **Description**: Updates document name or category.
- **Audit Action Logged**: `DOCUMENT_EDIT` (Status: `SUCCESS` or `ACCESS_DENIED`)
- **Responses**:
  - `200 OK`: Updated metadata.
  - `403 Forbidden`: Caller possesses `READ` only grant.

### `DELETE /api/documents/:id`
- **Allowed Callers**: Document Owner ONLY.
- **Description**: Soft deletes document and removes encrypted storage artifact from disk.
- **Audit Action Logged**: `DOCUMENT_DELETE` (Status: `SUCCESS` or `ACCESS_DENIED`)
- **Responses**: `200 OK`, `403 Forbidden`

---

## Discretionary Access Control (ACL)

### `GET /api/documents/:id/grants`
- **Allowed Callers**: Document Owner ONLY.
- **Description**: Lists all active named grants issued for this document.
- **Responses**: `200 OK`, `403 Forbidden`

### `POST /api/documents/:id/grants`
- **Allowed Callers**: Document Owner ONLY.
- **Description**: Grants `READ` or `EDIT` permissions to a named colleague by email.
- **Request Body**:
  ```json
  {
    "userEmail": "colleague@company.com",
    "permission": "READ", // "READ" | "EDIT"
    "notes": "Contract review grant"
  }
  ```
- **Audit Action Logged**: `GRANT_CREATED`
- **Responses**: `201 Created`, `400 Bad Request`, `404 Not Found`

### `DELETE /api/documents/:id/grants/:userId`
- **Allowed Callers**: Document Owner ONLY.
- **Description**: Hard deletes grant row. **Immediately halts all further stream or metadata requests at 0ms latency**.
- **Audit Action Logged**: `GRANT_REVOKED`
- **Responses**: `200 OK`, `404 Not Found`

---

## AI Access Advisor (Advisory Only)

### `POST /api/documents/:id/ai-suggest`
- **Allowed Callers**: Document Owner ONLY.
- **Description**: Analyzes document classification and directory to propose relevant recipients.
- **Guaranteed Invariant**: Strictly read-only advisory. Does not insert any database grant rows.
- **Audit Action Logged**: `AI_RECOMMENDATION_GENERATED`
- **Responses**: `200 OK` (list of suggested recipients with match reasons and confidence score).

### `POST /api/documents/:id/ai-approve`
- **Allowed Callers**: Document Owner ONLY.
- **Description**: Owner explicitly confirms an AI recommendation. Converts suggestion into an active grant.
- **Audit Action Logged**: `AI_RECOMMENDATION_APPROVED`
- **Responses**: `201 Created`, `403 Forbidden`

---

## Administrative Compliance & Audit

### `GET /api/admin/audit`
- **Allowed Callers**: `ADMIN` ONLY.
- **Description**: Paginated query of the complete system audit ledger with filters.
- **Query Parameters**: `actorId`, `resourceId`, `action`, `status`, `page`, `limit`.
- **Responses**: `200 OK`, `403 Forbidden`

### `GET /api/admin/audit/verify`
- **Allowed Callers**: `ADMIN` ONLY.
- **Description**: Traverses the cryptographic SHA-256 hash chain from genesis to tip.
- **Audit Action Logged**: `AUDIT_VERIFIED`
- **Responses**:
  ```json
  {
    "valid": true,
    "totalRecords": 45,
    "latestHash": "3085603e32244caa226066b27775fb1e02787d4ac6bca057593f46506f28ab47",
    "message": "Audit chain verified mathematically across all 45 records. Zero tampering detected."
  }
  ```

### `GET /api/admin/alerts`
- **Allowed Callers**: `ADMIN` ONLY.
- **Description**: Aggregates `ACCESS_DENIED` attempts over the past 24 hours to surface brute-force or enumeration anomalies.
- **Responses**: `200 OK`

### `GET /api/admin/users`
- **Allowed Callers**: `ADMIN` ONLY.
- **Description**: Lists all user accounts and their active states.
- **Responses**: `200 OK`

### `PATCH /api/admin/users/:id/status`
- **Allowed Callers**: `ADMIN` ONLY.
- **Description**: Suspends or reactivates a user account. If suspended, all future session requests are terminated immediately.
- **Responses**: `200 OK`
