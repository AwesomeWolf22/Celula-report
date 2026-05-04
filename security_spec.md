# Security Specification - User Profiles

## 1. Data Invariants
- A user document must have its `uid` matching the document ID.
- The `email` field must match the authenticated user's email.
- The `role` must be one of: 'Lider', 'Treinador', 'Discipulador', 'Membro'.
- `createdAt` is immutable.
- `photoURL` must be a string (data URL or external URL).

## 2. The Dirty Dozen Payloads

### Identity Spoofing
1. **Target**: `/users/other-uid`
   - **Action**: Create/Update with `uid: 'my-uid'`
   - **Expectation**: PERMISSION_DENIED (Cannot write to other's document)
2. **Target**: `/users/my-uid`
   - **Action**: Update with `uid: 'other-uid'`
   - **Expectation**: PERMISSION_DENIED (uid is immutable)

### Resource Poisoning
3. **Target**: `/users/my-uid`
   - **Action**: Create with `role: 'SuperAdmin'`
   - **Expectation**: PERMISSION_DENIED (Invalid role)
4. **Target**: `/users/my-uid`
   - **Action**: Update with `name: 'A' * 2000`
   - **Expectation**: PERMISSION_DENIED (String too long)

### State Shortcutting / Integrity
5. **Target**: `/users/my-uid`
   - **Action**: Update `email` to another value
   - **Expectation**: PERMISSION_DENIED (Email must match auth email and be immutable from client)
6. **Target**: `/users/my-uid`
   - **Action**: Update `createdAt`
   - **Expectation**: PERMISSION_DENIED (Immutable field)

### Relational Sync / Orphans
7. **Target**: `/users/my-uid`
   - **Action**: Create with `name: null`
   - **Expectation**: PERMISSION_DENIED (Required field)

### Query Scraping
8. **Target**: `/users`
   - **Action**: List all users
   - **Expectation**: PERMISSION_DENIED (No blanket reads)

### PII Leak
9. **Target**: `/users/other-uid`
   - **Action**: Get document
   - **Expectation**: PERMISSION_DENIED (Private profiles by default)

### Logic Gaps
10. **Target**: `/users/my-uid`
    - **Action**: Update without re-validating the full schema
    - **Expectation**: PERMISSION_DENIED (isValidUser must be called on update)

### Denial of Wallet
11. **Target**: `/users/verylog-string-that-is-not-a-valid-id`
    - **Action**: Create
    - **Expectation**: PERMISSION_DENIED (isValidId check fails)

### Timestamp Tampering
12. **Target**: `/users/my-uid`
    - **Action**: Create with `createdAt: '2020-01-01'`
    - **Expectation**: PERMISSION_DENIED (Must use server timestamp)
