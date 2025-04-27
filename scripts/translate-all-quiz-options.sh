#!/bin/bash

# This script runs the translate-quiz-options.ts tool for all brands and languages
# Usage: ./translate-all-quiz-options.sh

# Supported languages
LANGUAGES=("es" "ar")

# Get list of brand IDs from the database
# You can replace this with specific brand IDs if needed
BRANDS=("worldchain" "rolu-brand")

echo "=== Starting Quiz Option Translation Process ==="
echo "Supported languages: ${LANGUAGES[*]}"
echo "Target brands: ${BRANDS[*]}"
echo ""

# Process each brand and language combination
for BRAND in "${BRANDS[@]}"; do
  echo "=== Processing brand: $BRAND ==="
  
  for LANG in "${LANGUAGES[@]}"; do
    echo ""
    echo "== Translating quiz options for $BRAND to $LANG =="
    npx ts-node scripts/translate-quiz-options.ts "$BRAND" "$LANG"
    
    # Add a small pause between language processing
    sleep 2
  done
done

echo ""
echo "=== Translation process complete ===" 