# AWS database setup for Orion (optional)

> **Default:** Orion does **not** require AWS. Use **Docker Postgres** locally and **Railway Postgres** (or another managed Postgres) for Railway production. Only follow this guide if you explicitly want a separate AWS RDS instance.

Orion can use the same AWS account pattern as Lara, with a **separate** RDS database and credentials. All settings below are constrained to **AWS Free Tier** where possible — deviating from them can incur charges.

## Free tier limits (read before creating anything)

AWS RDS free tier (first **12 months** on a new AWS account, one instance per account):

| Resource | Free tier allowance |
|----------|---------------------|
| Instance hours | 750 hours/month of **Single-AZ** `db.t2.micro`, `db.t3.micro`, or `db.t4g.micro` |
| Storage | 20 GB General Purpose (SSD) |
| Backup storage | 20 GB (automated backups only) |

**Charges you can still incur even on free tier:**

- A **second** RDS instance if Lara (or another project) already uses the account's free tier slot
- Storage above 20 GB, or enabling storage autoscaling above 20 GB
- Multi-AZ, read replicas, or instance classes larger than micro
- Backup retention beyond what free backup storage covers
- Data transfer out (minimal for Railway → RDS queries, but not zero)
- Running the instance 24/7 after free tier expires (~$12–15/month for `db.t4g.micro` + storage)

The create script enforces free-tier-safe defaults. **Do not change instance class, storage, or Multi-AZ in the AWS Console** unless you accept billing risk.

## 1. Local development (default)

```bash
docker compose up -d db
npm run db:setup
```

Postgres runs on host port **5434** (user `orion`, database `orion_development`). No AWS involved.

## 2. Railway production (default — no AWS)

Recommended: add a **Postgres** plugin/service in Railway (**production** environment) and link it to the **orion** API service. Railway sets `DATABASE_URL` automatically.

Import against Railway production:

```bash
npm run import:south-yorkshire -- --production
```

This fetches `DATABASE_PUBLIC_URL` from Railway when `DATABASE_URL` is unset.

## 3. Optional: create staging RDS (free tier only)

Prerequisites: AWS CLI logged in (`aws login` or `aws configure`), and a **free tier slot still available** on the account.

```bash
export ORION_DB_PASSWORD='choose-a-strong-password'
chmod +x scripts/aws-rds-create-orion-staging.sh
./scripts/aws-rds-create-orion-staging.sh
```

The script creates:

| Setting | Value |
|---------|-------|
| Instance ID | `orion-staging-db` |
| Engine | PostgreSQL 16 |
| Class | `db.t4g.micro` (override with `ORION_DB_INSTANCE_CLASS=db.t3.micro` if needed) |
| Storage | 20 GB gp3, **no autoscaling** (`max allocated storage = 20`) |
| Multi-AZ | **Off** |
| Backups | 1 day retention (minimum; delete instance when not needed to avoid post–free-tier cost) |
| Performance Insights | **Off** |
| Enhanced monitoring | **Off** |
| Database name | `orion_staging` |
| Master user | `orion_admin` |
| Region | `eu-north-1` (same as Lara) |
| Security group | Same as Lara (`RDS_SECURITY_GROUP_ID`) |

Wait until status is **available** (5–10 minutes), then open Postgres to Railway:

```bash
./scripts/aws-rds-allow-railway-staging.sh
```

### Stay on free tier in the AWS Console

After creation, verify in **RDS → Databases → orion-staging-db**:

1. **Instance class** — `db.t4g.micro` or `db.t3.micro` only
2. **Multi-AZ** — No
3. **Storage** — 20 GiB; **Maximum storage threshold** — 20 GiB (autoscaling disabled)
4. **Backup retention** — 1 day (do not increase)
5. **Performance Insights** — Off
6. **Enhanced Monitoring** — Disabled

When you no longer need staging RDS, **delete the instance** (and skip final snapshot unless required) to stop charges after free tier ends.

## 4. Connection string for Railway (RDS path only)

If using AWS RDS instead of Railway Postgres:

```text
postgresql://orion_admin:YOUR_PASSWORD@orion-staging-db.<id>.eu-north-1.rds.amazonaws.com:5432/orion_staging?sslmode=require
```

Set on the **orion** API service:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Full URL above |
| `RAILS_ENV` | `production` |
| `SECRET_KEY_BASE` | `cd api && bin/rails secret` |
| `ORION_CLIENT_URL` | `https://orion-client-production.up.railway.app` |

Helper script (after exporting `DATABASE_URL`):

```bash
export DATABASE_URL='postgresql://...'
./scripts/railway-staging-api.sh
```

Migrations run automatically on deploy via `db:prepare` in `railway.json`.

## 5. Security

- Do not commit passwords or `DATABASE_URL` to Git
- Use a different password from Lara's RDS
- Restrict the security group when Railway static egress IPs are available (opening `5432` to `0.0.0.0/0` is convenient but not ideal)

## 6. Where each environment runs

| Environment | Database (default) |
|-------------|-------------------|
| Local dev | Docker Postgres on `:5434` |
| Railway production | **Railway Postgres** (recommended) |
| Railway production (optional) | AWS RDS `orion_staging` — free tier only, see above |
