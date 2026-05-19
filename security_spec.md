# Security Specification - Hyundai G4 Emerging LEADER Portal

## Data Invariants
- A question must have a valid `authorId` that matches the authenticated user.
- A question must have a valid `category` from the predefined list.
- A question must have a valid `mentor` from the predefined list.
- `createdAt` and `date` must be valid timestamps/dates.
- `text` must be a string within a reasonable size (e.g., <= 1000 characters to be safe, though UI limits to 300).

## The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Spoofing**: Attempt to create a question with `authorId` of another user.
2. **Resource Poisoning**: Large string for `text` (1MB).
3. **Invalid Category**: Category "hack" instead of "knowhow".
4. **Invalid Mentor**: Mentor "CEO" instead of "branch".
5. **Unauthorized Update**: A user attempting to update someone else's question.
6. **Shadow Fields**: Creating a question with an extra field `isApproved: true`.
7. **Bypassing Server Timestamp**: Providing a hardcoded `createdAt` in the past.
8. **Malicious ID**: Document ID containing non-alphanumeric characters like `../../../etc/passwd`.
9. **Unauthenticated Write**: Writing to `questions` without being signed in.
10. **Privilege Escalation**: Adding an `isAdmin: true` field to a user profile (if one existed).
11. **PII Leak**: Attempting to list all questions as an unauthenticated user (if rules restrict listing).
12. **State Shortcutting**: Updating `createdAt` on an existing document.

## Implementation Details
- Collection: `questions`
- Access: 
    - Create: Anyone signed in (anonymously or via Google).
    - Read: Administration (admins) can list all. Users can possibly list all for the dashboard if it's public for the session.
    - Update/Delete: Only admins can delete or reset.
