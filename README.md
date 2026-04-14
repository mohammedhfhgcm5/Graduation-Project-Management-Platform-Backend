# 🎓 Graduation Project Management Platform — Backend API

> A robust NestJS backend for managing graduation projects, progress tracking, meetings, file uploads, comments, and smart notifications — built for academic environments.

---

## 📚 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Authentication & Authorization](#-authentication--authorization)
- [Database Models](#-database-models)
- [API Reference](#-api-reference)
  - [System](#system)
  - [Auth](#auth)
  - [Projects](#projects)
  - [Files](#files)
  - [Reports](#reports)
  - [Comments](#comments)
  - [Meetings](#meetings)
  - [Notifications](#notifications)
- [Notification Triggers](#-notification-triggers)
- [Seeding Admin User](#-seeding-admin-user)
- [Postman Collection](#-postman-collection)
- [Error Responses](#-common-error-responses)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Auth | JWT (`@nestjs/jwt`, `passport-jwt`) |
| Validation | `class-validator` + `class-transformer` |
| File Upload | Multer |

---

## 📁 Project Structure

```
src/
├── auth/
├── comments/
├── common/
├── files/
├── generated/prisma/
├── meetings/
├── notifications/
├── prisma/
├── projects/
└── reports/

prisma/
├── migrations/
├── schema.prisma
└── seed.ts
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed the admin user
npm run seed:admin

# 5. Start in development mode
npm run start:dev
```

> Server runs at: **`http://localhost:3000`**

### Available Scripts

| Script | Description |
|---|---|
| `npm run start` | Start in production mode |
| `npm run start:dev` | Start with hot-reload (development) |
| `npm run start:prod` | Start compiled production build |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run seed:admin` | Create or update the admin user |

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/grad_db?schema=public

JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800        # 50 MB

ADMIN_EMAIL=admin@grad.local
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=Department Head
ADMIN_DEPARTMENT=Computer Science
```

---

## 🔑 Authentication & Authorization

### JWT Flow

- `POST /auth/register` and `POST /auth/login` are **public** — no token required.
- All other routes require:

```
Authorization: Bearer <token>
```

**JWT Payload:**

```json
{
  "sub": "<user-id>",
  "email": "user@example.com",
  "name": "User Name",
  "role": "STUDENT | SUPERVISOR | HEAD"
}
```

### Roles

| Role | Description |
|---|---|
| `STUDENT` | Can create projects, submit reports, upload files |
| `SUPERVISOR` | Can add comments, schedule meetings, update project status |
| `HEAD` | Full access — approve projects, assign supervisors, delete projects |

**Authorization behavior:**

- `@Roles(Role.STUDENT)` → students only
- `@Roles(Role.SUPERVISOR)` → supervisors only
- `@Roles(Role.HEAD)` → department head only
- No `@Roles` decorator → any authenticated user

**Global Guards:** `JwtAuthGuard` + `RolesGuard` are applied globally.

### Validation

`ValidationPipe` is globally enabled with:

```ts
{ whitelist: true, transform: true, forbidNonWhitelisted: true }
```

---

## 🗄 Database Models

### Core Models

| Model | Purpose |
|---|---|
| `User` | Students, supervisors, and department heads |
| `Project` | Graduation projects with status tracking |
| `ProjectFile` | Uploaded documents linked to a project |
| `ProgressReport` | Weekly progress reports submitted by students |
| `Comment` | Supervisor/head feedback on projects |
| `Meeting` | Scheduled meetings between student and supervisor |
| `Notification` | In-app alerts for users |

### Enums

**`Role`**
```
STUDENT | SUPERVISOR | HEAD
```

**`ProjectStatus`**
```
PENDING_APPROVAL → APPROVED → IN_PROGRESS → UNDER_REVIEW → COMPLETED
                                                           ↘ REJECTED
```

**`FileType`**
```
PROPOSAL | PROGRESS_REPORT | FINAL_REPORT | PRESENTATION | OTHER
```

---

## 📡 API Reference

> **Note:** All routes except `GET /` and `/auth/*` require a valid JWT.

---

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check — returns `Hello World!` |

---

### Auth

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user | ❌ |
| `POST` | `/auth/login` | Login and receive JWT | ❌ |

**Register:**

```json
{
  "name": "Student User",
  "email": "student1@example.com",
  "password": "Student@123",
  "role": "STUDENT",
  "department": "Computer Science"
}
```

**Login:**

```json
{
  "email": "student1@example.com",
  "password": "Student@123"
}
```

---

### Projects

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/projects` | List projects (role-filtered) | Any |
| `POST` | `/projects` | Create a new project | `STUDENT` |
| `GET` | `/projects/:id` | Get project details | Any |
| `PATCH` | `/projects/:id` | Update title / description / progress | `STUDENT`, `SUPERVISOR` |
| `PATCH` | `/projects/:id/status` | Change project status | `HEAD`, `SUPERVISOR` |
| `PATCH` | `/projects/:id/supervisor` | Assign a supervisor | `HEAD` |
| `DELETE` | `/projects/:id` | Delete a project | `HEAD` |

**Controller Example (`GET /projects`):**

```ts
@Get()
listProjects(@CurrentUser() user: AuthUser, @Query() query: ListProjectsDto) {
  return this.projectsService.listProjects(user, query);
}
```

**Projects Query Types:**

```ts
export interface ProjectsQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  search?: string;
}

export type ProjectStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';
```

**Example Query:**

```http
GET /projects?page=1&limit=20&status=UNDER_REVIEW&search=ai
```

**Create Project:**

```json
{
  "title": "AI Graduation Assistant",
  "description": "Management platform for graduation projects",
  "techStack": ["NestJS", "PostgreSQL", "Prisma"],
  "progress": 0
}
```

**Update Project:**

```json
{
  "title": "AI Graduation Assistant v2",
  "description": "Updated scope",
  "progress": 45
}
```

**Update Status:**

```json
{ "status": "UNDER_REVIEW" }
```

**Assign Supervisor:**

```json
{ "supervisorId": "22222222-2222-2222-2222-222222222222" }
```

---

### Files

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/files/upload/:projectId` | Upload a file | Any |
| `GET` | `/files/:projectId` | List files for a project | Any |
| `DELETE` | `/files/:fileId` | Delete a file | Any |

**Upload:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | File | ✅ | The file to upload |
| `type` | String | ❌ | One of `FileType` enum values |

> **Size limit:** `MAX_FILE_SIZE` (default: 50 MB)

---

### Reports

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/reports/:projectId` | Submit a progress report | `STUDENT` (owner only) |
| `GET` | `/reports/:projectId` | List reports for a project | Any |

**Create Report:**

```json
{
  "content": "Completed API authentication and role guards.",
  "weekNumber": 3
}
```

---

### Comments

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/comments/:projectId` | Add a comment | `SUPERVISOR`, `HEAD` |
| `GET` | `/comments/:projectId` | List comments for a project | Any |

**Create Comment:**

```json
{
  "content": "Good progress. Please share architecture diagrams."
}
```

---

### Meetings

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/meetings/:projectId` | Schedule a meeting | `SUPERVISOR` (assigned only) |
| `GET` | `/meetings/:projectId` | List meetings for a project | Any |
| `PATCH` | `/meetings/:id` | Update meeting details | `SUPERVISOR` (assigned only) |

**Schedule Meeting:**

```json
{
  "scheduledAt": "2026-04-14T10:00:00.000Z",
  "location": "Room 204",
  "notes": "Discuss progress and blockers"
}
```

**Update Meeting:**

```json
{
  "scheduledAt": "2026-04-14T11:00:00.000Z",
  "location": "Google Meet",
  "notes": "Updated to online meeting"
}
```

---

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications/me` | Get current user's notifications |
| `PATCH` | `/notifications/:id/read` | Mark a single notification as read |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read |

---

## 🔔 Notification Triggers

Notifications are created **automatically** by the system when:

| Event | Notified User |
|---|---|
| Project status changes | Student |
| Supervisor assigned to project | Student |
| New comment added | Student |
| New meeting scheduled | Student |
| New progress report submitted | Supervisor |

---

## 🌱 Seeding Admin User

```bash
npm run seed:admin
```

**Behavior:**
- If the admin email does not exist → creates a new admin user.
- If the admin email already exists → updates profile and enforces `HEAD` role.

Admin credentials are read from `.env`:

```
ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_DEPARTMENT
```

---

## 📮 Postman Collection

A ready-to-use Postman collection is included in the project root:

```
GraduationProjectManagementPlatform.postman_collection.json
```

**Import it into Postman, then configure these variables:**

| Variable | Description |
|---|---|
| `base_url` | e.g. `http://localhost:3000` |
| `token` | JWT received from `/auth/login` |
| `project_id` | ID of the target project |
| `file_id` | ID of the target file |
| `meeting_id` | ID of the target meeting |
| `notification_id` | ID of the target notification |

---

## ⚠️ Common Error Responses

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation error, duplicate email, or missing file |
| `401 Unauthorized` | Missing or invalid JWT token |
| `403 Forbidden` | Role or ownership violation |
| `404 Not Found` | Project, file, meeting, or notification not found |
