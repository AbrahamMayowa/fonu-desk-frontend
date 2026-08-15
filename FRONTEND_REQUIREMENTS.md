# Fonu Desk: Frontend Integration & Product Requirements Document

This document acts as the single source of truth for generating a production-ready, fully functional frontend UI and integration layer for the **Fonu Desk** ticketing SaaS application. 

It contains the **Business Requirements Document (BRD)**, **User Stories**, **System Architecture**, a complete **Database Schema/Data Model Specification**, and **Detailed API Reference Specs** including all response scenarios and flow paths.

---

## 1. Executive Summary & Core Context

### 1.1 Project Overview
**Fonu Desk** is a B2B SaaS ticketing platform that helps businesses (represented as **Organizations**) manage support requests from their business customers (**Businesses** having multiple client users) or individual clients (**Customers**). 

The platform supports tenant-switching (a single global user account can belong to multiple organizations or businesses, switching between them shifts their active workspace session and permission roles), ticket lifecycle management (with automatic or manual assignment), customer comments, internal support comments, attachments, notification mutes, and full audit logs.

### 1.2 System-Wide Architectural Context (Invisible at Code Level)
When building the frontend, the integrating model must design for the following constraints:

1. **Implicit Tenant Scoping**:
   - The frontend **must not** pass `organizationId` or `businessId` in body payloads for ticket operations, notifications, dashboards, or user queries.
   - The backend automatically resolves the user's active tenant (`organizationId`) from the JWT payload.
   - Passing tenant IDs in creation requests is a security vulnerability; always rely on the backend token scope.
   
2. **Role & Permission Management (RBAC)**:
   - A user's roles are bound to their *active organization*. 
   - Roles include:
     - `OWNER`: The creator of the organization. Full admin privileges, organization setting modifications, and billing control.
     - `ADMIN`: Administrator inside the organization. Can manage members, roles, view audit logs, assign tickets, and configure workflows.
     - `SUPPORT`: Support agent. Can pick up, assign, and comment on tickets, but cannot edit organization settings or view system-wide logs.
     - `CUSTOMER`: End-user client. Can only create tickets, comment on their own tickets, and view customer dashboards.
   - Role-based tabs (e.g. Settings, Audit Logs, Team Invites) must be conditionally hidden on the frontend using the roles extracted from the active JWT or `/users/me`.

3. **Active Tenant Switching**:
   - When a user logs in, they receive an `accessToken` which contains a `defaultOrganizationId` and active roles.
   - When a user switches workspaces, the frontend calls `PATCH /auth/switch-organization` with the selected `organizationId`.
   - The backend responds with a **new JWT token** containing the updated `organizationId` and the user's role scope for that specific workspace.
   - The frontend must replace the current token, clear/flush any cached memory (tickets, stats, active users) to avoid data leakage, and reload the application state.

4. **Notification and Email Lifecycle**:
   - Critical updates (`status` or `priority` changes, and assignments) trigger automated background emails via a centralized `EmailService` and templates.
   - Standard updates (new comment replies) trigger database-level `Notification` rows.
   - If a user mutes a ticket, the backend inserts a `TicketMute` record, automatically suppressing emails and push notifications for that specific ticket.

---

## 2. Database Schema & Data Models

Use these models to structure forms, interfaces, tables, and front-end states.

