#!/usr/bin/env bash
# Create a dedicated PostgreSQL RDS instance for Orion staging (optional; same AWS account as Lara).
# FREE TIER ONLY — see docs/aws-database-setup.md before running.
# Prerequisites: aws login / aws configure, and ORION_DB_PASSWORD exported.
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
INSTANCE_ID="${ORION_DB_INSTANCE_ID:-orion-staging-db}"
DB_NAME="${ORION_DB_NAME:-orion_staging}"
MASTER_USER="${ORION_DB_MASTER_USER:-orion_admin}"
INSTANCE_CLASS="${ORION_DB_INSTANCE_CLASS:-db.t4g.micro}"
ALLOCATED_STORAGE="${ORION_DB_ALLOCATED_STORAGE:-20}"
MAX_ALLOCATED_STORAGE="${ORION_DB_MAX_ALLOCATED_STORAGE:-20}"
BACKUP_RETENTION="${ORION_DB_BACKUP_RETENTION:-1}"
SG_ID="${RDS_SECURITY_GROUP_ID:-sg-075d77a3169e2e791}"

FREE_TIER_CLASSES="db.t2.micro db.t3.micro db.t4g.micro"

if [[ -z "${ORION_DB_PASSWORD:-}" ]]; then
  echo "Export ORION_DB_PASSWORD before running this script." >&2
  exit 1
fi

if [[ ! " $FREE_TIER_CLASSES " =~ " $INSTANCE_CLASS " ]]; then
  echo "ERROR: ORION_DB_INSTANCE_CLASS=$INSTANCE_CLASS is not free tier." >&2
  echo "Use one of:$FREE_TIER_CLASSES" >&2
  exit 1
fi

if (( ALLOCATED_STORAGE > 20 || MAX_ALLOCATED_STORAGE > 20 )); then
  echo "ERROR: Storage above 20 GB is not free tier. Set ORION_DB_ALLOCATED_STORAGE and ORION_DB_MAX_ALLOCATED_STORAGE to 20 or less." >&2
  exit 1
fi

if (( BACKUP_RETENTION > 7 )); then
  echo "ERROR: Backup retention > 7 days increases cost. Use ORION_DB_BACKUP_RETENTION=1 (default)." >&2
  exit 1
fi

cat <<'WARN'

================================================================================
 AWS RDS FREE TIER WARNING
================================================================================
 - Free tier applies for 12 months on NEW AWS accounts (750 hrs/mo, one micro DB).
 - If Lara or another project already uses RDS free tier, THIS instance may BILL.
 - Do not enable Multi-AZ, read replicas, or larger instance classes in Console.
 - Delete the instance when unused to avoid charges after free tier expires.
 - Default for Orion staging is Railway Postgres — AWS is optional.
 See docs/aws-database-setup.md
================================================================================

WARN

if aws rds describe-db-instances --db-instance-identifier "$INSTANCE_ID" --region "$REGION" >/dev/null 2>&1; then
  echo "RDS instance already exists: $INSTANCE_ID"
  aws rds describe-db-instances \
    --db-instance-identifier "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'DBInstances[0].[DBInstanceClass,AllocatedStorage,MaxAllocatedStorage,MultiAZ,BackupRetentionPeriod,DBInstanceStatus,Endpoint.Address,DBName,MasterUsername]' \
    --output table
  echo ""
  echo "Verify instance class is micro, Multi-AZ is false, and storage max is 20 in AWS Console."
  exit 0
fi

echo "Creating RDS instance $INSTANCE_ID in $REGION (free tier settings)..."

aws rds create-db-instance \
  --region "$REGION" \
  --db-instance-identifier "$INSTANCE_ID" \
  --db-instance-class "$INSTANCE_CLASS" \
  --engine postgres \
  --engine-version 16.6 \
  --master-username "$MASTER_USER" \
  --master-user-password "$ORION_DB_PASSWORD" \
  --allocated-storage "$ALLOCATED_STORAGE" \
  --max-allocated-storage "$MAX_ALLOCATED_STORAGE" \
  --storage-type gp3 \
  --db-name "$DB_NAME" \
  --vpc-security-group-ids "$SG_ID" \
  --publicly-accessible \
  --backup-retention-period "$BACKUP_RETENTION" \
  --no-multi-az \
  --no-deletion-protection \
  --no-enable-performance-insights \
  --monitoring-interval 0 \
  --tags Key=Project,Value=orion Key=Environment,Value=staging Key=FreeTier,Value=true

cat <<EOF

RDS create started (free tier: $INSTANCE_CLASS, ${ALLOCATED_STORAGE}GB, Single-AZ, backup ${BACKUP_RETENTION}d).
Wait until status is "available":

  aws rds wait db-instance-available --db-instance-identifier $INSTANCE_ID --region $REGION
  aws rds describe-db-instances --db-instance-identifier $INSTANCE_ID --region $REGION \\
    --query 'DBInstances[0].Endpoint.Address' --output text

Then allow Railway access:

  ./scripts/aws-rds-allow-railway-staging.sh

Connection string (set as DATABASE_URL on Railway orion API service):

  postgresql://${MASTER_USER}:<password>@<endpoint>:5432/${DB_NAME}?sslmode=require

After free tier ends or when done testing, delete this instance in RDS Console to avoid monthly charges.

EOF
