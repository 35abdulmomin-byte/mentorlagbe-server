# MentorLagbe Server

REST API for the **MentorLagbe** tuition platform, built with Express, MongoDB, BetterAuth, JWT and Stripe.

## Purpose

Powers authentication, role-based access, tuition listings, applications, admin moderation and Stripe subscription payments for the MentorLagbe client.

## Live URL

- **API:** https://mentorlagbe-server-3xld.vercel.app
- **Client (Live Site):** https://mentorlagbe-client-gules.vercel.app
- **Client Repository:** https://github.com/35abdulmomin-byte/mentorlagbe-client

## Admin Credentials

| Role  | Email                 | Password          |
|-------|-----------------------|-------------------|
| Admin | admin@mentorlagbe.com |Admin@12345 |
| Tutor |35abdulmomin@gmail.com       | asd123  |

The admin account is created automatically on server start from the `ADMIN_*` environment variables.

## Database Design (4 Collections)

| Collection     | Purpose                                                       |
|----------------|---------------------------------------------------------------|
| `users`        | All users, role (`student`, `tutor`, `admin`), plan, profile  |
| `tuitions`     | Tuition posts with approval status and active flag            |
| `applications` | Student applications linked to tuitions and tutors            |
| `payments`     | Stripe Pro plan transaction records                           |

## Key Features

- BetterAuth with MongoDB adapter; JWT issued after login
- Custom middlewares: `verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`
- Public tuitions API with **server-side** search, filter (class level, mode, subject), sort and pagination (`skip` / `limit`)
- Student applications with duplicate prevention and pending-only cancel
- Tutor CRUD, active/closed toggle, applicant management, Free plan limit of 2 posts
- Admin: stats, user role management, tuition approval/revoke, transaction list
- Stripe Checkout session, payment verification, optional webhook, user plan upgrade to `pro`
- Seed script with 12 realistic approved tuitions
- Role and plan changes blocked from client-side profile updates

## API Overview

| Area         | Endpoints                                                                 |
|--------------|---------------------------------------------------------------------------|
| Auth         | `/api/auth/*` (BetterAuth), `POST /jwt`                                   |
| Tuitions     | `GET /tuitions`, `GET /tuitions/filters`, `GET /tuitions/:id`             |
| Applications | `POST /applications`, `GET /applications/my`, `DELETE /applications/:id`  |
| Tutor        | `/tutor/stats`, `/tutor/tuitions`, `/tutor/applicants`                    |
| Admin        | `/admin/stats`, `/admin/users`, `/admin/tuitions`, `/admin/transactions`  |
| Payments     | `POST /payments/checkout`, `POST /payments/verify`, `/webhook/stripe`     |

## NPM Packages Used

`express`, `cors`, `dotenv`, `mongodb`, `jsonwebtoken`, `better-auth`, `stripe`, `nodemon`


## Run Locally

```bash
npm install
npm run seed
npm run dev
```