| Model Name | Field | Type | Attributes / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| **User** | `id` | UUID (String) | PK, Default: UUID | Global identifier for user. |
| | `email` | String | Unique, Required | Authentication username. |
| | `password` | String | Required | Hash stored on backend. |
| | `firstName` | String | Required | User first name. |
| | `lastName` | String | Required | User last name. |
| | `emailVerified`| Boolean | Default: `false` | Block login if `false`. |
| | `isOwner` | Boolean | Default: `false` | Indicates if they signed up as organization owner. |
| | `ownerId` | UUID (String) | Optional, Nullable | Self-relation to parent user. |
| | `createdAt` | DateTime | Default: `now()` | Registration date. |
| | `updatedAt` | DateTime | Updated automatically | Last update timestamp. |
| **Role** | `id` | UUID (String) | PK, Default: UUID | Role identifier. |
| | `name` | String | Unique, Required | Roles: `ADMIN`, `SUPPORT`, `CUSTOMER`. |
| | `createdAt` | DateTime | Default: `now()` | - |
| **OrganizationMember** | `id` | UUID (String) | PK, Default: UUID | Unique membership ID. |
| | `userId` | UUID (String) | FK, Unique index with org | Linked user. |
| | `organizationId` | UUID (String) | FK, Unique index with user | Active tenant organization. |
| | `roleId` | UUID (String) | FK | Permission role. |
| | `businessId` | UUID (String) | FK, Optional, Nullable | B2B Customer's company mapping. |
| | `isActive` | Boolean | Default: `true` | Allows deactivating users without deleting them. |
| | `deletedAt` | DateTime | Optional, Nullable | Soft-delete timestamp. |
| **Organization** | `id` | UUID (String) | PK, Default: UUID | Organization ID. |
| | `name` | String | Unique index with ownerId | Organization name. |
| | `ownerId` | UUID (String) | FK | Direct link to Owner `User`. |
| | `ticketAssignMethod` | Enum | Default: `MANUAL` | Assignment rules: `AUTO` or `MANUAL`. |
| | `createdAt` | DateTime | Default: `now()` | - |
| | `deletedAt` | DateTime | Optional, Nullable | Soft-deleted organization tracking. |
| **Business** | `id` | UUID (String) | PK, Default: UUID | B2B customer organization. |
| | `name` | String | Required | Company Name. |
| | `industry` | String | Optional, Nullable | Company Sector. |
| | `ownerId` | UUID (String) | FK | User who registered this business. |
| **Ticket** | `id` | UUID (String) | PK, Default: UUID | Ticket unique ID. |
| | `title` | String | Required | Ticket summary. |
| | `description` | String | Required | Ticket explanation. |
| | `status` | Enum | Default: `OPEN` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`. |
| | `priority` | Enum | Default: `MEDIUM` | `LOW`, `MEDIUM`, `HIGH`, `URGENT`. |
| | `createdById` | UUID (String) | FK | User creating ticket. |
| | `assignedToId` | UUID (String) | FK, Optional, Nullable | Assigned support agent. |
| | `organizationId` | UUID (String) | FK | Associated tenant workspace. |
| | `businessId` | UUID (String) | FK, Optional, Nullable | Linked business context. |
| | `createdAt` | DateTime | Default: `now()` | Submission time. |
| | `updatedAt` | DateTime | Updated automatically | Last update timestamp. |
| **TicketComment** | `id` | UUID (String) | PK, Default: UUID | - |
| | `content` | String | Required | Message body. |
| | `isInternal` | Boolean | Default: `false` | If `true`, hidden from Customers. |
| | `ticketId` | UUID (String) | FK | Associated ticket. |
| | `authorId` | UUID (String) | FK | Message author. |
| | `createdAt` | DateTime | Default: `now()` | - |
| **TicketAttachment** | `id` | UUID (String) | PK, Default: UUID | - |
| | `fileName` | String | Required | Cloudinary target name. |
| | `fileUrl` | String | Required | Cloudinary secure URL. |
| | `fileType` | String | Optional, Nullable | MIME-type. |
| | `ticketId` | UUID (String) | FK | Associated ticket. |
| | `uploadedById`| UUID (String) | FK | Uploader user. |
| **TicketHistory** | `id` | UUID (String) | PK, Default: UUID | - |
| | `fieldChanged`| String | Required | e.g. "status", "priority", "assignedToId". |
| | `oldValue` | String | Optional, Nullable | - |
| | `newValue` | String | Optional, Nullable | - |
| | `ticketId` | UUID (String) | FK | Target ticket. |
| | `changedById` | UUID (String) | FK | Modifying actor. |
| | `createdAt` | DateTime | Default: `now()` | - |
| **AuditLog** | `id` | UUID (String) | PK, Default: UUID | - |
| | `action` | String | Required | Action performed. |
| | `entityType` | String | Required | Action target type (e.g. "Ticket"). |
| | `entityId` | UUID (String) | Required | Action target ID. |
| | `details` | JSON | Optional, Nullable | Extra contextual data. |
| | `actorId` | UUID (String) | FK | Initiator user. |
| | `organizationId` | UUID (String) | FK, Optional, Nullable | Scoped organization. |
| | `createdAt` | DateTime | Default: `now()` | - |
| **Otp** | `id` | UUID (String) | PK, Default: UUID | - |
| | `email` | String | Required, Index | Scoped recipient. |
| | `code` | String | Required | 6-digit numeric verification code. |
| | `type` | String | Required | `VERIFY_EMAIL` or `RESET_PASSWORD`. |
| | `expiresAt` | DateTime | Required | Validity window (default: 15 mins). |
| **Invitation** | `id` | UUID (String) | PK, Default: UUID | - |
| | `email` | String | Required | Target invitee. |
| | `organizationId` | UUID (String) | FK | Organization workspace target. |
| | `roleId` | UUID (String) | FK | Scoped membership role. |
| | `businessId` | UUID (String) | FK, Optional, Nullable | Scoped customer business. |
| | `token` | String | Unique, Required | Invitation validation hash. |
| | `status` | String | Default: `PENDING` | `PENDING`, `ACCEPTED`. |
| | `expiresAt` | DateTime | Required | Expiration window (default: 7 days). |
| **Notification** | `id` | UUID (String) | PK, Default: UUID | - |
| | `title` | String | Required | Heading text. |
| | `content` | String | Required | Content description. |
| | `isRead` | Boolean | Default: `false` | Alert status. |
| | `userId` | UUID (String) | FK | Recipient user. |
| | `ticketId` | UUID (String) | FK, Optional, Nullable | Context ticket. |
| | `type` | String | Optional, Nullable | `ASSIGNED` or `UPDATED`. |
| **TicketMute** | `id` | UUID (String) | PK, Default: UUID | - |
| | `userId` | UUID (String) | FK, Unique index with ticket | Muting user. |
| | `ticketId` | UUID (String) | FK, Unique index with user | Muted ticket. |

---

## 3. End-to-End Client Workflows & Flowcharts

The frontend must implement these workflows sequentially:

### 3.1 Signup, Activation & Initial Workspace Registration
```
[User Signup Form] --(POST /auth/signup)--> [Success Notification]
                                                      |
                                           (Redirect to OTP Screen)
                                                      |
