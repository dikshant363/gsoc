const fs = require("fs")

class Phase5Validator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }

  async validate() {
    console.log("====================================")
    console.log("Phase 5 Setup Validation")
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

    const requiredDirs = ["api/reasoning", "scripts/reasoning"]

    const requiredFiles = [
      "api/reasoning/llm-reasoner.js",
      "api/reasoning/multi-hop-analyzer.js",
      "api/routes/reasoning.js",
      "scripts/reasoning/test-reasoning.js",
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
            "✓ GEMINI_API_KEY is set (for LLM reasoning)"
          )
        } else {
          this.results.warnings.push(
            "⚠ GEMINI_API_KEY is empty (reasoning will use mock responses)"
          )
        }
      } else {
        this.results.warnings.push(
          "⚠ GEMINI_API_KEY not set (reasoning will use mock responses)"
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
      require("../../api/reasoning/llm-reasoner")
      this.results.passed.push("✓ LLMReasoner imports")
    } catch (error) {
      this.results.failed.push(`✗ LLMReasoner import failed: ${error.message}`)
    }

    try {
      require("../../api/reasoning/multi-hop-analyzer")
      this.results.passed.push("✓ MultiHopAnalyzer imports")
    } catch (error) {
      this.results.failed.push(
        `✗ MultiHopAnalyzer import failed: ${error.message}`
      )
    }

    try {
      require("../../api/routes/reasoning")
      this.results.passed.push("✓ Reasoning routes import")
    } catch (error) {
      this.results.failed.push(
        `✗ Reasoning routes import failed: ${error.message}`
      )
    }

    try {
      require("./test-reasoning")
      this.results.passed.push("✓ ReasoningTester imports")
    } catch (error) {
      this.results.failed.push(
        `✗ ReasoningTester import failed: ${error.message}`
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
      console.log("✅ Phase 5 is ready to run!\n")
      console.log("Next steps:")
      console.log("1. Ensure Qdrant is running: npm run qdrant:start")
      console.log("2. Start API server: npm run api:start")
      console.log("3. Test reasoning: npm run test:reasoning\n")
      console.log("4. Run API tests:")
      console.log(
        "   curl -X POST http://localhost:3001/api/reasoning/full-analysis \\"
      )
      console.log('     -H "Content-Type: application/json" \\')
      console.log(
        '     -d \'{"query":"What are good GSoC projects for beginners?"}\'\n'
      )
      console.log("\n5. Available tools:")
      console.log("   - search_ideas: Search for GSoC ideas")
      console.log("   - get_org_analysis: Analyze organization projects")
      console.log("   - compare_ideas: Compare projects/organizations")
      console.log("   - get_idea_details: Get specific project details")
      console.log("   - summarize_context: Summarize provided context")
      console.log(
        "   - find_recommendations: Get personalized recommendations\n"
      )
    } else {
      console.log("❌ Phase 5 has issues. Please fix the errors above.\n")
    }
  }
}

if (require.main === module) {
  const validator = new Phase5Validator()
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

module.exports = Phase5Validator
