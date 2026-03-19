const fs = require("fs")

class Phase4Validator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }

  async validate() {
    console.log("====================================")
    console.log("Phase 4 Setup Validation")
    console.log("====================================\n")

    this.checkDependencies()
    this.checkDirectoryStructure()
    this.checkConfiguration()
    this.checkPrerequisites()
    this.testImports()
    this.printResults()

    return this.results.failed.length === 0
  }

  checkDependencies() {
    console.log("Checking dependencies...")

    const requiredDeps = ["@google/generative-ai", "express"]

    for (const dep of requiredDeps) {
      try {
        require.resolve(dep)
        this.results.passed.push(`✓ Dependency "${dep}" installed`)
      } catch (error) {
        this.results.failed.push(`✗ Dependency "${dep}" not installed`)
      }
    }
  }

  checkDirectoryStructure() {
    console.log("\nChecking directory structure...")

    const requiredDirs = ["api/context", "api/citations", "scripts/context"]

    const requiredFiles = [
      "api/context/assembler.js",
      "api/citations/citation.js",
      "api/routes/context.js",
      "scripts/context/test-context.js",
    ]

    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        this.results.passed.push(`✓ Directory "${dir}" exists`)
      } else {
        this.results.failed.push(`✗ Directory "${dir}" missing`)
      }
    }

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.results.passed.push(`✓ File "${file}" exists`)
      } else {
        this.results.failed.push(`✗ File "${file}" missing`)
      }
    }
  }

  checkConfiguration() {
    console.log("\nChecking configuration...")

    if (fs.existsSync(".env")) {
      this.results.passed.push("✓ .env file exists")

      const envContent = fs.readFileSync(".env", "utf-8")
      const hasGeminiKey = envContent.includes("GEMINI_API_KEY=")

      if (hasGeminiKey) {
        const keyMatch = envContent.match(/GEMINI_API_KEY=(.+)/)
        if (keyMatch && keyMatch[1].trim() !== "") {
          this.results.passed.push(
            "✓ GEMINI_API_KEY is set (for AI summarization)"
          )
        } else {
          this.results.warnings.push(
            "⚠ GEMINI_API_KEY is empty (AI summarization will use simple method)"
          )
        }
      } else {
        this.results.warnings.push(
          "⚠ GEMINI_API_KEY not set (AI summarization will use simple method)"
        )
      }
    } else {
      this.results.warnings.push("⚠ .env file not found")
    }
  }

  checkPrerequisites() {
    console.log("\nChecking prerequisites...")

    const path = require("path")

    if (fs.existsSync("api/data/gsoc-ideas-complete.json")) {
      this.results.passed.push("✓ Ideas dataset exists (Phase 1 complete)")

      try {
        const data = JSON.parse(
          fs.readFileSync("api/data/gsoc-ideas-complete.json", "utf-8")
        )

        if (data.ideas && Array.isArray(data.ideas) && data.ideas.length > 0) {
          this.results.passed.push(`  ✓ Dataset has ${data.ideas.length} ideas`)
        } else {
          this.results.failed.push("  ✗ Dataset is empty or invalid")
        }
      } catch (error) {
        this.results.failed.push(`  ✗ Dataset JSON is invalid`)
      }
    } else {
      this.results.warnings.push(
        "⚠ Ideas dataset not found (run Phase 1 first)"
      )
    }

    const bm25Path = path.join("api/data", "bm25-index.json")

    if (fs.existsSync(bm25Path)) {
      this.results.passed.push("✓ BM25 index exists (Phase 2 complete)")
    } else {
      this.results.warnings.push("⚠ BM25 index not found (run Phase 2 first)")
    }

    try {
      const { execSync } = require("child_process")
      execSync("docker ps", { stdio: "pipe" })
      this.results.passed.push("✓ Docker is running")
    } catch (error) {
      this.results.warnings.push("⚠ Docker may not be running (Qdrant needed)")
    }

    try {
      const { execSync } = require("child_process")
      const result = execSync(
        'curl -s http://localhost:6333/health || echo "not running"',
        { stdio: "pipe" }
      )
      if (result.toString().includes("ok")) {
        this.results.passed.push("✓ Qdrant is accessible")
      } else {
        this.results.warnings.push(
          "⚠ Qdrant not accessible (start with npm run qdrant:start)"
        )
      }
    } catch (error) {
      this.results.warnings.push(
        "⚠ Qdrant health check failed (start with npm run qdrant:start)"
      )
    }
  }

  testImports() {
    console.log("\nTesting imports...")

    try {
      require("../api/context/assembler")
      this.results.passed.push("✓ ContextAssembler imports")
    } catch (error) {
      this.results.failed.push(
        `✗ ContextAssembler import failed: ${error.message}`
      )
    }

    try {
      require("../api/citations/citation")
      this.results.passed.push("✓ Citation imports")
    } catch (error) {
      this.results.failed.push(`✗ Citation import failed: ${error.message}`)
    }

    try {
      require("../api/routes/context")
      this.results.passed.push("✓ Context routes import")
    } catch (error) {
      this.results.failed.push(
        `✗ Context routes import failed: ${error.message}`
      )
    }

    try {
      require("./test-context")
      this.results.passed.push("✓ ContextTester imports")
    } catch (error) {
      this.results.failed.push(
        `✗ ContextTester import failed: ${error.message}`
      )
    }
  }

  printResults() {
    console.log("\n====================================")
    console.log("Validation Results")
    console.log("====================================\n")

    if (this.results.passed.length > 0) {
      console.log("✅ Passed Checks:")
      this.results.passed.forEach(result => console.log(result))
    }

    if (this.results.warnings.length > 0) {
      console.log("\n⚠️  Warnings:")
      this.results.warnings.forEach(result => console.log(result))
    }

    if (this.results.failed.length > 0) {
      console.log("\n❌ Failed Checks:")
      this.results.failed.forEach(result => console.log(result))
    }

    console.log("\n====================================")
    console.log(
      `Total: ${this.results.passed.length} passed, ${this.results.warnings.length} warnings, ${this.results.failed.length} failed`
    )
    console.log("====================================\n")

    if (this.results.failed.length === 0) {
      console.log("✅ Phase 4 is ready to run!\n")
      console.log("Next steps:")
      console.log("1. Ensure Qdrant is running: npm run qdrant:start")
      console.log("2. Start API server: npm run api:start")
      console.log("3. Test context assembly: npm run test:context\n")
      console.log("4. Run API tests:")
      console.log(
        "   curl -X POST http://localhost:3001/api/context/assemble \\"
      )
      console.log('     -H "Content-Type: application/json" \\')
      console.log('     -d \'{"query":"machine learning python","topK":3}\'\n')
      console.log("\n5. Citation styles:")
      console.log("   - Markdown: ?format=markdown")
      console.log("   - Inline: ?format=inline")
      console.log("   - Detailed: ?format=detailed\n")
    } else {
      console.log("❌ Phase 4 has issues. Please fix the errors above.\n")
    }
  }
}

if (require.main === module) {
  const validator = new Phase4Validator()
  validator
    .validate()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error("Validation failed:", error)
      process.exit(1)
    })
}

module.exports = Phase4Validator
