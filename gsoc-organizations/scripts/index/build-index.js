const MultiVectorIndexer = require("./multi-vector-indexer")

class IndexBuilder {
  constructor() {
    this.indexer = new MultiVectorIndexer()
  }

  async runFullBuild() {
    console.log("Starting full index build...")

    const qdrantConfig = {
      host: process.env.QDRANT_HOST || "localhost",
      port: process.env.QDRANT_PORT || 6333,
      collectionName: "gsoc_ideas",
    }

    await this.indexer.initialize(qdrantConfig)

    const ideasPath = require("path").join(
      __dirname,
      "../../api/data/gsoc-ideas-complete.json"
    )
    const schemaPath = require("path").join(
      __dirname,
      "../../api/qdrant/collection-schema.json"
    )
    const bm25OutputPath = require("path").join(
      __dirname,
      "../../api/data/bm25-index.json"
    )

    await this.indexer.buildAllIndexes(ideasPath, schemaPath, bm25OutputPath)
  }

  async buildVectorOnly() {
    console.log("Building vector index only...")

    const qdrantConfig = {
      host: process.env.QDRANT_HOST || "localhost",
      port: process.env.QDRANT_PORT || 6333,
      collectionName: "gsoc_ideas",
    }

    await this.indexer.initialize(qdrantConfig)

    const ideasPath = require("path").join(
      __dirname,
      "../../api/data/gsoc-ideas-complete.json"
    )
    const schemaPath = require("path").join(
      __dirname,
      "../../api/qdrant/collection-schema.json"
    )

    await this.indexer.buildVectorIndex(ideasPath, schemaPath)
  }

  async buildBM25Only() {
    console.log("Building BM25 index only...")

    const ideasPath = require("path").join(
      __dirname,
      "../../api/data/gsoc-ideas-complete.json"
    )
    const bm25OutputPath = require("path").join(
      __dirname,
      "../../api/data/bm25-index.json"
    )

    await this.indexer.buildBM25Index(ideasPath, bm25OutputPath)
  }

  async testSearch() {
    console.log("Testing search functionality...")

    const qdrantConfig = {
      host: process.env.QDRANT_HOST || "localhost",
      port: process.env.QDRANT_PORT || 6333,
      collectionName: "gsoc_ideas",
    }

    await this.indexer.initialize(qdrantConfig)

    const queries = [
      "machine learning python",
      "react javascript web development",
      "blockchain cryptocurrency",
      "database postgresql",
      "android mobile app",
    ]

    console.log("\n=== Testing Vector Search ===")
    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const results = await this.indexer.search({
          query,
          topK: 3,
          useHybrid: false,
        })

        console.log(`Found ${results.length} results`)
        results.slice(0, 3).forEach((result, idx) => {
          console.log(
            `  ${idx + 1}. ${
              result.document.title
            } (score: ${result.score.toFixed(4)})`
          )
        })
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }

    console.log("\n=== Testing Hybrid Search ===")
    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const results = await this.indexer.search({
          query,
          topK: 3,
          useHybrid: true,
        })

        console.log(`Found ${results.length} results`)
        results.slice(0, 3).forEach((result, idx) => {
          console.log(
            `  ${idx + 1}. ${
              result.document.title
            } (score: ${result.score.toFixed(4)})`
          )
        })
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }
  }
}

module.exports = IndexBuilder

if (require.main === module) {
  const args = process.argv.slice(2)
  const builder = new IndexBuilder()

  if (args.includes("--test")) {
    builder.testSearch().catch(console.error)
  } else if (args.includes("--vector-only")) {
    builder.buildVectorOnly().catch(console.error)
  } else if (args.includes("--bm25-only")) {
    builder.buildBM25Only().catch(console.error)
  } else {
    builder.runFullBuild().catch(console.error)
  }
}
