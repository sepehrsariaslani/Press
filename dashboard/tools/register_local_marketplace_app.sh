#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Register or update a local app for Press Marketplace (without GitHub source).

Usage:
  tools/register_local_marketplace_app.sh \
    --site den \
    --team 9lqj2mabiu \
    --app gameplan \
    --title "Gameplan" \
    --path "/Users/sepehr/Downloads/frappe-bench/apps/gameplan" \
    --version "Version 15" \
    [--branch develop] \
    [--description "App description"] \
    [--monthly-usd 15] [--yearly-usd 150] \
    [--monthly-inr 1190] [--yearly-inr 11900] \
    [--show-onboarding 1]
USAGE
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

SITE=""
TEAM=""
APP=""
TITLE=""
APP_PATH=""
VERSION=""
BRANCH="main"
DESCRIPTION=""
MONTHLY_USD="15"
YEARLY_USD="150"
MONTHLY_INR="0"
YEARLY_INR="0"
SHOW_ONBOARDING="1"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --site) SITE="$2"; shift 2 ;;
    --team) TEAM="$2"; shift 2 ;;
    --app) APP="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --path) APP_PATH="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --description) DESCRIPTION="$2"; shift 2 ;;
    --monthly-usd) MONTHLY_USD="$2"; shift 2 ;;
    --yearly-usd) YEARLY_USD="$2"; shift 2 ;;
    --monthly-inr) MONTHLY_INR="$2"; shift 2 ;;
    --yearly-inr) YEARLY_INR="$2"; shift 2 ;;
    --show-onboarding) SHOW_ONBOARDING="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$SITE" || -z "$TEAM" || -z "$APP" || -z "$TITLE" || -z "$APP_PATH" || -z "$VERSION" ]]; then
  echo "Missing required arguments."
  usage
  exit 1
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "App path does not exist: $APP_PATH"
  exit 1
fi

if [[ -z "$DESCRIPTION" ]]; then
  DESCRIPTION="${TITLE} - private marketplace app"
fi

VERSION_KEY=$(printf "%s" "$VERSION" | tr -cs 'A-Za-z0-9' '-' | sed 's/^-*//;s/-*$//' | tr '[:upper:]' '[:lower:]')
if [[ -z "$VERSION_KEY" ]]; then
  VERSION_KEY="v"
fi

SOURCE_NAME="SRC-${APP}-LOCAL"
APP_SOURCE_VERSION_NAME="ASV-${APP}-${VERSION_KEY}"
MARKETPLACE_VERSION_NAME="MAV-${APP}-${VERSION_KEY}"
MONTHLY_PLAN_NAME="MARKETPLACE-PLAN-${APP}-M"
YEARLY_PLAN_NAME="MARKETPLACE-PLAN-${APP}-Y"
MONTHLY_FEATURE_NAME="PF-${APP}-M"
YEARLY_FEATURE_NAME="PF-${APP}-Y"

REPO_NAME=$(basename "$APP_PATH")
REPO_OWNER=$(basename "$(dirname "$APP_PATH")")
SUBSCRIPTION_TYPE="Paid"
if [[ "$MONTHLY_USD" == "0" && "$YEARLY_USD" == "0" && "$MONTHLY_INR" == "0" && "$YEARLY_INR" == "0" ]]; then
  SUBSCRIPTION_TYPE="Free"
fi

APP_E=$(sql_escape "$APP")
TITLE_E=$(sql_escape "$TITLE")
TEAM_E=$(sql_escape "$TEAM")
APP_PATH_E=$(sql_escape "$APP_PATH")
VERSION_E=$(sql_escape "$VERSION")
BRANCH_E=$(sql_escape "$BRANCH")
DESC_E=$(sql_escape "$DESCRIPTION")
REPO_NAME_E=$(sql_escape "$REPO_NAME")
REPO_OWNER_E=$(sql_escape "$REPO_OWNER")
SUBSCRIPTION_E=$(sql_escape "$SUBSCRIPTION_TYPE")

SOURCE_NAME_E=$(sql_escape "$SOURCE_NAME")
APP_SOURCE_VERSION_NAME_E=$(sql_escape "$APP_SOURCE_VERSION_NAME")
MARKETPLACE_VERSION_NAME_E=$(sql_escape "$MARKETPLACE_VERSION_NAME")
MONTHLY_PLAN_NAME_E=$(sql_escape "$MONTHLY_PLAN_NAME")
YEARLY_PLAN_NAME_E=$(sql_escape "$YEARLY_PLAN_NAME")
MONTHLY_FEATURE_NAME_E=$(sql_escape "$MONTHLY_FEATURE_NAME")
YEARLY_FEATURE_NAME_E=$(sql_escape "$YEARLY_FEATURE_NAME")

