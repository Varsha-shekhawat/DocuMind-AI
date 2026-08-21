# Frontend routes

| Route | Purpose |
| --- | --- |
| `/` | Editorial introduction to UNFOLD and the paper-to-understanding workflow. |
| `/login` | Mock sign-in screen for returning users. |
| `/register` | Mock account creation screen for new users. |
| `/forgot-password` | Mock password reset request screen. |
| `/documents` | Document archive with searchable mock documents. |
| `/documents/new` | Upload workspace with a paper-like drag-and-drop zone. |
| `/documents/:id/processing` | Mock analysis timeline showing document processing stages. |
| `/documents/:id` | Results workspace with document preview, summary, key points, main ideas, and suggestions. |
| `/settings` | Mock profile and preference controls. |

All routes are frontend-only during this milestone. Navigation uses local mock state and does not create sessions, upload files to a server, or call AI services.