[Input OTP Code]   --(POST /auth/verify-email)--> [Activation Complete]
                                                      |
                                           (Redirect to Login Screen)
```

### 3.2 Login, Selection & Session Setup
1. **Login Successful**: Frontend calls `POST /auth/login` and receives the token.
2. **Fetch User Organizations**: Frontend immediately calls `GET /organizations/user/me`.
3. **Check Organizations**:
   - **No organizations**: Show Organization Registration UI (for Owner to create organization via `POST /organizations`).
   - **Single organization**: Automatically select it and load dashboard/session.
   - **Multiple organizations**: Show a Selection UI (where the user can choose which organization workspace to open, with a button to create a new organization for Owners).

### 3.3 Dynamic Organization Switching
Users can switch their active organization context at any point using the top navigation bar:
1. **Dropdown Triggered**: Clicking the active workspace name in the top navbar loads the list of organizations via `GET /organizations/user/me` (or uses cached organizations).
2. **Select & Switch**: User selects an organization from the dropdown list.
3. **Request Switch**: Frontend sends a `PATCH /auth/switch-organization` with the selected `organizationId`.
4. **Token Refresh**: The request returns a new JWT with updated roles/scopes.
5. **Flush & Refresh**: Frontend replaces the active token in storage, flushes the cached application state, and redirects the user to the dashboard.

### 3.4 Inviting and Registering Coworkers/Customers
```
[User Invites Member] --(POST /users/invite)--> [Email Link Dispatched to Invitee]
                                                               |
                                                 (Invitee clicks email link)
                                                               |
                                              [Invitee inputs Profile & Password]
                                                               |
                                              (POST /users/accept-invite)
                                                               |
                                              [Redirect Invitee to Login]
