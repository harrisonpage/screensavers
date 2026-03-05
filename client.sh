#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export VITE_BUILD_VERSION="$(git rev-list --count HEAD)"
npx vite build
