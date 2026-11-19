# Preluxes Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Single-Owner Store Admin Authority**: Only verified admins (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or verified bootstrapped owner email `hahspace@gmail.com`) may create, edit, publish, or archive `products`, `categories`, `brands`, `coupons`, `cms_content`, `store_settings`, or `inventory_logs`.
2. **Self-Assigned Role Prevention**: During `users/{userId}` registration, a customer MUST set `role == 'customer'` and `uid == request.auth.uid`, and can never escalate `role` to `'admin'`.
3. **PII Isolation**: `users/{userId}`, `users/{userId}/addresses/{addressId}`, `orders/{orderId}`, and `payments/{paymentId}` contain PII (`email`, `phone`, `shippingAddressSnapshot`) and are strictly readable only by the document owner (`userId == request.auth.uid`) or an Admin.
4. **Secure List Queries**: `allow list` rules on `orders`, `payments`, and `products` never delegate filtering to the client. `orders` and `payments` restrict list reads to `resource.data.userId == request.auth.uid || isAdminToken()`; public `products` list reads strictly enforce `resource.data.status == 'published' || isBootstrappedAdmin()`.
5. **Anti-Overselling & Server-Time Integrity**: Customers cannot arbitrarily modify product prices, `quantity`, or `status`. Only atomic reservation increments (`reservedQuantity == existing().reservedQuantity + 1 && incoming().reservedQuantity <= existing().quantity`) or verified admin actions are permitted, and all `createdAt` / `updatedAt` timestamps must equal `request.time`.
6. **Payment & Terminal State Integrity**: Customers cannot mark their own `orders` or `payments` as `'paid'` or `'completed'` directly via client SDK writes unless backed by verified payment state transitions; status updates on `fulfilmentStatus` are strictly Admin-only.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Role Escalation on Registration**: `CREATE /users/u1` with `{ uid: "u1", role: "admin", ... }` -> DENIED (`role == 'customer'` required for non-admin).
2. **Shadow Field Injection on Profile**: `UPDATE /users/u1` adding `{ isVip: true }` -> DENIED (`hasOnly` + `affectedKeys().hasOnly(...)`).
3. **Cross-Customer PII Read**: `GET /users/u2` as `u1` -> DENIED.
4. **Cross-Customer Order Scraping**: `LIST /orders` without `where('userId', '==', 'u1')` as `u1` -> DENIED.
5. **ID Poisoning**: `CREATE /orders/<2000-char-junk-id>` -> DENIED (`isValidId` <= 128 chars, alphanumeric/underscore/hyphen).
6. **Price Tampering on Product**: `UPDATE /products/p1` with `{ sellingPrice: 100 }` as customer -> DENIED.
7. **Overselling Reservation**: `UPDATE /products/p1` setting `reservedQuantity: 5` when `quantity: 1` -> DENIED (`reservedQuantity <= existing().quantity`).
8. **Unverified Email Write**: `CREATE /orders/o1` when `request.auth.token.email_verified == false` -> DENIED.
9. **Identity Spoofing on Order**: `CREATE /orders/o1` with `{ userId: "victim_uid" }` as `attacker_uid` -> DENIED (`incoming().userId == request.auth.uid`).
10. **Immortal Field Mutation**: `UPDATE /orders/o1` altering `createdAt` or `orderNumber` -> DENIED.
11. **Direct Customer Fulfilment Override**: `UPDATE /orders/o1` setting `fulfilmentStatus: "shipped"` as customer -> DENIED.
12. **Unauthenticated Admin Write**: `CREATE /products/p_fake` without auth -> DENIED.