```

---

## 4. API Endpoint Reference Specs

### 4.1 Authentication Modules (`/auth`)

#### `POST /auth/signup`
- **Purpose**: Creates a brand new Owner User account.
- **Headers**: None
- **Payload**:
  ```json
  {
    "email": "owner@company.com",
    "password": "strongPassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Validation**:
  - `email`: Must be a valid email format.
  - `password`: Must be a string with a minimum length of 8 characters.
  - `firstName`, `lastName`: Must be non-empty strings.
- **Response Scenarios**:
  - **`201 Created`**: Owner registration successful.
    ```json
    { "message": "Signup successful. Please verify your email with the OTP sent." }
    ```
  - **`409 Conflict`**: Email exists already in the system.
    ```json
    { "statusCode": 409, "message": "Email already in use", "error": "Conflict" }
    ```
- **Next Step**: Store email in temporary local memory, redirect user to verification screen to input their 6-digit OTP code.

#### `POST /auth/verify-email`
- **Purpose**: Verifies email address using the code sent via email.
- **Headers**: None
- **Payload**:
  ```json
  {
    "email": "owner@company.com",
    "code": "583920"
  }
  ```
- **Validation**:
  - `email`: Must be valid email.
  - `code`: Must be a numeric string of length exactly 6.
- **Response Scenarios**:
  - **`200 OK`**:
    ```json
    { "message": "Email verified successfully." }
    ```
  - **`400 Bad Request`**: Validation error, invalid code structure, or OTP expired.
    ```json
    { "statusCode": 400, "message": "Invalid or expired OTP", "error": "Bad Request" }
    ```
- **Next Step**: Redirect user to the login page `/login`.

#### `POST /auth/resend-verification-otp`
- **Purpose**: Generates and resends a new verification code.
- **Headers**: None
- **Payload**:
  ```json
  {
    "email": "owner@company.com"
  }
  ```
- **Validation**:
  - `email`: Must be a valid email.
- **Response Scenarios**:
  - **`200 OK`**: (Always returns success message to prevent user enumeration attacks).
    ```json
    { "message": "If the email is registered, a new OTP has been sent." }
    ```
  - **`409 Conflict`**: The email is already verified.
    ```json
    { "statusCode": 409, "message": "Email is already verified.", "error": "Conflict" }
    ```

#### `POST /auth/login`
- **Purpose**: Authenticate user and issue authorization token.
- **Headers**: None
- **Payload**:
  ```json
  {
    "email": "owner@company.com",
    "password": "strongPassword123!"
  }
  ```
- **Validation**:
  - `email`: Valid email.
  - `password`: Non-empty string.
- **Response Scenarios**:
  - **`200 OK`**:
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "a9d80d44-4869-42b7-8d07-6bcfc23e8f81",
        "email": "owner@company.com",
        "firstName": "John",
        "lastName": "Doe",
        "isOwner": true,
        "defaultOrganizationId": "7df4a32a-cd20-43f1-9457-3f3679da152b"
      }
    }
    ```
  - **`401 Unauthorized`**: Bad credentials or email has not been verified yet.
    ```json
    { "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized" }
    ```
    *(or `Please verify your email before logging in`)*
- **Next Step**:
  - Store `accessToken` securely in cookie/localStorage.
  - Read `defaultOrganizationId`. If it is `null`, force route the user to `/create-organization`. If valid, navigate them to the main dashboard.

#### `PATCH /auth/switch-organization`
- **Purpose**: Change the active organization context.
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "organizationId": "7df4a32a-cd20-43f1-9457-3f3679da152b"
  }
  ```
- **Validation**:
  - `organizationId`: Must be a valid UUID.
- **Response Scenarios**:
  - **`200 OK`**:
    ```json
    {
      "accessToken": "eyJhbGciOiNewToken..."
    }
    ```
  - **`401 Unauthorized`**: Token has expired, or the user does not have permission membership inside this target organization.
    ```json
    { "statusCode": 401, "message": "You do not have access to this organization", "error": "Unauthorized" }
    ```
- **Next Step**: Swap token in store and execute a full app state/routing reload.

#### `POST /auth/forgot-password`
- **Purpose**: Request OTP code to reset password.
- **Headers**: None
- **Payload**: `{ "email": "owner@company.com" }`
- **Response**:
  - **`200 OK`**: `{ "message": "If the email exists, a reset code has been sent." }`

#### `POST /auth/change-password`
- **Purpose**: Reset password using the reset OTP.
- **Headers**: None
- **Payload**:
  ```json
  {
    "email": "owner@company.com",
    "code": "194032",
    "newPassword": "brandNewPassword123!"
  }
  ```
- **Validation**:
  - `code`: Exactly 6 characters string.
  - `newPassword`: String, minimum 8 characters.
- **Response Scenarios**:
  - **`200 OK`**: `{ "message": "Password has been successfully changed." }`
  - **`400 Bad Request`**: Invalid code or expired reset OTP.
    ```json
    { "statusCode": 400, "message": "Invalid or expired reset code", "error": "Bad Request" }
    ```

---

### 4.2 Users Modules (`/users`)

