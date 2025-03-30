#!/bin/bash
set -euxo pipefail
sh ./build.sh
npm publish
npx jsr publish