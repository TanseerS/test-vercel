# Vercel ↔ AWS Connection Tester

A Next.js app for verifying that your Vercel-hosted frontend can reach your AWS VPC backend (RDS-backed).

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Your AWS backend base URL (e.g. `http://1.2.3.4:3000` or `https://api.yourdomain.com`) |
| `NEXT_PUBLIC_API_TOKEN` | Bearer token for the protected `/vendor-services` endpoint |

---

## Deploying to Vercel

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Import the project in [vercel.com/new](https://vercel.com/new).
3. Add environment variables in **Project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_API_TOKEN`
4. Deploy.

---

## AWS / Backend Setup Checklist

### Security Group (EC2 / ALB)
Allow **inbound** traffic on your backend port from Vercel's egress IPs.
- For testing: allow `0.0.0.0/0` on the backend port temporarily.
- For production: use [Vercel's published IP ranges](https://vercel.com/docs/edge-network/regions).

### CORS
Your backend must allow the Vercel domain as an origin:

```
Access-Control-Allow-Origin: https://your-app.vercel.app
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

Or during testing:
```
Access-Control-Allow-Origin: *
```

### VPC / Private Subnet
If your RDS is in a private subnet with no public IP, your backend (EC2/ECS/Lambda) must:
- Have a public IP or be behind an ALB with a public listener.
- Be able to reach RDS within the same VPC (security groups must allow it).

---

## Endpoints Tested

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/v1/health` | None | Basic reachability |
| `GET /api/v1/username/check?username=X` | None | RDS query |
| `GET /api/v1/vendors` | None | Public data fetch |
| `GET /api/v1/vendor-services` | Bearer token | Protected route |

---

## Project Structure

```
src/
  app/
    page.tsx         # Dashboard UI
    page.module.css  # Styles
    layout.tsx       # Root layout
    globals.css      # CSS variables & reset
  lib/
    api.ts           # All API calls
```