#### `GET /users/me`
- **Purpose**: Fetch profile properties of the logged-in user.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "id": "a9d80d44-4869-42b7-8d07-6bcfc23e8f81",
      "email": "owner@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "isOwner": true,
      "emailVerified": true,
      "createdAt": "2026-08-15T12:00:00.000Z",
      "updatedAt": "2026-08-15T12:00:00.000Z"
    }
    ```

#### `GET /users/organization`
- **Purpose**: Lists all registered members in the current active organization.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Response**:
  - **`200 OK`**:
    ```json
    [
      {
        "id": "e229e7b2-c0cb-4676-ac7d-1db98b7cb625",
        "userId": "a9d80d44-4869-42b7-8d07-6bcfc23e8f81",
        "organizationId": "7df4a32a-cd20-43f1-9457-3f3679da152b",
        "roleId": "role-uuid-123",
        "businessId": null,
        "isActive": true,
        "user": {
          "id": "a9d80d44-4869-42b7-8d07-6bcfc23e8f81",
          "firstName": "John",
          "lastName": "Doe",
          "email": "owner@company.com"
        },
        "role": {
          "id": "role-uuid-123",
          "name": "ADMIN",
          "description": "Administrator"
        }
      }
    ]
    ```

#### `GET /users/business/:businessId`
- **Purpose**: Returns users mapped to a specific customer Business organization.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER` only.
- **Response**:
  - **`200 OK`**: Array of `OrganizationMemberResponseDto`.
  - **`401 Unauthorized`**: User lacks OWNER privileges, or does not own this Business registry.
    ```json
    { "statusCode": 401, "message": "Only owners can access business users", "error": "Unauthorized" }
    ```

#### `GET /users/customers`
- **Purpose**: Get all members in the organization mapping to the `CUSTOMER` role.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`, `SUPPORT`
- **Query Params**: `?businessId=<uuid>` (Filter by a customer Business context)
- **Response**:
  - **`200 OK`**: Array of `OrganizationMemberResponseDto`.

#### `POST /users/invite`
- **Purpose**: Invite a team member or customer to join the active organization.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Payload**:
  ```json
  {
    "email": "newagent@company.com",
    "roleId": "role-uuid-123",
    "businessId": "optional-business-uuid"
  }
  ```
- **Validation**:
  - `email`: Valid email.
  - `roleId`: Valid UUID.
  - `businessId`: Optional, must be valid UUID if provided.
- **Response Scenarios**:
  - **`201 Created`**:
    ```json
    {
      "message": "Invitation sent successfully",
      "invitationId": "invitation-uuid-456"
    }
    ```
  - **`409 Conflict`**: Target user is already an active member of this organization.
    ```json
    { "statusCode": 409, "message": "User is already a member of this organization", "error": "Conflict" }
    ```

#### `POST /users/accept-invite`
- **Purpose**: Accept invite, register account name, and setup password.
- **Headers**: None
- **Payload**:
  ```json
  {
    "token": "invitation-token-hash-xyz",
    "firstName": "Sarah",
    "lastName": "Smith",
    "password": "secureNewPassword123!"
  }
  ```
- **Validation**:
  - `token`, `firstName`, `lastName`: Required non-empty strings.
  - `password`: String, min 8 characters.
- **Response Scenarios**:
  - **`200 OK`**:
    ```json
    { "message": "Invitation accepted successfully" }
    ```
  - **`404 Not Found`**: Token invalid.
  - **`400 Bad Request`**: Token expired.
- **Next Step**: Redirect to login `/login`.

#### `DELETE /users/:id`
- **Purpose**: Soft delete a user from the current organization.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Response**:
  - **`200 OK`**: `{ "message": "User successfully removed from organization" }`

#### `PATCH /users/:id/deactivate` & `PATCH /users/:id/activate`
- **Purpose**: Deactivate or Activate a user's membership.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Response**:
  - **`200 OK`**: `{ "message": "User successfully deactivated" }` (or activated)

#### `PATCH /users/:id/role`
- **Purpose**: Change role assigned to a user member.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Payload**: `{ "roleId": "role-uuid-123" }`
- **Response**:
  - **`200 OK`**: `{ "message": "User role updated successfully" }`

---

### 4.3 Organizations Modules (`/organizations`)

#### `POST /organizations`
- **Purpose**: Register a new Organization.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER` only.
- **Payload**: `{ "name": "Google LLC" }`
- **Validation**: `name` must be a string of at least 5 characters.
- **Response**:
  - **`201 Created`**: Returns Organization data object.
  - **`409 Conflict`**: Organization name already registered by this owner.

