#!/usr/bin/env bash
# Create a dedicated PostgreSQL RDS instance for Orion staging (same AWS account as Lara).
# Prerequisites: aws login / aws configure, and ORION_DB_PASSWORD exported.
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
INSTANCE_ID="${ORION_DB_INSTANCE_ID:-orion-staging-db}"
DB_NAME="${ORION_DB_NAME:-orion_staging}"
MASTER_USER="${ORION_DB_MASTER_USER:-orion_admin}"
INSTANCE_CLASS="${ORION_DB_INSTANCE_CLASS:-db.t4g.micro}"
SG_ID="${RDS_SECURITY_GROUP_ID:-sg-075d77a3169e2e791}"

if [[ -z "${ORION_DB_PASSWORD:-}" ]]; then
  echo "Export ORION_DB_PASSWORD before running this script." >&2
  exit 1
fi

if aws rds describe-db-instances --db-instance-identifier "$INSTANCE_ID" --region "$REGION" >/dev/null 2>&1; then
  echo "RDS instance already exists: $INSTANCE_ID"
  aws rds describe-db-instances \
    --db-instance-identifier "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,DBName,MasterUsername]' \
    --output table
  exit 0
fi

echo "Creating RDS instance $INSTANCE_ID in $REGION..."

aws rds create-db-instance \
  --region "$REGION" \
  --db-instance-identifier "$INSTANCE_ID" \
  --db-instance-class "$INSTANCE_CLASS" \
  --engine postgres \
  --engine-version 16.6 \
  --master-username "$MASTER_USER" \
  --master-user-password "$ORION_DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name "$DB_NAME" \
  --vpc-security-group-ids "$SG_ID" \
  --publicly-accessible \
  --backup-retention-period 1 \
  --no-multi-az \
  --no-deletion-protection \
  --tags Key=Project,Value=orion Key=Environment,Value=staging

cat <<EOF

RDS create started. Wait until status is "available":

  aws rds wait db-instance-available --db-instance-identifier $INSTANCE_ID --region $REGION
  aws rds describe-db-instances --db-instance-identifier $INSTANCE_ID --region $REGION \\
    --query 'DBInstances[0].Endpoint.Address' --output text

Then allow Railway access:

  ./scripts/aws-rds-allow-railway-staging.sh

Connection string (set as DATABASE_URL on Railway orion API service):

  postgresql://${MASTER_USER}:<password>@<endpoint>:5432/${DB_NAME}?sslmode=require

EOF
