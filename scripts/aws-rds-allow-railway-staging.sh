#!/usr/bin/env bash
# Allow inbound PostgreSQL to RDS from anywhere (needed for Railway without static outbound IPs).
# Uses the same security group as Lara by default.
# Only needed if you use optional AWS RDS — not required for Railway Postgres.
set -euo pipefail

SG_ID="${RDS_SECURITY_GROUP_ID:-sg-075d77a3169e2e791}"
REGION="${AWS_REGION:-eu-north-1}"

echo "Opening PostgreSQL (5432) on security group $SG_ID for Railway egress."
echo "This rule is free but exposes the port globally — tighten when Railway static IPs exist."
echo "Skip this script if staging uses Railway Postgres instead of AWS RDS."
echo ""

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region "$REGION" \
  2>/dev/null && echo "Added PostgreSQL 5432 from 0.0.0.0/0 to $SG_ID" \
  || echo "Rule may already exist (duplicate is OK). Check EC2 → Security groups → $SG_ID"
