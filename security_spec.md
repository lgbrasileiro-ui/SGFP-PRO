# Security Specification & Threat Model (TDD)

This document contains semantic security definitions, data validation invariants, and the threat test model design for the SGFP Pro Firestore deployment.

## 1. Data Invariants

Our data access schema enforces a **Zero-Trust Attribute-Based Access Control (ABAC)** with a strict user-isolation design.

- **Isolation Invariant:** A user can only read, write, create, update, or list records mapping exactly to their own authenticated user ID: `request.auth.uid == userId`.
- **Integrity Invariant (Transactions):**
  - `id` and `date` must be present and correctly formatted.
  - `type` must strictly be either `'Receita'` or `'Despesa'`.
  - `amount` must be a positive number greater than 0.
  - `desc` must be a string with a size length <= 256 characters.
  - `createdAt` must be exactly the server request time during document creation.
  - `updatedAt` must be exactly the server request time during document update.
- **Integrity Invariant (UserSettings):**
  - Settings map is fully encapsulated in key-value parameters.
  - The sub-keys `budgetRule`, `receitasOverrides`, `customMacrosDespesa`, `customMacrosReceita`, and `customMicroPresets` are validated to maintain state structure and prevent shadow attributes.

---

## 2. The "Dirty Dozen" Payloads

These 12 payloads represent attacks trying to bypass data access controls or poison the database state.

### Threat 1: Identity Spoofing (Writing to another User's records)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_B`
- **Payload:**
  ```json
  { "id": "txn_123", "date": "2026-05-23", "type": "Despesa", "macro": "Necessidades", "micro": "Aluguel", "desc": "Spying around", "amount": 100, "createdAt": "request.time", "updatedAt": "request.time" }
  ```
- **Expectation:** `PERMISSION_DENIED` (User B is not User A).

### Threat 2: Blanket Read / Global Listing Attempt
- **Path:** `/users/user_A/transactions`
- **Query:** Get all transactions without a specific userId where-clause
- **Auth User:** `user_B`
- **Expectation:** `PERMISSION_DENIED`

### Threat 3: Denial of Wallet - Resource Poisoning (Giant Description)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload:**
  ```json
  { "id": "txn_123", "date": "2026-05-23", "type": "Despesa", "macro": "Necessidades", "micro": "Aluguel", "desc": "SUPERLONG_GIANT_REPEATED_STRING_EXCEEDING_256_CHARS...", "amount": 100, "createdAt": "request.time", "updatedAt": "request.time" }
  ```
- **Expectation:** `PERMISSION_DENIED` (Descriptions must be <= 256 characters).

### Threat 4: Value Poisoning (Zero or Negative Amount)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload:**
  ```json
  { "id": "txn_123", "date": "2026-05-23", "type": "Despesa", "macro": "Necessidades", "micro": "Aluguel", "desc": "Sneaky rebate", "amount": -250.00, "createdAt": "request.time", "updatedAt": "request.time" }
  ```
- **Expectation:** `PERMISSION_DENIED` (Amount must be a positive float > 0).

### Threat 5: Invalid Type Injection
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload:**
  ```json
  { "id": "txn_123", "date": "2026-05-23", "type": "BurlarSistema", "macro": "Invasao", "micro": "Hack", "desc": "Altered type", "amount": 100, "createdAt": "request.time", "updatedAt": "request.time" }
  ```
- **Expectation:** `PERMISSION_DENIED` (Type must only be 'Receita' or 'Despesa').

### Threat 6: Modifying Immortal Creation Data (Updating `createdAt`)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload (Update):** Attempt to update `createdAt` to a timestamp in the past.
- **Expectation:** `PERMISSION_DENIED` (`createdAt` is immutable).

