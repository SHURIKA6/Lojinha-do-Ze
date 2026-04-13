---
name: Repository Reorganization
description: Comprehensive redesign of the project structure to improve scalability, maintainability, and professional standards.
type: architecture
date: 2026-04-12
---

# Repository Reorganization Design

## 1. Objective

Reorganize the "Lojinha do Zé" repository to move from a basic folder structure to a professional monorepo-style architecture, cleaning up the root directory and implementing a module-based backend structure.

## 2. Root Level Changes

### 2.1 Monorepo Setup

- Implement `npm workspaces` in the root `package.json`.
- Workspaces: `["backend", "frontend"]`.
- This allows for unified dependency management and potential shared packages in the future.

### 2.2 Asset Management

- Create `assets/` directory at the root.
- Move `Fotos Produtos/` $\rightarrow$ `assets/fotos-produtos/`.
- Rationale: Root directory should contain only configuration and project-level folders. Assets should be isolated.

### 2.3 Configuration Standardization

- Create a master `.env.example` at the root.
- Remove redundant `env.example` from `backend/`.
- Standardize environment variable naming across the project.

## 3. Backend Architecture (`backend/src`)

Transition from a Layered Architecture (Type-based) to a Module-based Architecture (DDD Lite).

### 3.1 Core Layer (`src/core`)

Contains cross-cutting concerns used by all modules:

- `db.ts`: Database connection and configuration.
- `middleware/`: Global middlewares (auth, error handling, logging).
- `utils/`: General purpose helper functions.
- `types/`: Global TypeScript interfaces and types.

### 3.2 Module Layer (`src/modules`)

Each domain entity (e.g., User, Product, Order) gets its own isolated module:

- Structure for each module:
  - `routes.ts`: API endpoints for the module.
  - `service.ts`: Business logic and orchestration.
  - `repository.ts`: Data access layer.
  - `dto/`: Data Transfer Objects for validation (using Zod).

### 3.3 Entry Point

- `server.ts`: Initializes the app and mounts routes from all modules.

## 4. Frontend Architecture (`frontend/src`)

Refining the existing structure for better clarity and consistency.

### 4.1 Feature-Based Organization (`src/features`)

- All domain-specific logic (components, hooks, and services) must reside within `src/features/[feature-name]`.
- This prevents the `components` and `hooks` folders from becoming "dumping grounds".

### 4.2 Core Layer (`src/core`)

Consolidate shared infrastructure:

- `lib/`: Third-party library configurations (e.g., axios, prisma).
- `hooks/`: Truly global hooks (e.g., `useWindowSize`, `useLocalStorage`).
- `contexts/`: Global state providers.
- `services/`: API client and global data fetching logic.
- `utils/`: Pure helper functions.
- `types/`: Global TypeScript definitions.

## 5. Success Criteria

- [ ] Project builds and runs without path errors after reorganization.
- [ ] All imports are updated to reflect new file locations.
- [ ] Root directory is clean (no `Fotos Produtos` folder).
- [ ] Backend logic is clearly partitioned by module.
- [ ] Frontend logic is clearly partitioned by feature.
