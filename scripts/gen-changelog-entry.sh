#!/usr/bin/env bash
# Prepend a new "## [version] - date" section to CHANGELOG.md, built from
# commits since the previous tag. Run this locally before tagging a release,
# then edit the generated section by hand if you want nicer wording.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
PREV_TAG=$(git tag --sort=-v:refname | head -1 || true)
DATE=$(date +%Y-%m-%d)

if [[ -z "${PREV_TAG}" ]]; then
  RANGE=""
else
  RANGE="${PREV_TAG}..HEAD"
fi

ENTRY_FILE=$(mktemp)
{
  echo "## [${VERSION}] - ${DATE}"
  echo
  if [[ -n "${PREV_TAG}" ]]; then
    echo "[Compare with ${PREV_TAG}](https://github.com/milisp/codexia/compare/${PREV_TAG}...v${VERSION})"
    echo
  fi
  git log ${RANGE} --pretty=format:'- %s (`%h`)' --no-merges
  echo
  echo
} > "${ENTRY_FILE}"

# Insert the new entry right after the top-of-file header, before the first
# existing "## [" section.
FIRST_SECTION_LINE=$(grep -n '^## \[' CHANGELOG.md | head -1 | cut -d: -f1)

if [[ -z "${FIRST_SECTION_LINE}" ]]; then
  echo "Could not find an existing '## [' section in CHANGELOG.md" >&2
  exit 1
fi

{
  head -n $((FIRST_SECTION_LINE - 1)) CHANGELOG.md
  cat "${ENTRY_FILE}"
  tail -n +${FIRST_SECTION_LINE} CHANGELOG.md
} > CHANGELOG.md.new

mv CHANGELOG.md.new CHANGELOG.md
rm -f "${ENTRY_FILE}"

echo "Prepended CHANGELOG.md entry for ${VERSION}. Review/edit it, then commit before tagging."
