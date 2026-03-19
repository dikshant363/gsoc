const GSoCIngestor = require("./gsoc-ingestor")

class TestIngestor {
  constructor() {
    this.ingestor = new GSoCIngestor()
  }

  async runTest() {
    console.log("====================================")
    console.log("Testing GSoC Ideas Ingestion")
    console.log("====================================\n")

    console.log("Testing with 2025 data (first 2 organizations)...")

    try {
      await this.ingestor.ingestYear(2025)

      console.log("\n=== Test Complete ===")
      console.log("Check api/data/gsoc-ideas-2025.json for results")
    } catch (error) {
      console.error("\nTest failed:", error.message)
      console.error(error.stack)
    }
  }
}

if (require.main === module) {
  const test = new TestIngestor()
  test.runTest().catch(console.error)
}

module.exports = TestIngestor