#### `GET /organizations/user/me`
- **Purpose**: Get all organizations the current user belongs to (either as an owner or an active member). Both for customer, support, admin, and owner. This is called right after login to let the user select/switch their active workspace organization.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`, `SUPPORT`, `CUSTOMER`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "organizations": [
        {
          "id": "7df4a32a-cd20-43f1-9457-3f3679da152b",
          "name": "Google LLC",
          "ownerId": "a9d80d44-4869-42b7-8d07-6bcfc23e8f81",
          "ticketAssignMethod": "MANUAL",
          "createdAt": "2026-08-15T12:00:00.000Z",
          "updatedAt": "2026-08-15T12:00:00.000Z"
        }
      ]
    }
    ```
- **Next Endpoint(s) to Call**:
  - Switch to selected organization using `PATCH /auth/switch-organization`.

#### `GET /organizations`
- **Purpose**: List organizations owned by the user.
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?page=1&limit=10&search=Google`
- **Response**: Paginated organization data:
  ```json
  {
    "data": [
      {
        "id": "7df4a32a...",
        "name": "Google LLC",
        "ownerId": "a9d80d44...",
        "ticketAssignMethod": "MANUAL",
        "createdAt": "2026-08-15T12:00:00Z",
        "updatedAt": "2026-08-15T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
  ```

#### `PATCH /organizations/:id/ticket-assignment`
- **Purpose**: Configure whether incoming tickets are automatically assigned (`AUTO`) or left unassigned (`MANUAL`).
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER` only.
- **Payload**: `{ "method": "AUTO" }` (or `MANUAL`)
- **Response**: `200 OK` containing the updated organization object.

---

### 4.4 Tickets Modules (`/tickets`)

#### `POST /tickets/upload-image`
- **Purpose**: Cloud uploads an image (used to get a URL to attach in ticket creation).
- **Headers**: `Authorization: Bearer <token>`
- **Payload**: `{ "base64Image": "data:image/png;base64,iVBORw0KGgo..." }`
- **Response**:
  - **`201 Created`**:
    ```json
    {
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v158/sample.jpg",
      "fileName": "sample_image_public_id"
    }
    ```

#### `POST /tickets`
- **Purpose**: Submit a new support ticket.
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "title": "System Outage",
    "description": "The cloud console shows 502 errors.",
    "priority": "HIGH",
    "businessId": "optional-business-uuid",
    "attachment": {
      "fileName": "screenshot.png",
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v158/sample.jpg",
      "fileType": "image/png"
    }
  }
  ```
- **Validation**:
  - `title`, `description`: Non-empty strings.
  - `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (Optional).
- **Response**:
  - **`201 Created`**: Returns ticket object.
  - *Behind the Scenes*: If the active Organization's `ticketAssignMethod` is `AUTO`, this endpoint automatically assigns the ticket to the agent with the lowest active ticket count, updates the database, and sends email/notification updates.

#### `POST /tickets/on-behalf`
- **Purpose**: Support agents create a ticket on behalf of a Customer who reported an issue via phone/chat.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`, `SUPPORT`
- **Payload**:
  ```json
  {
    "title": "Database Sync Failure",
    "description": "Customer called reporting sync lock.",
    "priority": "URGENT",
    "businessId": "business-uuid-123",
    "customerId": "customer-user-uuid-999"
  }
  ```
- **Response**: `201 Created` with the created ticket object.

#### `GET /tickets`
- **Purpose**: Get tickets (auto-scoped by user's role and organization).
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?page=1&limit=10&status=OPEN&priority=HIGH&search=outage`
- **Context Scoping Behavior**:
  - `CUSTOMER` role: Automatically restricted to tickets created by the user (`createdById = userId`).
  - `SUPPORT` role: Automatically restricted to tickets assigned to the user (`assignedToId = userId`).
  - `ADMIN` & `OWNER` roles: Returns all tickets in the active organization.
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "ticket-uuid-777",
          "title": "System Outage",
          "description": "The cloud console shows 502 errors.",
          "status": "OPEN",
          "priority": "HIGH",
          "createdById": "user-uuid-customer",
          "assignedToId": null,
          "organizationId": "org-uuid",
          "businessId": null,
          "createdAt": "2026-08-15T15:00:00Z",
          "updatedAt": "2026-08-15T15:00:00Z",
          "createdBy": {
            "id": "user-uuid-customer",
            "firstName": "Sarah",
            "lastName": "Smith",
            "email": "customer@client.com"
          },
          "assignedTo": null
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 10
    }
    ```

#### `GET /tickets/:id`
- **Purpose**: Fetch details of a single ticket.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Ticket object (with `createdBy` and `assignedTo` objects).
- **Security Check**: Returns `403 Forbidden` if a customer tries to read another customer's ticket.

#### `PATCH /tickets/:id`
- **Purpose**: Update details of a ticket (such as status, priority, description).
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`, `SUPPORT`
- **Payload**: `{ "status": "IN_PROGRESS", "priority": "HIGH" }`
- **Response**: `200 OK`
- **Next Step**: Updates are audited inside `TicketHistory`. If status or priority changes, notifications are pushed.

#### `PATCH /tickets/:id/assign`
- **Purpose**: Assign or reassign ticket to an agent.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Payload**: `{ "assignedToId": "agent-user-uuid" }`
- **Response**: `200 OK`

#### `POST /tickets/:id/comments`
- **Purpose**: Create a comments thread reply.
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "content": "We have resolved the 502 cluster errors.",
    "isInternal": false
  }
  ```
- **Validation**:
  - `isInternal`: If `true`, requires role role `OWNER`, `ADMIN`, or `SUPPORT`. `CUSTOMER` cannot submit or view internal notes.
- **Response**: `201 Created`

#### `GET /tickets/:id/comments`
- **Purpose**: List comment timeline for the ticket.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**: (If client is `CUSTOMER`, backend filters out `isInternal: true` entries).

#### `GET /tickets/:id/history`
- **Purpose**: Get audit trail of property updates for a ticket.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`, `SUPPORT` (Customers forbidden).
- **Response**:
  - **`200 OK`**:
    ```json
    [
      {
        "id": "history-uuid",
        "fieldChanged": "status",
        "oldValue": "OPEN",
        "newValue": "IN_PROGRESS",
        "ticketId": "ticket-uuid",
        "changedById": "agent-uuid",
        "createdAt": "2026-08-15T15:10:00Z",
        "changedBy": {
          "id": "agent-uuid",
          "firstName": "Robert",
          "lastName": "Agent"
        }
      }
    ]
    ```

