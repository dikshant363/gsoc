const express = require("express")
const router = express.Router()
const RetrievalOrchestrator = require("../retrieval/orchestrator")

const orchestrator = new RetrievalOrchestrator()

orchestrator.initialize().catch(err => {
  console.error("Failed to initialize Retrieval Orchestrator:", err)
})

router.post("/search", async (req, res) => {
  try {
    const {
      query,
      queryType = "auto",
      topK = 10,
      filters = null,
      useHybrid = "auto",
      returnMetadata = true,
    } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    const results = await orchestrator.retrieve({
      query,
      queryType,
      topK,
      filters,
      useHybrid,
      returnMetadata,
    })

    res.json(results)
  } catch (error) {
    console.error("Search error:", error)
    res.status(500).json({
      error: "Search failed",
      message: error.message,
    })
  }
})

router.post("/search/batch", async (req, res) => {
  try {
    const { queries, queryType = "auto", topK = 10, filters = null } = req.body

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        error: "Queries array is required",
      })
    }

    const results = await Promise.all(
      queries.map(query =>
        orchestrator.retrieve({
          query,
          queryType,
          topK,
          filters,
        })
      )
    )

    res.json({
      count: results.length,
      results,
    })
  } catch (error) {
    console.error("Batch search error:", error)
    res.status(500).json({
      error: "Batch search failed",
      message: error.message,
    })
  }
})

router.post("/analyze/query", async (req, res) => {
  try {
    const { query } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    const analysis = await orchestrator.queryAgent.analyze(query)

    res.json(analysis)
  } catch (error) {
    console.error("Query analysis error:", error)
    res.status(500).json({
      error: "Query analysis failed",
      message: error.message,
    })
  }
})

router.get("/organizations/:org/analysis", async (req, res) => {
  try {
    const { org } = req.params
    const { limit = 50, sort = "year", sortOrder = "desc" } = req.query

    const analysis = await orchestrator.perOrgAnalysis(org, {
      limit: parseInt(limit),
      sort,
      sortOrder,
    })

    res.json(analysis)
  } catch (error) {
    console.error("Org analysis error:", error)
    res.status(500).json({
      error: "Organization analysis failed",
      message: error.message,
    })
  }
})

router.get("/stats", (req, res) => {
  try {
    const stats = orchestrator.getStats()
    res.json(stats)
  } catch (error) {
    console.error("Stats error:", error)
    res.status(500).json({
      error: "Failed to retrieve statistics",
      message: error.message,
    })
  }
})

router.post("/stats/reset", (req, res) => {
  try {
    orchestrator.resetStats()
    res.json({
      message: "Statistics reset successfully",
    })
  } catch (error) {
    console.error("Stats reset error:", error)
    res.status(500).json({
      error: "Failed to reset statistics",
      message: error.message,
    })
  }
})

router.post("/test/search", async (req, res) => {
  try {
    const { query = "machine learning python" } = req.body

    console.log("\n=== Testing Retrieval System ===")
    console.log(`Query: "${query}"\n`)

    const testQueries = [
      "machine learning python",
      "react javascript web development",
      "blockchain cryptocurrency",
      "database postgresql",
      "android mobile app",
    ]

    const results = await Promise.all(
      testQueries.map(q =>
        orchestrator.retrieve({
          query: q,
          topK: 3,
          returnMetadata: true,
        })
      )
    )

    const testReport = results.map((result, idx) => ({
      query: testQueries[idx],
      queryType: result.queryType,
      intent: result.intent,
      resultCount: result.results.length,
      topResults: result.results.slice(0, 3).map(r => ({
        title: r.document.title,
        org: r.document.org,
        score: r.score.toFixed(4),
      })),
      responseTime: result.responseTime,
    }))

    res.json({
      testCount: testQueries.length,
      report: testReport,
    })
  } catch (error) {
    console.error("Test search error:", error)
    res.status(500).json({
      error: "Test search failed",
      message: error.message,
    })
  }
})

module.exports = router
