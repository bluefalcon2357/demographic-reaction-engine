#!/usr/bin/env bash
# Manual Cloud Run deploy. Run from your laptop after `gcloud auth login`.
#
# Usage:
#   ./deploy.sh
#
# Reads GEMINI_API_KEY from the environment, falling back to .env in this dir.
# Override the project/region/service by exporting PROJECT_ID, REGION, or SERVICE.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-sample-prod-deployment}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-demographic-reaction-engine}"

if [[ -z "${GEMINI_API_KEY:-}" && -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "GEMINI_API_KEY is not set. Put it in .env or export it before running." >&2
  exit 1
fi

echo "Deploying $SERVICE to $PROJECT_ID / $REGION ..."
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}"

URL=$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')

echo
echo "Deployed: $URL"
