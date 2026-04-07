# Repository Corrections Design - Lojinha do Zé
Date: 2026-04-07

## 1. Goal
Transition the "Lojinha do Zé" repository from a "Vulnerable/Incomplete" state to a "Production-Ready" state by fixing all issues identified in the comprehensive repository audit. This includes closing security gaps, eliminating technical debt (God Components), and standardizing the codebase.

## 2. Backend Architecture & Security

### 2.1 Global Security Layer
To eliminate "Security Theater" (protection logic that exists but isn't active), the following middlewares will be registered globally in `backend/src/server.ts`:

- **`inputSanitizationMiddleware`**: First in the chain. Sanitizes all incoming JSON request bodies to prevent XSS.
- **`validationMiddleware`**: Second in the chain. Uses Zod schemas to validate the shape and type of request data before it reaches the route handlers.

### 2.2 Functional Gap: Password Management
Implementation of missing authentication endpoints in `backend/src/routes/auth.ts`.

#### Setup Password (`POST /api/auth/setup-password`)
- **Access**: Admin only.
- **Input**: `{ userId: string, newPassword: string }` (Validated via Zod).
- **Logic**: 
  - Validate password strength.
  - Hash password using `bcrypt.hash()` with a secure salt.
  - Update the user record in the Neon PostgreSQL database.
- **Outcome**: Sets the initial password for a user account.

#### Change Password (`POST /api/auth/change-password`)
- **Access**: Authenticated User.
- **Input**: `{ currentPassword: string, newPassword: string }` (Validated via Zod).
- **Logic**:
  - Verify `currentPassword` against DB hash using `bcrypt.compare()`.
  - Validate `newPassword` strength.
  - Update DB with new hash.
- **Outcome**: Securely updates the user's credential.

### 2.3 Route Standardization
All API endpoints will be renamed to **English** to follow industry standards and maintain consistency.
*Example: `/api/auth/configurar-senha` $\rightarrow$ `/api/auth/setup-password`*

## 3. Shared Type Layer

To eliminate duplication between Frontend and Backend, a `shared/` directory will be created at the project root.

### 3.1 Structure
```text
shared/
├── schemas/      # Zod schemas (Runtime validation)
└── types/        # TypeScript types (Compile-time check)
```

### 3.2 Implementation Strategy
1. Define a Zod schema in `shared/schemas/`.
2. Use `z.infer<typeof Schema>` to export a TypeScript type in `shared/types/`.
3. **Backend**: Import the schema for `validationMiddleware`.
4. **Frontend**: Import the type for API response typing and form state.

## 4. Frontend Refactoring & Logic

### 4.1 "God Component" Decomposition
`CustomerManagement.tsx` and `NotificationCenter.tsx` will be refactored using the **Container/Presenter/Hook** pattern.

- **Container**: Manages API state, loading/error flags, and orchestrates data flow.
- **Presenter**: Pure UI components (e.g., `CustomerTable`, `NotificationItem`) that receive props and emit callbacks.
- **Custom Hooks**: Business logic (e.g., `useCustomerActions`) encapsulated in hooks to keep components lean.

### 4.2 State Management Fix
Correction of state mutation bugs in `useCatalog.ts`.
- **Rule**: Never mutate state arrays or objects directly.
- **Implementation**: Use immutable update patterns (`[...prev, newItem]` or `.map()`) to ensure React triggers re-renders correctly.

## 5. Cleanup & Redundancy

### 5.1 Dead Code Removal
- Delete unused root folders (e.g., legacy image folders not used by R2/Bunny).
- Remove unused imports and variables throughout the project.
- Delete duplicate utility functions identified during the audit.

## 6. Testing & Quality Assurance

- **Backend**: Verify each new route with valid and invalid inputs (Zod check). Test password hashing with known values.
- **Frontend**: Verify that "God Components" still function identically after decomposition. Confirm that the catalog UI updates immediately after state changes (fixing the mutation bug).
- **Integration**: End-to-end test of the Password Setup $\rightarrow$ User Login flow.
