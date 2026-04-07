# Graduation Project Management Platform - Backend

Backend API for managing graduation projects, reports, meetings, comments, files, and notifications.

## Tech Stack

- NestJS 11
- Prisma ORM 7 + PostgreSQL
- JWT Authentication (`@nestjs/jwt`, `passport-jwt`)
- Role-based authorization (global guards + `@Roles` decorator)
- Multer file upload
- `class-validator` + `class-transformer`

## Implemented Modules

- `auth`
- `projects`
- `files`
- `reports`
- `comments`
- `meetings`
- `notifications`
- `prisma`

## Project Structure

```txt
src/
+-- auth/
+-- comments/
+-- common/
+-- files/
+-- generated/prisma/
+-- meetings/
+-- notifications/
+-- prisma/
+-- projects/
+-- reports/
prisma/
+-- migrations/
+-- schema.prisma
+-- seed.ts
```

## Environment Variables

Create `.env` in project root:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/grad_db?schema=public
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800
ADMIN_EMAIL=admin@grad.local
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=Department Head
ADMIN_DEPARTMENT=Computer Science
```

## Installation & Run

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed:admin
npm run start:dev
```

Default server URL: `http://localhost:3000`

## Available Scripts

```bash
npm run start
npm run start:dev
npm run start:prod
npm run build
npm run lint
npm run test
npm run test:e2e
npm run seed:admin
```

## Authentication & Authorization

### JWT

- `POST /auth/register` and `POST /auth/login` are public.
- All other routes require:
  - `Authorization: Bearer <token>`

JWT payload contains:

- `sub` (user id)
- `email`
- `name`
- `role`

### Roles

`Role` enum:

- `STUDENT`
- `SUPERVISOR`
- `HEAD`

Authorization behavior:

- `@Roles(Role.STUDENT)` -> student only
- `@Roles(Role.SUPERVISOR)` -> supervisor only
- `@Roles(Role.HEAD)` -> head only
- No `@Roles` decorator -> any authenticated user

Global guards:

- `JwtAuthGuard` (global)
- `RolesGuard` (global)

### Validation

Global `ValidationPipe` is enabled with:

- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

## Database Model Summary

Core models in `prisma/schema.prisma`:

- `User`
- `Project`
- `ProjectFile`
- `ProgressReport`
- `Comment`
- `Meeting`
- `Notification`

Enums:

- `Role`
- `ProjectStatus` -> `PENDING_APPROVAL`, `APPROVED`, `IN_PROGRESS`, `UNDER_REVIEW`, `COMPLETED`, `REJECTED`
- `FileType` -> `PROPOSAL`, `PROGRESS_REPORT`, `FINAL_REPORT`, `PRESENTATION`, `OTHER`

## API Endpoints

Note: except `GET /` and auth endpoints, all routes require JWT.

### System

- `GET /` -> health check (`Hello World!`)

### Auth

- `POST /auth/register`
- `POST /auth/login`

Register body:

```json
{
  "name": "Student User",
  "email": "student1@example.com",
  "password": "Student@123",
  "role": "STUDENT",
  "department": "Computer Science"
}
```

Login body:

```json
{
  "email": "student1@example.com",
  "password": "Student@123"
}
```

### Projects

- `GET /projects` -> list projects (role-filtered)
- `POST /projects` -> create project (`STUDENT`)
- `GET /projects/:id` -> project details
- `PATCH /projects/:id` -> update title/description/progress (`STUDENT`, `SUPERVISOR` with ownership checks)
- `PATCH /projects/:id/status` -> change status (`HEAD`, `SUPERVISOR`)
- `PATCH /projects/:id/supervisor` -> assign supervisor (`HEAD`)
- `DELETE /projects/:id` -> delete project (`HEAD`)

Create project body:

```json
{
  "title": "AI Graduation Assistant",
  "description": "Management platform for graduation projects",
  "techStack": ["NestJS", "PostgreSQL", "Prisma"],
  "progress": 0
}
```

Update project body:

```json
{
  "title": "AI Graduation Assistant v2",
  "description": "Updated scope",
  "progress": 45
}
```

Update status body:

```json
{
  "status": "UNDER_REVIEW"
}
```

Assign supervisor body:

```json
{
  "supervisorId": "22222222-2222-2222-2222-222222222222"
}
```

### Files

- `POST /files/upload/:projectId` -> upload file
- `GET /files/:projectId` -> list project files
- `DELETE /files/:fileId` -> delete file

Upload request type:

- `multipart/form-data`
- fields:
  - `file` (file, required)
  - `type` (text, optional enum `FileType`)

Size limit:

- from `MAX_FILE_SIZE` (default in env: `52428800` = 50 MB)

### Reports

- `POST /reports/:projectId` -> add report (`STUDENT`, owner only)
- `GET /reports/:projectId` -> list reports

Create report body:

```json
{
  "content": "Completed API authentication and role guards.",
  "weekNumber": 3
}
```

### Comments

- `POST /comments/:projectId` -> add comment (`SUPERVISOR` or `HEAD`)
- `GET /comments/:projectId` -> list comments

Create comment body:

```json
{
  "content": "Good progress. Please share architecture diagrams."
}
```

### Meetings

- `POST /meetings/:projectId` -> schedule meeting (`SUPERVISOR`, assigned supervisor)
- `GET /meetings/:projectId` -> list meetings
- `PATCH /meetings/:id` -> update meeting (`SUPERVISOR`, assigned supervisor)

Create meeting body:

```json
{
  "scheduledAt": "2026-04-14T10:00:00.000Z",
  "location": "Room 204",
  "notes": "Discuss progress and blockers"
}
```

Update meeting body:

```json
{
  "scheduledAt": "2026-04-14T11:00:00.000Z",
  "location": "Google Meet",
  "notes": "Updated to online meeting"
}
```

### Notifications

- `GET /notifications/me` -> get current user notifications
- `PATCH /notifications/:id/read` -> mark one notification as read
- `PATCH /notifications/read-all` -> mark all notifications as read

## Notification Triggers

The backend creates notifications automatically when:

- project status changes -> notify student
- supervisor assigned to project -> notify student
- new comment added -> notify student
- new meeting scheduled -> notify student
- new progress report uploaded -> notify supervisor

## Seed Admin User

Run:

```bash
npm run seed:admin
```

Behavior:

- creates admin if not exists
- if exists by `ADMIN_EMAIL`, updates profile and enforces role `HEAD`

## Postman Collection

Collection file in project root:

`GraduationProjectManagementPlatform.postman_collection.json`

Import this file into Postman, then set:

- `base_url`
- `token`
- IDs (`project_id`, `file_id`, `meeting_id`, `notification_id`) as needed

## Common Error Responses

- `400 Bad Request` -> validation error / duplicate email / missing file
- `401 Unauthorized` -> missing/invalid JWT
- `403 Forbidden` -> role or ownership violation
- `404 Not Found` -> project/file/meeting/notification not found
