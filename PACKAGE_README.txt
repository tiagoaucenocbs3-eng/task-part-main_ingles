Mentoria package - Task Partners initial offer + tasks app

This version is prepared for someone learning/reusing the full project.

Important difference from the live production version:
- The raw home route / no longer redirects to /landingpage.
- This means opening the domain root / should load the initial offer/funnel directly.
- Campaign URLs with parameters still work normally.

Included:
- Initial home/funnel source routes and public assets.
- Task Partners deliverable app route: /tasks-app.
- Static/public assets, videos, legal pages, thanks page, /lp page.

Not included:
- node_modules
- .git
- .env.local or API keys

How to run after extracting:
1. Install dependencies with npm install or bun install.
2. Add any required environment variables in the host/dashboard, not inside this zip.
3. Run npm run dev.
4. Main paths:
   - / opens the initial offer/funnel directly in this mentoria version
   - /tasks-app opens the Task Partners deliverable
   - /thanks opens the confirmation page
   - /lp opens the SaaS landing page
