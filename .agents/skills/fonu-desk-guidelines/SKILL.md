---
name: fonu-desk-guidelines
description: Custom guidelines and conventions for building the Fonu Desk ticketing SaaS frontend. Use when adding routes, views, endpoints, or state management logic.
---

# Fonu Desk Frontend Conventions

This skill provides workspace-specific guidelines for the Fonu Desk frontend application.

## Core Rules

1. **Requirements Grounding**:
   - Always reference [FRONTEND_REQUIREMENTS.md](file:///Users/mayowa/projects/assessment/fonu-desk-frontend/FRONTEND_REQUIREMENTS.md) for the exact payload shapes, headers, roles, response types, and UX flowcharts.
   
2. **Backend Code Context**:
   - When implementation details are ambiguous (e.g. precise database entity naming or role definitions), inspect the backend codebase at `/Users/mayowa/projects/assessment/fonu-desk-backend`. Specifically, check the NestJS API modules under `src/api/` (such as `tickets`, `auth`, `users`, `organizations`, `dashboards`, `notifications`, `audit-logs`).
   
3. **Workspace Switching**:
   - Clicking an organization in the navbar dropdown must trigger `PATCH /auth/switch-organization`.
   - Update the token, clear all local state caches, and trigger a hard page reload to ensure the new role scopes are active without data leaks.

4. **Dashboard Caching**:
   - Cache results of `GET /dashboards/*` in client-side memory for exactly **3 minutes** (180,000 ms).
   - Reuse the cached dashboard data unless it has expired, or the user clicks "Refresh", or switches organizations.

5. **Implicit Tenant Scoping**:
   - Never send `organizationId` in payload bodies for ticket creations or comments. It must be resolved strictly via the backend JWT token claims.
