const RetrievalOrchestrator = require("../../api/retrieval/orchestrator")
const QueryIntelligenceAgent = require("../../api/agents/query-intelligence")

class RetrievalTester {
  constructor() {
    this.orchestrator = new RetrievalOrchestrator()
    this.queryAgent = new QueryIntelligenceAgent()
  }

  async runTests() {
    console.log("====================================")
    console.log("Phase 3: Retrieval System Tests")
    console.log("====================================\n")

    await this.orchestrator.initialize()

    await this.testQueryIntelligence()
    await this.testVectorSearch()
    await this.testBM25Search()
    await this.testHybridSearch()
    await this.testMultiHopSearch()
    await this.testPerOrgAnalysis()
    await this.testBatchSearch()

    this.printFinalStats()
  }

  async testQueryIntelligence() {
    console.log("\n=== Testing Query Intelligence ===")

    const testQueries = [
      "machine learning python projects",
      "find react web development",
      "compare PostgreSQL and MongoDB",
      "recommend beginner projects",
      "organizations with blockchain in 2024",
      "projects by org: Apache Software Foundation",
      "difficulty: easy python projects",
      "tensorflow vs pytorch machine learning",
    ]

    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`)
      const analysis = await this.queryAgent.analyze(query)

      console.log(`  Type: ${analysis.queryType}`)
      console.log(`  Intent: ${analysis.intent}`)
      console.log(`  Complexity: ${analysis.complexity}`)
      console.log(`  Multi-hop: ${analysis.needsMultiHop}`)
      console.log(`  Confidence: ${analysis.confidence.toFixed(2)}`)

      if (Object.keys(analysis.filters).length > 0) {
        console.log(`  Filters:`, analysis.filters)
      }

      if (analysis.entities.length > 0) {
        console.log(`  Entities:`, analysis.entities.slice(0, 3))
      }
    }
  }

  async testVectorSearch() {
    console.log("\n=== Testing Vector Search ===")

    const queries = [
      "artificial intelligence research",
      "web development frameworks",
      "database optimization",
    ]

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const result = await this.orchestrator.retrieve({
          query,
          queryType: "vector",
          topK: 3,
          returnMetadata: true,
        })

        console.log(`Found: ${result.results.length} results`)
        result.results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.document.title} (${r.score.toFixed(4)})`)
        })
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }
  }

  async testBM25Search() {
    console.log("\n=== Testing BM25 Search ===")

    const queries = ["react javascript", "python django", "postgresql database"]

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const result = await this.orchestrator.retrieve({
          query,
          queryType: "bm25",
          topK: 3,
          returnMetadata: true,
        })

        console.log(`Found: ${result.results.length} results`)
        result.results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.document.title} (${r.score.toFixed(4)})`)
        })
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }
  }

  async testHybridSearch() {
    console.log("\n=== Testing Hybrid Search ===")

    const queries = [
      "machine learning with python",
      "web development react javascript",
      "blockchain smart contracts",
    ]

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const result = await this.orchestrator.retrieve({
          query,
          queryType: "auto",
          useHybrid: true,
          topK: 3,
          returnMetadata: true,
        })

        console.log(`Found: ${result.results.length} results`)
        console.log(`Type: ${result.metadata.retrievalMethod}`)
        result.results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.document.title} (${r.score.toFixed(4)})`)
        })
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }
  }

  async testMultiHopSearch() {
    console.log("\n=== Testing Multi-Hop Search ===")

    const queries = [
      "compare PostgreSQL and MongoDB projects",
      "Apache vs PostgreSQL database",
      "TensorFlow vs PyTorch machine learning",
    ]

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const result = await this.orchestrator.retrieve({
          query,
          queryType: "auto",
          topK: 5,
          returnMetadata: true,
        })

        console.log(`Multi-hop: ${result.metadata.retrievalMethod}`)
        console.log(`Found: ${result.results.length} results`)
        result.results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.document.title} (${r.score.toFixed(4)})`)
        })
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }
  }

  async testPerOrgAnalysis() {
    console.log("\n=== Testing Per-Organization Analysis ===")

    const orgs = ["PostgreSQL", "Apache Software Foundation"]

    for (const org of orgs) {
      console.log(`\nAnalyzing: ${org}`)
      try {
        const analysis = await this.orchestrator.perOrgAnalysis(org, {
          limit: 20,
        })

        console.log(`Total ideas: ${analysis.totalIdeas}`)
        console.log(`By year:`, analysis.analysis.byYear)
        console.log(`By status:`, analysis.analysis.byStatus)

        if (analysis.analysis.mostCommonTech.length > 0) {
          console.log(
            `Top techs:`,
            analysis.analysis.mostCommonTech.map(t => t[0]).slice(0, 3)
          )
        }

        if (analysis.analysis.mostCommonTopic.length > 0) {
          console.log(
            `Top topics:`,
            analysis.analysis.mostCommonTopic.map(t => t[0]).slice(0, 3)
          )
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`)
      }
    }
  }

  async testBatchSearch() {
    console.log("\n=== Testing Batch Search ===")

    const queries = [
      "machine learning",
      "web development",
      "database",
      "mobile app",
      "blockchain",
    ]

    console.log(`Processing ${queries.length} queries in parallel...`)

    const startTime = Date.now()
    const results = await Promise.all(
      queries.map(query =>
        this.orchestrator.retrieve({
          query,
          topK: 3,
          returnMetadata: false,
        })
      )
    )

    const endTime = Date.now()
    const totalTime = endTime - startTime
    const avgTime = totalTime / queries.length

    console.log(`Total time: ${totalTime}ms`)
    console.log(`Average time: ${avgTime.toFixed(2)}ms`)

    results.forEach((result, idx) => {
      console.log(`\n"${queries[idx]}": ${result.results.length} results`)
    })
  }

  printFinalStats() {
    const stats = this.orchestrator.getStats()

    console.log("\n====================================")
    console.log("Retrieval Statistics")
    console.log("====================================\n")

    console.log(`Total queries: ${stats.totalQueries}`)
    console.log(`Vector searches: ${stats.vectorSearches}`)
    console.log(`BM25 searches: ${stats.bm25Searches}`)
    console.log(`Hybrid searches: ${stats.hybridSearches}`)
    console.log(`Multi-hop searches: ${stats.multiHopSearches}`)
    console.log(
      `Average response time: ${stats.averageResponseTime.toFixed(2)}ms`
    )

    console.log(`\nQdrant points: ${stats.qdrantPoints}`)
    console.log(`BM25 loaded: ${stats.bm25Loaded}`)

    if (stats.bm25Stats) {
      console.log(`\nBM25 stats:`)
      console.log(`  Documents: ${stats.bm25Stats.totalDocuments}`)
      console.log(`  Unique terms: ${stats.bm25Stats.uniqueTerms}`)
      console.log(
        `  Avg doc length: ${stats.bm25Stats.averageDocumentLength.toFixed(2)}`
      )
    }
  }
}

if (require.main === module) {
  const tester = new RetrievalTester()
  tester.runTests().catch(error => {
    console.error("Test suite failed:", error)
    process.exit(1)
  })
}

module.exports = RetrievalTester
