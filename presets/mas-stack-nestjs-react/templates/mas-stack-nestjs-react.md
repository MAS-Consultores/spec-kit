# MAS Stack Scaffold: NestJS + React (API + SPA)

This placeholder marks the bundled MAS stack preset for NestJS + React monorepo
projects. The stack produces a decoupled architecture with `apps/api` (NestJS +
Prisma + PostgreSQL) and `apps/web` (React + Vite + TypeScript) communicating
over HTTP.

## Architecture Overview

- **`apps/api`**: NestJS backend with Prisma ORM, PostgreSQL database, REST API
  with OpenAPI documentation
- **`apps/web`**: React SPA built with Vite, consuming typed API clients
  generated from OpenAPI
- **`packages/`**: Shared types, validation schemas, and utilities

## Key Differences from Laravel + Inertia + React

This stack is a **decoupled API + SPA** architecture, not a server-rendered
monolith. The API and frontend are independent applications with explicit HTTP
contracts, enabling independent deployment and scaling.