#### `POST /tickets/:id/mute` & `POST /tickets/:id/unmute`
- **Purpose**: Block or subscribe to notification updates for the ticket.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` `{ "message": "Ticket muted successfully" }`

---

### 4.5 Dashboards Modules (`/dashboards`)

All statistics are scoped dynamically by the backend using the active user's current token claims.

#### 4.5.1 Admin/Owner Dashboard endpoints (Require roles: `OWNER`, `ADMIN`):

##### `GET /dashboards/admin/stats`
- **Purpose**: Load high level aggregate statistics for the Organization.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "totalTickets": 120,
      "openTickets": 45,
      "closedTickets": 60,
      "unassignedTickets": 15,
      "totalCustomers": 350,
      "totalAgents": 12
    }
    ```

##### `GET /dashboards/admin/recent-tickets`
- **Purpose**: Display the 5 most recently created tickets in the organization.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "ticket-uuid-1",
          "title": "Database Outage",
          "status": "OPEN",
          "priority": "URGENT",
          "createdAt": "2026-08-15T15:40:00Z",
          "createdBy": { "firstName": "Alice", "lastName": "Smith", "email": "alice@corp.com" },
          "assignedTo": null
        }
      ]
    }
    ```

##### `GET /dashboards/admin/recent-activity`
- **Purpose**: Retrieve the last 5 system-wide audit actions.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "audit-uuid-1",
          "action": "ASSIGN_TICKET",
          "entityType": "Ticket",
          "entityId": "ticket-uuid-1",
          "createdAt": "2026-08-15T15:42:00Z",
          "actor": { "firstName": "John", "lastName": "Doe", "email": "owner@company.com" }
        }
      ]
    }
    ```

#### 4.5.2 Support Agent Dashboard endpoints (Require role: `SUPPORT`):

