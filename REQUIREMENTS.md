# Objective
Build a simplified enterprise ticketing platform that demonstrates your ability to design and deliver a production-quality SaaS application.

# Preferred Technology Stack
- **Backend**: Node.js (NestJS), TypeScript (Recommended: NestJS provides robust modular design out of the box).
- **Database**: PostgreSQL (via Prisma ORM or TypeORM)
- **Authentication**: JWT
- **Infrastructure**: Docker / Docker Compose

# Functional Requirements
1. **Authentication** (registration, login, password reset placeholder, JWT, RBAC)
2. **Organization Management** (create organisation, invite users, assign roles)
3. **Ticket Management** (CRUD, assignment, comments, history)
4. **Dashboards** for Administrator, Support Agent and Customer
5. **Search and filtering**
6. **Notifications** (email notification)
7. **Audit trail**
8. **REST APIs** with API documentation (swagger)

# Non-Functional Requirements
Clean architecture, modular design, input validation, error handling, logging, pagination, loading states, reusable components and secure coding practices.

# Database
Provide a database schema or ER diagram covering Users, Organisations, Roles, Tickets, Comments and Audit Logs.

# Testing
Include unit tests for key business logic and API tests for major endpoints.

# Clarifications
- **Multiple Organizations**: Yes, a user may belong to multiple organizations, subject to the appropriate role and access permissions.
- **Ticket Assignment**: Support both manual and automated assignment, configurable at the organization/admin level.
- **Customer Accounts**: Yes. Customers should be onboarded under their business/company, with authorized users able to create and manage tickets.
- **Tickets on Behalf of Customers**: Yes. Authorized support agents/admins should be able to create tickets on behalf of customers.
- **Notifications**: Email notification is sufficient for the assessment. The design should, however, allow additional notification channels to be added later.
- **B2B Structure**: Yes. A customer business should be represented as an organization with the ability to have multiple users under the same business.
