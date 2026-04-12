# System Architecture

This document describes the architecture of the "Lojinha do Zé" application.

## Overview

The application is a full-stack e-commerce platform consisting of a Next.js frontend and a TypeScript-based backend.

## Frontend Architecture

The frontend is built with **Next.js** using the App Router.

### Structure
- `src/app`: Contains the page routing and layouts.
- `src/features`: Organized by domain (e.g., `auth`, `storefront`, `admin`), containing logic and components specific to those features.
- `src/components`: Shared UI components.
- `src/services`: API client wrappers for communicating with the backend.
- `src/hooks`: Custom React hooks for shared logic.
- `src/contexts`: Global state management using React Context.

### Key Technologies
- Next.js (App Router)
- TypeScript
- React

## Backend Architecture

The backend is a TypeScript API, designed to run on **Cloudflare Workers** (as indicated by `wrangler.toml`).

### Layered Architecture
The backend follows a layered pattern to separate concerns:
1. **Routes**: Handle HTTP requests and map them to service calls.
2. **Services**: Contain the business logic and coordinate between repositories and other services.
3. **Repositories**: Handle direct data access and database queries.
4. **Domain**: Contains shared schemas, constants, and types.

### Key Components
- **Database**: Uses **Neon (PostgreSQL)** for persistent storage.
- **Authentication**: Implements session management and refresh tokens.
- **Payments**: Integrated with **Mercado Pago**.
- **Notifications**: A centralized notification service supporting multiple channels.

## Data Flow

1. The **Frontend** makes an HTTP request via the `services` layer.
2. The **Backend Route** receives the request and validates it using middleware (auth, rate limiting).
3. The **Route** calls the appropriate **Service**.
4. The **Service** executes business logic and may interact with one or more **Repositories**.
5. The **Repository** queries the **Neon Database**.
6. The result flows back up through the layers and is returned to the frontend as a standardized response.

## Infrastructure

- **Frontend Deployment**: Next.js (likely Vercel or similar).
- **Backend Deployment**: Cloudflare Workers.
- **Database**: Neon PostgreSQL.
