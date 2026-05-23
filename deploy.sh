#!/usr/bin/env bash
# Manual Cloud Run deploy. Run from your laptop after `gcloud auth login`.
#
# Usage:
#   ./deploy.sh
#
# What it does:
#   1. Reads GEMINI_API_KEY from the environment, falling back to .env.
#   2. Stores it in Secret Manager under SECRET_NAME (creates the secret on
#      first run, adds a new version if the value changed).
#   3. Grants the Cloud Run runtime service account access to the secret.
#   4. Deploys the Dockerfile to Cloud Run, mounting the secret as the
#      GEMINI_API_KEY env var (always pinned to :latest).
#
# Override defaults by exporting PROJECT_ID, REGION, SERVICE, or SECRET_NAME.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-sample-prod-deployment}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-demographic-reaction-engine}"
SECRET_NAME="${SECRET_NAME:-gemini-api-key}"

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

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

if gcloud secrets describe "$SECRET_NAME" --project "$PROJECT_ID" >/dev/null 2>&1; then
  CURRENT=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project "$PROJECT_ID" 2>/dev/null || true)
  if [[ "$CURRENT" != "$GEMINI_API_KEY" ]]; then
    echo "Adding new version to secret $SECRET_NAME ..."
    printf %s "$GEMINI_API_KEY" | gcloud secrets versions add "$SECRET_NAME" \
      --project "$PROJECT_ID" --data-file=- >/dev/null
  else
    echo "Secret $SECRET_NAME already up to date."
  fi
else
  echo "Creating secret $SECRET_NAME ..."
  printf %s "$GEMINI_API_KEY" | gcloud secrets create "$SECRET_NAME" \
    --project "$PROJECT_ID" --replication-policy=automatic --data-file=- >/dev/null
fi

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role=roles/secretmanager.secretAccessor \
  --condition=None >/dev/null

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
  --update-secrets "GEMINI_API_KEY=${SECRET_NAME}:latest"

URL=$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')

echo
echo "Deployed: $URL"
