# Deployment Checklist

Use this checklist during **staging** and **production** deployments to validate core features and visual consistency.

- [ ] **Page navigation** – Verify every page is reachable via the intended navigation paths, all links work, and there are no missing or broken routes.
- [ ] **Gabarito generation/correction** – Generate a sample gabarito, upload it for correction, and confirm the correction results are accurate and stored.
- [ ] **Redação submission/review** – Submit a redação, ensure it is saved, reviewers can access it, and feedback cycles function properly.
- [ ] **Notification delivery** – Trigger emails or in-app notifications and confirm they are delivered to the correct recipients without delay.
- [ ] **Consistent branding/visual identity** – Check that logos, color schemes, typography, and other branding elements match design guidelines across all pages and devices.
- [ ] **Environment configuration** – Ensure Node.js 20 is selected in Vercel project settings and all required environment variables are set (see `.env.example`).

Keep this checklist up to date as new features are added.
