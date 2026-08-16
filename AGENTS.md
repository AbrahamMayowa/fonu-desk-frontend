<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Fonu Desk Agent Guidelines & Conventions

All coding tasks in this repository must follow these rules. Please review them before writing code:

1. **Adopt Conventions Skill:** Read and adopt the rules defined in [.agents/skills/accelint-nextjs-best-practices/SKILL.md](file:///Users/mayowa/projects/assessment/fonu-desk-frontend/.agents/skills/accelint-nextjs-best-practices/SKILL.md).
2. **Framework Documentation:** Prioritize the bundled documentation inside `node_modules/next/dist/docs/` for all Next.js APIs, routing, and configurations.
3. **UI Components:** Always use **shadcn/ui** components. Do not write custom components from scratch if a shadcn equivalent exists.
4. **Best Practices Checklist:** 
   - **Clean Architecture & Modular Design:** Keep folder structures modular and scoped by domain (Auth, Tickets, Organizations, Dashboards).
   - **Input Validation:** Use Zod schemas for all client and server forms/payloads.
   - **Error Handling:** Implement robust error boundaries and display readable fallback messages.
   - **Pagination:** Implement query-based pagination for lists.
   - **Loading States:** Use React Suspense and custom skeleton components for layout page-loading transitions.
   - **Secure Coding Practices:** Handle tokens securely and enforce role-based routes (RBAC).
   - **Implicit Tenant Scoping:** Never pass tenant/org IDs in the request body for ticket actions; resolve them via JWT context on the backend.
   - **Signup & Verification Flow:** `POST /auth/signup` receives `{ firstName, lastName, email }`. `POST /auth/verify-email` receives `{ email, code, password }`. Do not display an email input field on the verification form UI (retrieve from session state).
   - **Card Aesthetics (No AI Slop):** Do NOT use heavy borders (`border border-slate-200`) or card shadows (`shadow-sm`, `shadow-md`, etc.) on card containers. Keep cards flat, clean, and borderless/shadowless.
5. **Runtime Loop:** Verify your changes at runtime using `next dev`, paying attention to the terminal logs and using error overlays to copy debug prompts.
