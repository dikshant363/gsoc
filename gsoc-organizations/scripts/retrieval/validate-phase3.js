const fs = require("fs")

class Phase3Validator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }

  async validate() {
    console.log("====================================")
    console.log("Phase 3 Setup Validation")
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

    const requiredDirs = ["api/agents", "api/retrieval", "scripts/retrieval"]

    const requiredFiles = [
      "api/agents/query-intelligence.js",
      "api/retrieval/orchestrator.js",
      "api/routes/retrieval.js",
      "scripts/retrieval/test-retrieval.js",
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
            "✓ GEMINI_API_KEY is set (for AI query analysis)"
          )
        } else {
          this.results.warnings.push(
            "⚠ GEMINI_API_KEY is empty (query intelligence will use rules)"
          )
        }
      } else {
        this.results.warnings.push(
          "⚠ GEMINI_API_KEY not set (query intelligence will use rules)"
        )
      }
    } else {
      this.results.warnings.push("⚠ .env file not found")
    }
  }

  checkPrerequisites() {
    console.log("\nChecking prerequisites...")

    const fs = require("fs")
    const path = require("path")
    const bm25Path = path.join("api/data", "bm25-index.json")

    if (fs.existsSync(bm25Path)) {
      this.results.passed.push("✓ BM25 index exists (Phase 2 complete)")
      try {
        const data = JSON.parse(fs.readFileSync(bm25Path, "utf-8"))
        if (data.documentFrequency && data.invertedIndex) {
          this.results.passed.push("  ✓ BM25 index structure valid")
        } else {
          this.results.failed.push("  ✗ BM25 index structure invalid")
        }
      } catch (error) {
        this.results.failed.push(
          `  ✗ BM25 index JSON invalid: ${error.message}`
        )
      }
    } else {
      this.results.warnings.push("⚠ BM25 index not found (run Phase 2 first)")
    }

    if (fs.existsSync("api/data/gsoc-ideas-complete.json")) {
      this.results.passed.push("✓ Ideas dataset exists (Phase 1 complete)")
    } else {
      this.results.warnings.push(
        "⚠ Ideas dataset not found (run Phase 1 first)"
      )
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
      require("../../api/agents/query-intelligence")
      this.results.passed.push("✓ QueryIntelligenceAgent imports")
    } catch (error) {
      this.results.failed.push(
        `✗ QueryIntelligenceAgent import failed: ${error.message}`
      )
    }

    try {
      require("../../api/retrieval/orchestrator")
      this.results.passed.push("✓ RetrievalOrchestrator imports")
    } catch (error) {
      this.results.failed.push(
        `✗ RetrievalOrchestrator import failed: ${error.message}`
      )
    }

    try {
      require("../../api/routes/retrieval")
      this.results.passed.push("✓ Retrieval routes import")
    } catch (error) {
      this.results.failed.push(
        `✗ Retrieval routes import failed: ${error.message}`
      )
    }

    try {
      require("./test-retrieval")
      this.results.passed.push("✓ RetrievalTester imports")
    } catch (error) {
      this.results.failed.push(
        `✗ RetrievalTester import failed: ${error.message}`
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
      console.log("✅ Phase 3 is ready to run!\n")
      console.log("Next steps:")
      console.log("1. Ensure Qdrant is running: npm run qdrant:start")
      console.log("2. Start API server: npm run api:start")
      console.log("3. Test retrieval: npm run test:retrieval\n")
      console.log("4. Run API tests:")
      console.log(
        "   curl -X POST http://localhost:3001/api/retrieval/search \\"
      )
      console.log('     -H "Content-Type: application/json" \\')
      console.log('     -d \'{"query":"machine learning python","topK":5}\'\n')
    } else {
      console.log("❌ Phase 3 has issues. Please fix the errors above.\n")
    }
  }
}

if (require.main === module) {
  const validator = new Phase3Validator()
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

module.exports = Phase3Validator
