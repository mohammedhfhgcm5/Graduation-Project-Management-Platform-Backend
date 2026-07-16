# Discussion Schedules Frontend Guide

Base URL variable: `{{base_url}}`  
All endpoints require `Authorization: Bearer <token>`.

## Feature Summary

This feature lets a supervisor or department head create a graduation project discussion schedule and export it as a PDF table.

Roles:

- `SUPERVISOR` and `HEAD`: create, update, delete schedules.
- Any authenticated user: list schedules, view a schedule, download the PDF.

## Endpoints

### List schedules

`GET /discussion-schedules`

Optional query params:

- `page`
- `limit`
- `academicYear`
- `semester`
- `date` as ISO date, example `2026-02-17`

### Get schedule details

`GET /discussion-schedules/:id`

### Create schedule

`POST /discussion-schedules`

```json
{
  "title": "لجان مشاريع التخرج 2025-2026 - فصل أول",
  "academicYear": "2025-2026",
  "semester": "فصل أول",
  "discussionDate": "2026-02-17T00:00:00.000Z",
  "department": "قسم الاتصالات والمعلوماتية",
  "location": "قاعة المناقشات",
  "chairName": "د. هنادي جاديا",
  "items": [
    {
      "projectId": "PROJECT_UUID",
      "committeeNames": ["د. هنادي جاديا", "د. إياد هلالي", "د. سامر خزاعي"],
      "startsAt": "2026-02-17T09:00:00.000Z",
      "endsAt": "2026-02-17T09:40:00.000Z",
      "room": "قاعة 1",
      "slotOrder": 1
    }
  ]
}
```

If the item has `projectId`, the backend snapshots `projectTitle`, `studentNames`, and `supervisorNames` from the project. For manual rows without a project, send:

```json
{
  "projectTitle": "تطبيق شركة حوالات مالية",
  "studentNames": ["محمد أمير عويضة", "مياس توكور"],
  "supervisorNames": ["د. سامر خزاعي", "د. أيمن نعال"],
  "committeeNames": ["د. هنادي جاديا", "د. إياد هلالي"],
  "startsAt": "2026-02-17T09:00:00.000Z",
  "endsAt": "2026-02-17T09:40:00.000Z",
  "room": "قاعة 1",
  "slotOrder": 1
}
```

### Update schedule

`PATCH /discussion-schedules/:id`

Send any schedule fields to update. If you include `items`, the backend replaces the full table rows with the sent array.

### Delete schedule

`DELETE /discussion-schedules/:id`

### Download PDF

`GET /discussion-schedules/:id/pdf`

Axios example:

```ts
const response = await api.get(`/discussion-schedules/${scheduleId}/pdf`, {
  responseType: 'blob',
});

const blob = new Blob([response.data], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `discussion-schedule-${scheduleId}.pdf`;
link.click();
URL.revokeObjectURL(url);
```

## Suggested UI Fields

- Schedule header: `title`, `academicYear`, `semester`, `discussionDate`, `department`, `location`, `chairName`.
- Table rows: `projectId` or manual project data, `committeeNames`, `startsAt`, `endsAt`, `room`, `slotOrder`.
- Use a project picker when possible so the backend can fill students, supervisors, and project title automatically.
- Add row reorder controls and send the final order as `slotOrder`.

## Response Notes

Each schedule response includes:

- `createdBy`
- `items`
- Each item has snapshot fields: `projectTitle`, `studentNames`, `supervisorNames`, `committeeNames`, `startsAt`, `endsAt`, `room`, `slotOrder`.
- If a row was linked to a project, `project` is also included.
