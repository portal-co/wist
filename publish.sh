#!/bin/bash
set -euxo pipefail
sh ./build.sh
npm publish --access public
npx jsr publish
cargo publish