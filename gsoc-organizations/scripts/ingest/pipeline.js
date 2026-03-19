const GSoCIngestor = require("./gsoc-ingestor")
const DataNormalizer = require("./normalize")
const IdeasDatasetBuilder = require("./build-dataset")

class IngestionPipeline {
  constructor() {
    this.ingestor = new GSoCIngestor()
    this.normalizer = new DataNormalizer()
    this.datasetBuilder = new IdeasDatasetBuilder()
  }

  async runFullPipeline() {
    console.log("====================================")
    console.log("GSoC Ideas Ingestion Pipeline")
    console.log("====================================\n")

    console.log("Phase 1: Data Ingestion")
    console.log("------------------------")
    await this.ingestor.ingestAllYears()

    console.log("\nPhase 2: Normalization & Deduplication")
    console.log("---------------------------------------")
    await this.normalizer.normalizeAllYears()

    console.log("\nPhase 3: Dataset Building")
    console.log("-------------------------")
    await this.datasetBuilder.build()

    console.log("\n====================================")
    console.log("Pipeline Complete!")
    console.log("====================================")
  }

  async runIngestionOnly() {
    console.log("Running ingestion only...")
    await this.ingestor.ingestAllYears()
  }

  async runNormalizationOnly() {
    console.log("Running normalization only...")
    await this.normalizer.normalizeAllYears()
  }

  async runBuildOnly() {
    console.log("Building dataset...")
    await this.datasetBuilder.build()
  }
}

module.exports = IngestionPipeline

if (require.main === module) {
  const args = process.argv.slice(2)
  const pipeline = new IngestionPipeline()

  if (args.includes("--ingest-only")) {
    pipeline.runIngestionOnly().catch(console.error)
  } else if (args.includes("--normalize-only")) {
    pipeline.runNormalizationOnly().catch(console.error)
  } else if (args.includes("--build-only")) {
    pipeline.runBuildOnly().catch(console.error)
  } else {
    pipeline.runFullPipeline().catch(console.error)
  }
}
