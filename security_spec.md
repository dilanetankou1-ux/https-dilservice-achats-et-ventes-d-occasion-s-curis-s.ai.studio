# Security Specification — Dilservice Marketplace

## 1. Data Invariants
1. **Identity Isolation (PII)**: Private user documents (`/users/{userId}`) containing `email` and `phone` are strictly readable and writable only by `request.auth.uid == userId`. Public display metadata lives separately in `/publicProfiles/{userId}`.
2. **Listing Ownership & Integrity**: A listing can only be created by an email-verified authenticated user with `sellerId == request.auth.uid`, initial `status == 'available'`, and `buyerId == ''`. Once `status == 'sold'`, the listing is terminally locked against further modifications.
3. **Conversation Isolation**: A conversation (`/conversations/{conversationId}`) can only exist if the referenced `listingId` exists, `buyerId == request.auth.uid`, and `sellerId != request.auth.uid` (no self-messaging). Only `buyerId` or `sellerId` may read, list, or update the conversation.
4. **Message Immutability & Master Gate**: Messages under `/conversations/{conversationId}/messages/{messageId}` require parent conversation existence (`open` status), participant membership, and `senderId == request.auth.uid`. Messages are strictly immutable (no update or delete).
5. **Order Integrity & Terminal Locking**: An order can only be created by an authenticated buyer (`buyerId == request.auth.uid`, `sellerId != request.auth.uid`) referencing an existing listing, starting in `pending_handoff`. Orders reaching `completed` or `cancelled` are terminally locked.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must match `request.time` on creation/mutation, and `createdAt` is immutable on update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Listing Create**: Creating `/listings/lst_1` with `sellerId: "victim_uid"` while authenticated as `"attacker_uid"`. -> Expected: `PERMISSION_DENIED`.
2. **Shadow / Ghost Field Injection**: Creating `/listings/lst_2` with valid fields plus `"isVerified": true` or `"featured": true`. -> Expected: `PERMISSION_DENIED`.
3. **PII Cross-User Read**: Reading `/users/victim_uid` while authenticated as `"attacker_uid"`. -> Expected: `PERMISSION_DENIED`.
4. **Blanket User List Scraping**: Querying `collection(db, "users")` or `collection(db, "publicProfiles")`. -> Expected: `PERMISSION_DENIED`.
5. **Conversation Eavesdropping**: Reading `/conversations/conv_ab` where `buyerId: "user_a"` and `sellerId: "user_b"` while signed in as `"user_c"`. -> Expected: `PERMISSION_DENIED`.
6. **Self-Conversation Creation**: Creating a conversation where `buyerId == sellerId == request.auth.uid`. -> Expected: `PERMISSION_DENIED`.
7. **Message Forgery / Impersonation**: Creating a message inside `/conversations/conv_ab/messages/msg_1` with `senderId: "user_b"` while signed in as `"user_a"`. -> Expected: `PERMISSION_DENIED`.
8. **Message History Tampering**: Updating or deleting an existing message in `/conversations/conv_ab/messages/msg_1`. -> Expected: `PERMISSION_DENIED`.
9. **Terminal State Bypass on Sold Listing**: Updating `/listings/lst_sold` (`status: "sold"`) to change `price` or revert `status` to `"available"`. -> Expected: `PERMISSION_DENIED`.
10. **Path Variable ID Poisoning**: Creating a document with ID `"../../bad$id"` or a 200-character document ID. -> Expected: `PERMISSION_DENIED`.
11. **Value Poisoning / Resource Exhaustion**: Updating a listing `title` with a 5,000-character string or negative `price: -50`. -> Expected: `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Creating a listing or message with a backdated client timestamp instead of `serverTimestamp()` (`request.time`). -> Expected: `PERMISSION_DENIED`.
