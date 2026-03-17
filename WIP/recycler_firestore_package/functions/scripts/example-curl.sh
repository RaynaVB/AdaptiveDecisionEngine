curl -X POST "$FUNCTION_URL/importTaxonomy" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $TAXONOMY_ADMIN_KEY" \
  -d @../examples/import_ingredients_payload.json