##### `GET /dashboards/agent/stats`
- **Purpose**: Load queue statistics relevant for the agent.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "assignedTickets": 25,
      "openAssignedTickets": 10,
      "resolvedAssignedTickets": 15,
      "unassignedTickets": 8
    }
    ```

##### `GET /dashboards/agent/my-tickets`
- **Purpose**: Fetch the last 5 tickets assigned to this agent.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "ticket-uuid-2",
          "title": "Email Template CSS Broken",
          "status": "IN_PROGRESS",
          "priority": "MEDIUM",
          "createdAt": "2026-08-15T15:20:00Z",
          "createdBy": { "firstName": "Bob", "lastName": "Miller", "email": "bob@corp.com" }
        }
      ]
    }
    ```

##### `GET /dashboards/agent/unassigned-tickets`
- **Purpose**: Fetch the 5 latest tickets in the organization without an assigned owner.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "ticket-uuid-3",
          "title": "API Auth Error",
          "status": "OPEN",
          "priority": "HIGH",
          "createdAt": "2026-08-15T15:35:00Z",
          "createdBy": { "firstName": "Alice", "lastName": "Smith", "email": "alice@corp.com" }
        }
      ]
    }
    ```

#### 4.5.3 Customer Dashboard endpoints (Require role: `CUSTOMER`):

##### `GET /dashboards/customer/stats`
- **Purpose**: Load client-specific summary counts.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "totalTickets": 15,
      "openTickets": 5,
      "closedTickets": 10
    }
    ```

##### `GET /dashboards/customer/recent-tickets`
- **Purpose**: Get the customer's 5 latest tickets.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "ticket-uuid-5",
          "title": "Reset password issue",
          "status": "RESOLVED",
          "priority": "LOW",
          "createdAt": "2026-08-15T14:10:00Z"
        }
      ]
    }
    ```

---

### 4.6 Audit Logs (`/audit-logs`)

#### `GET /audit-logs`
- **Purpose**: Get paginated list of organization audit events.
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `OWNER`, `ADMIN`
- **Query Params**: `?page=1&limit=10&search=CREATE_TICKET&entityType=Ticket&action=CREATE_TICKET`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "audit-uuid",
          "action": "CREATE_TICKET",
          "entityType": "Ticket",
          "entityId": "ticket-uuid-1",
          "details": { "title": "System Outage", "hasAttachment": false },
          "actorId": "user-uuid",
          "organizationId": "org-uuid",
          "createdAt": "2026-08-15T15:00:00Z",
          "actor": {
            "id": "user-uuid",
            "firstName": "John",
            "lastName": "Doe",
            "email": "owner@company.com"
          }
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 10
    }
    ```

---

### 4.7 Notifications (`/notifications`)

#### `GET /notifications`
- **Purpose**: Get the current user's unread & read notification events.
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `?page=1&limit=10`
- **Response**:
  - **`200 OK`**:
    ```json
    {
      "data": [
        {
          "id": "notification-uuid",
          "title": "New Ticket Assigned",
          "content": "You have been assigned to ticket: System Outage",
          "isRead": false,
          "userId": "user-uuid-agent",
          "ticketId": "ticket-uuid-1",
          "type": "ASSIGNED",
          "createdAt": "2026-08-15T15:00:05Z",
          "updatedAt": "2026-08-15T15:00:05Z"
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

#### `PATCH /notifications/read`
- **Purpose**: Mark multiple alerts read.
- **Headers**: `Authorization: Bearer <token>`
- **Payload**:
  ```json
  {
    "notificationIds": [
      "notification-uuid-1",
      "notification-uuid-2"
    ]
  }
  ```
- **Validation**:
  - `notificationIds`: Non-empty array of valid UUID strings.
- **Response**:
  - **`200 OK`**: `{ "message": "Notifications marked as read successfully" }`

---

## 5. UI Integration Errors & Exceptions Reference

The frontend must capture and gracefully show errors based on their status code context.

```json
{
  "statusCode": 400,
  "message": ["email must be a valid email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

- **`400 Bad Request`**: Validation failed. Iterate over the `message` array and highlight corresponding form elements.
- **`401 Unauthorized`**: Token invalid, expired, or credentials failed. Wipe storage token and redirect to `/login` with a banner.
- **`403 Forbidden`**: RBAC permissions violation. Render a block/access-denied graphic instead of letting the user browse.
- **`404 Not Found`**: Entity removed or does not exist. Show a standard 404 message or redirect to dashboard list views.
- **`409 Conflict`**: Operation locked (e.g. duplicate username, duplicate organization name). Notify user with an inline overlay banner.
