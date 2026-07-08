# AWS database setup for Orion

Orion uses the same AWS account pattern as Lara, with a **separate** RDS database and credentials.

## 1. Local development

```bash
docker compose up -d db
npm run db:setup
```

Postgres runs on host port **5434** (user `orion`, database `orion_development`).

## 2. Create staging RDS (new instance)

Prerequisites: AWS CLI logged in (`aws login` or `aws configure`).

```bash
export ORION_DB_PASSWORD='choose-a-strong-password'
chmod +x scripts/aws-rds-create-orion-staging.sh
./scripts/aws-rds-create-orion-staging.sh
```

This creates:

| Setting | Value |
|---------|-------|
| Instance ID | `orion-staging-db` |
| Engine | PostgreSQL 16 |
| Class | `db.t4g.micro` (free tier) |
| Database name | `orion_staging` |
| Master user | `orion_admin` |
| Region | `eu-north-1` (same as Lara) |
| Security group | Same as Lara (`RDS_SECURITY_GROUP_ID`) |

Wait until status is **available** (5–10 minutes), then open Postgres to Railway:

```bash
./scripts/aws-rds-allow-railway-staging.sh
```

## 3. Connection string for Railway

```text
postgresql://orion_admin:YOUR_PASSWORD@orion-staging-db.<id>.eu-north-1.rds.amazonaws.com:5432/orion_staging?sslmode=require
```

Set on the **orion** API service:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Full URL above |
| `RAILS_ENV` | `production` |
| `SECRET_KEY_BASE` | `cd api && bin/rails secret` |
| `ORION_CLIENT_URL` | `https://orion-client-staging.up.railway.app` |

Helper script (after exporting `DATABASE_URL`):

```bash
export DATABASE_URL='postgresql://...'
./scripts/railway-staging-api.sh
```

Migrations run automatically on deploy via `db:prepare` in `railway.json`.

## 4. Security

- Do not commit passwords or `DATABASE_URL` to Git
- Use a different password from Lara's RDS
- Restrict the security group when Railway static egress IPs are available

## 5. Local vs AWS

| Environment | Database |
|-------------|----------|
| Local dev | Docker Postgres on `:5434` |
| Railway staging | AWS RDS `orion_staging` |
