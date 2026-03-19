const fs = require("fs")
const path = require("path")

console.log("=== Phase 4 Validation Test ===")

const filesToCheck = [
  "api/context/assembler.js",
  "api/citations/citation.js",
  "api/routes/context.js",
  "scripts/context/test-context.js",
]

let allExist = true
for (const file of filesToCheck) {
  const exists = fs.existsSync(file)
  console.log(`  ${exists ? "✓" : "✗"} ${file}`)
  if (!exists) allExist = false
}

console.log("\n=== Module Import Test ===")

const modulesToCheck = [
  { path: "../api/context/assembler", name: "ContextAssembler" },
  { path: "../api/citations/citation", name: "Citation" },
  { path: "../api/routes/context", name: "ContextRoutes" },
  { path: "./test-context", name: "ContextTester" },
]

for (const mod of modulesToCheck) {
  try {
    const module = require(mod.path)
    console.log(`  ✓ ${mod.name} imports successfully`)
  } catch (error) {
    console.log(`  ✗ ${mod.name} import failed: ${error.message}`)
    allExist = false
  }
}

console.log(`\n${allExist ? "✅" : "❌"} All files and modules checked`)

if (allExist) {
  console.log("\n=== Phase 4 Validation ===")
  console.log("✅ Ready to use!")
  console.log("\nNext steps:")
  console.log("1. npm run api:start")
  console.log("2. Test with:")
  console.log("   curl -X POST http://localhost:3001/api/context/assemble \\")
  console.log('     -H "Content-Type: application/json" \\')
  console.log(
    '     -d \'{"query":"test","retrievalResults":{"results":[{"id":"test-1","document":{"title":"Test"}}]} }\''
  )
} else {
  console.log("❌ Please fix errors above")
}
