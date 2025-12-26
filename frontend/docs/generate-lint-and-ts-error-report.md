# === CONFIGURE THE FILE PATH RELATIVE TO PROJECT ROOT ===

FILE_PATH="app/claim/[id]/page.tsx" # change this for your target file

# === Convert slashes to safe output name (avoid overwriting duplicates) ===

SAFE_NAME=$(echo "$FILE_PATH" | sed 's/[\/]/-/g')

# === Run diagnostics ===

{
echo "===== TYPESCRIPT ERRORS ====="

# Filter TypeScript errors by the full relative path

pnpm exec tsc --noEmit --pretty false | grep -i "$FILE_PATH"

echo ""
echo "===== ESLINT ERRORS ====="
pnpm exec eslint "$FILE_PATH"
} > "$SAFE_NAME-full-report.txt"

echo "Report saved to: $SAFE_NAME-full-report.txt"

//////////

FILE_PATH="test/ClaimLink.ts"
SAFE_NAME=$(echo "$FILE_PATH" | sed 's/[\/]/-/g')

{
echo "===== TYPESCRIPT ERRORS ====="
pnpm exec tsc --project tsconfig.json --noEmit --pretty false | grep -i "$FILE_PATH"

echo ""
echo "===== ESLINT ERRORS ====="
pnpm exec eslint "$FILE_PATH"
} > "$SAFE_NAME-full-report.txt"

echo "Report saved to: $SAFE_NAME-full-report.txt"

//////////

If this is usefull:
Can also make a one-line PNPM script so next time you can just do:

pnpm run report app/home/page.tsx

and it auto-generates the report without copying the snippet every time.
