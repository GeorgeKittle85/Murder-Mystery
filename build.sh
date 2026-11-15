#!/usr/bin/env bash
# Builds the single-file game (index.html) from the parts in src/.
set -euo pipefail
cd "$(dirname "$0")"
{
  cat src/head.html
  cat src/body.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js"></script>'
  echo '<script>'
  echo '(function () {'
  echo "'use strict';"
  echo "if (!window.THREE) { document.getElementById('loading').hidden = true; document.getElementById('bootError').hidden = false; return; }"
  for f in src/js/*.js; do cat "$f"; echo; done
  echo '})();'
  echo '</script>'
} > index.html
echo "Built index.html ($(wc -c < index.html) bytes)"
