const fs = require("fs")
const path = require("path")

class Phase2Validator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    }
  }

  async validate() {
    console.log("====================================")
    console.log("Phase 2 Setup Validation")
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

    const requiredDeps = [
      "qdrant-js",
      "stemmer",
      "@google/generative-ai",
      "axios",
      "cheerio",
      "jsdom",
    ]

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

    const requiredDirs = ["scripts/index", "api/qdrant", "qdrant_storage"]

    const requiredFiles = [
      "scripts/index/embedding-generator.js",
      "scripts/index/bm25-index.js",
      "scripts/index/multi-vector-indexer.js",
      "scripts/index/build-index.js",
      "api/qdrant/client.js",
      "api/qdrant/collection-schema.json",
      "docker-compose.yml",
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
          this.results.passed.push("✓ GEMINI_API_KEY is set")
        } else {
          this.results.warnings.push(
            "⚠ GEMINI_API_KEY is empty (will use mock embeddings)"
          )
        }
      } else {
        this.results.warnings.push(
          "⚠ GEMINI_API_KEY not set (will use mock embeddings)"
        )
      }
    } else {
      this.results.warnings.push("⚠ .env file not found (will use defaults)")
    }

    if (fs.existsSync("api/qdrant/collection-schema.json")) {
      this.results.passed.push("✓ Qdrant schema exists")
      this.validateSchema()
    } else {
      this.results.failed.push("✗ Qdrant schema missing")
    }
  }

  validateSchema() {
    try {
      const schema = JSON.parse(
        fs.readFileSync("api/qdrant/collection-schema.json", "utf-8")
      )

      const requiredFields = [
        "collection_name",
        "vectors_config",
        "payload_schema",
      ]

      for (const field of requiredFields) {
        if (schema[field]) {
          this.results.passed.push(`  ✓ Schema has "${field}"`)
        } else {
          this.results.failed.push(`  ✗ Schema missing "${field}"`)
        }
      }
    } catch (error) {
      this.results.failed.push("✗ Invalid JSON in schema file")
    }
  }

  checkPrerequisites() {
    console.log("\nChecking prerequisites...")

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
        this.results.failed.push("  ✗ Dataset JSON is invalid")
      }
    } else {
      this.results.warnings.push(
        "⚠ Ideas dataset not found (run Phase 1 first)"
      )
    }

    try {
      const { execSync } = require("child_process")
      execSync("docker --version", { stdio: "pipe" })
      this.results.passed.push("✓ Docker is installed")
    } catch (error) {
      this.results.failed.push("✗ Docker is not installed")
    }

    try {
      const { execSync } = require("child_process")
      execSync("docker-compose --version", { stdio: "pipe" })
      this.results.passed.push("✓ Docker Compose is installed")
    } catch (error) {
      this.results.warnings.push("⚠ Docker Compose not found")
    }
  }

  testImports() {
    console.log("\nTesting imports...")

    try {
      require("./index/embedding-generator")
      this.results.passed.push("✓ EmbeddingGenerator imports")
    } catch (error) {
      this.results.failed.push(
        `✗ EmbeddingGenerator import failed: ${error.message}`
      )
    }

    try {
      require("./index/bm25-index")
      this.results.passed.push("✓ BM25Index imports")
    } catch (error) {
      this.results.failed.push(`✗ BM25Index import failed: ${error.message}`)
    }

    try {
      require("../api/qdrant/client")
      this.results.passed.push("✓ QdrantClient imports")
    } catch (error) {
      this.results.failed.push(`✗ QdrantClient import failed: ${error.message}`)
    }

    try {
      require("./index/multi-vector-indexer")
      this.results.passed.push("✓ MultiVectorIndexer imports")
    } catch (error) {
      this.results.failed.push(
        `✗ MultiVectorIndexer import failed: ${error.message}`
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
      console.log("✅ Phase 2 is ready to run!\n")
      console.log("Next steps:")
      console.log("1. Start Qdrant: npm run qdrant:start")
      console.log("2. Build indexes: npm run index:build")
      console.log("3. Test search: npm run index:test\n")
    } else {
      console.log("❌ Phase 2 has issues. Please fix the errors above.\n")
    }
  }
}

if (require.main === module) {
  const validator = new Phase2Validator()
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

module.exports = Phase2Validator