SQL=$(cat <<SQL_EOF
INSERT INTO \`tabApp\`
(name, creation, modified, modified_by, owner, docstatus, idx, title, enabled, team, public, branch, url, scrubbed, repo_owner, repo)
VALUES
('$APP_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 0, '$TITLE_E', 1, '$TEAM_E', 0, '$BRANCH_E', '$APP_PATH_E', '$APP_E', '$REPO_OWNER_E', '$REPO_NAME_E')
ON DUPLICATE KEY UPDATE
title=VALUES(title),
enabled=VALUES(enabled),
team=VALUES(team),
branch=VALUES(branch),
url=VALUES(url),
repo_owner=VALUES(repo_owner),
repo=VALUES(repo),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabApp Source\`
(name, creation, modified, modified_by, owner, docstatus, idx, app, app_title, repository_url, repository, repository_owner, branch, team, public, enabled)
VALUES
('$SOURCE_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 0, '$APP_E', '$TITLE_E', '$APP_PATH_E', '$REPO_NAME_E', '$REPO_OWNER_E', '$BRANCH_E', '$TEAM_E', 0, 1)
ON DUPLICATE KEY UPDATE
app=VALUES(app),
app_title=VALUES(app_title),
repository_url=VALUES(repository_url),
repository=VALUES(repository),
repository_owner=VALUES(repository_owner),
branch=VALUES(branch),
team=VALUES(team),
enabled=VALUES(enabled),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabApp Source Version\`
(name, creation, modified, modified_by, owner, docstatus, idx, parent, parentfield, parenttype, version)
VALUES
('$APP_SOURCE_VERSION_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 1, '$SOURCE_NAME_E', 'versions', 'App Source', '$VERSION_E')
ON DUPLICATE KEY UPDATE
parent=VALUES(parent),
parentfield=VALUES(parentfield),
parenttype=VALUES(parenttype),
version=VALUES(version),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabMarketplace App\`
(name, creation, modified, modified_by, owner, docstatus, idx, app, title, description, team, route, status, published, published_on, show_for_site_creation, subscription_type)
VALUES
('$APP_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 0, '$APP_E', '$TITLE_E', '$DESC_E', '$TEAM_E', CONCAT('marketplace/apps/', '$APP_E'), 'Published', 1, CURDATE(), $SHOW_ONBOARDING, '$SUBSCRIPTION_E')
ON DUPLICATE KEY UPDATE
app=VALUES(app),
title=VALUES(title),
description=VALUES(description),
team=VALUES(team),
route=VALUES(route),
status='Published',
published=1,
published_on=CURDATE(),
show_for_site_creation=$SHOW_ONBOARDING,
subscription_type=VALUES(subscription_type),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabMarketplace App Version\`
(name, creation, modified, modified_by, owner, docstatus, idx, parent, parentfield, parenttype, version, source)
VALUES
('$MARKETPLACE_VERSION_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 1, '$APP_E', 'sources', 'Marketplace App', '$VERSION_E', '$SOURCE_NAME_E')
ON DUPLICATE KEY UPDATE
parent=VALUES(parent),
parentfield=VALUES(parentfield),
parenttype=VALUES(parenttype),
version=VALUES(version),
source=VALUES(source),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabMarketplace App Plan\`
(name, creation, modified, modified_by, owner, docstatus, idx, enabled, title, app, \`interval\`, price_usd, price_inr)
VALUES
('$MONTHLY_PLAN_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 0, 1, CONCAT('$TITLE_E', ' Monthly'), '$APP_E', 'Monthly', $MONTHLY_USD, $MONTHLY_INR)
ON DUPLICATE KEY UPDATE
enabled=VALUES(enabled),
title=VALUES(title),
app=VALUES(app),
\`interval\`=VALUES(\`interval\`),
price_usd=VALUES(price_usd),
price_inr=VALUES(price_inr),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabPlan Feature\`
(name, creation, modified, modified_by, owner, docstatus, idx, parent, parentfield, parenttype, description)
VALUES
('$MONTHLY_FEATURE_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 1, '$MONTHLY_PLAN_NAME_E', 'features', 'Marketplace App Plan', 'Monthly subscription for $TITLE_E')
ON DUPLICATE KEY UPDATE
parent=VALUES(parent),
parentfield=VALUES(parentfield),
parenttype=VALUES(parenttype),
description=VALUES(description),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabMarketplace App Plan\`
(name, creation, modified, modified_by, owner, docstatus, idx, enabled, title, app, \`interval\`, price_usd, price_inr)
VALUES
('$YEARLY_PLAN_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 0, 1, CONCAT('$TITLE_E', ' Yearly'), '$APP_E', 'Yearly', $YEARLY_USD, $YEARLY_INR)
ON DUPLICATE KEY UPDATE
enabled=VALUES(enabled),
title=VALUES(title),
app=VALUES(app),
\`interval\`=VALUES(\`interval\`),
price_usd=VALUES(price_usd),
price_inr=VALUES(price_inr),
modified=VALUES(modified),
modified_by=VALUES(modified_by);

INSERT INTO \`tabPlan Feature\`
(name, creation, modified, modified_by, owner, docstatus, idx, parent, parentfield, parenttype, description)
VALUES
('$YEARLY_FEATURE_NAME_E', NOW(), NOW(), 'Administrator', 'Administrator', 0, 1, '$YEARLY_PLAN_NAME_E', 'features', 'Marketplace App Plan', 'Yearly subscription for $TITLE_E')
ON DUPLICATE KEY UPDATE
parent=VALUES(parent),
parentfield=VALUES(parentfield),
parenttype=VALUES(parenttype),
description=VALUES(description),
modified=VALUES(modified),
modified_by=VALUES(modified_by);
SQL_EOF
)

BENCH_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)

cd "$BENCH_ROOT"
bench --site "$SITE" mariadb -e "$SQL"

echo "Done: $APP registered for marketplace on site $SITE"
echo "Customer pages:"
echo "- /marketplace/apps"
echo "- /dashboard/create-site/app-selector"