### Threat 7: Client Time Spoofing (Faking Server Status Timestamps)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload:** Sending a transaction where `createdAt` is a fixed string payload or client date instead of `request.time`.
- **Expectation:** `PERMISSION_DENIED` (Timestamps must match the request's server clock).

### Threat 8: Settings Shadow Attribute Poisoning (Ghost fields in Profile)
- **Path:** `/users/user_A`
- **Auth User:** `user_A`
- **Payload:**
  ```json
  { "budgetRule": { "necessidades": 50, "desejos": 30, "poupanca": 20 }, "receitasOverrides": {}, "customMacrosDespesa": [], "customMacrosReceita": [], "customMicroPresets": {}, "isAdmin": true, "vipStatus": "unlocked" }
  ```
- **Expectation:** `PERMISSION_DENIED` (Size mismatch/Keys list size exceeded due to ghost domains like `isAdmin`, `vipStatus`).

### Threat 9: Updating Resource Id (Document ID Tampering)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload (Update):** Attempting to update `id` field from `"txn_123"` to `"txn_999"`.
- **Expectation:** `PERMISSION_DENIED` (`id` field is immutable and must equal existing document id).

### Threat 10: Anonymous Or Unverified Users attempting write actions
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** Authenticated as anonymous or unverified user (if verification is strictly required by the rules).
- **Expectation:** `PERMISSION_DENIED`

### Threat 11: Invalid ID Poisoning (Resource Poisoning via ID injections)
- **Path:** `/users/user_A/transactions/%0A_malicious_id`
- **Auth User:** `user_A`
- **Expectation:** `PERMISSION_DENIED` (ID contains non-alphanumeric characters or exceeds length bounds).

### Threat 12: Bad Field Format Injection (Non-Float Amount representation)
- **Path:** `/users/user_A/transactions/txn_123`
- **Auth User:** `user_A`
- **Payload:**
  ```json
  { "id": "txn_123", "date": "2026-05-23", "type": "Despesa", "macro": "Necessidades", "micro": "Aluguel", "desc": "Bad float", "amount": "100.00", "createdAt": "request.time", "updatedAt": "request.time" }
  ```
- **Expectation:** `PERMISSION_DENIED` (Amount must match string type validators or floats appropriately).

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("SGFP Pro Secure Fortress Security Rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0886060891",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("Threat 1 Check: should block user B from writing in user A's transactions path", async () => {
    const contextB = testEnv.authenticatedContext("user_B", { email_verified: true });
    const dbB = contextB.firestore();
    const targetRef = doc(dbB, "users/user_A/transactions/txn_123");

    await assertFails(
      setDoc(targetRef, {
        id: "txn_123",
        date: "2026-05-23",
        type: "Despesa",
        macro: "Necessidades",
        micro: "Aluguel",
        desc: "Spying around",
        amount: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });

  it("Threat 2 Check: should block user B from reading user A's transactions", async () => {
    const contextB = testEnv.authenticatedContext("user_B", { email_verified: true });
    const dbB = contextB.firestore();
    const targetRef = doc(dbB, "users/user_A/transactions/txn_123");
    await assertFails(getDoc(targetRef));
  });

  it("Threat 3 Check: should block creation with giant descriptions > 256 symbols", async () => {
    const contextA = testEnv.authenticatedContext("user_A", { email_verified: true });
    const dbA = contextA.firestore();
    const targetRef = doc(dbA, "users/user_A/transactions/txn_123");

    await assertFails(
      setDoc(targetRef, {
        id: "txn_123",
        date: "2026-05-23",
        type: "Despesa",
        macro: "Necessidades",
        micro: "Aluguel",
        desc: "A".repeat(257),
        amount: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });

  it("Threat 4 Check: should block setting transaction amount as 0 or negative", async () => {
    const contextA = testEnv.authenticatedContext("user_A", { email_verified: true });
    const dbA = contextA.firestore();
    const targetRef = doc(dbA, "users/user_A/transactions/txn_123");

    await assertFails(
      setDoc(targetRef, {
        id: "txn_123",
        date: "2026-05-23",
        type: "Despesa",
        macro: "Necessidades",
        micro: "Aluguel",
        desc: "Fuel price",
        amount: -5.00,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });

  it("Threat 5 Check: should block setting invalid type fields", async () => {
    const contextA = testEnv.authenticatedContext("user_A", { email_verified: true });
    const dbA = contextA.firestore();
    const targetRef = doc(dbA, "users/user_A/transactions/txn_123");

    await assertFails(
      setDoc(targetRef, {
        id: "txn_123",
        date: "2026-05-23",
        type: "BurlarSistema",
        macro: "Necessidades",
        micro: "Aluguel",
        desc: "Gas bill",
        amount: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });

  it("Threat 8 Check: should reject updating profile with unallowed ghost fields (shadow updates)", async () => {
    const contextA = testEnv.authenticatedContext("user_A", { email_verified: true });
    const dbA = contextA.firestore();
    const profileRef = doc(dbA, "users/user_A");

    await assertFails(
      setDoc(profileRef, {
        budgetRule: { necessidades: 50, desejos: 30, poupanca: 20 },
        receitasOverrides: {},
        customMacrosDespesa: [],
        customMacrosReceita: [],
        customMicroPresets: {},
        isAdmin: true
      })
    );
  });
});
```
