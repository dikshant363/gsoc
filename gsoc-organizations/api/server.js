const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")

const ideasRouter = require("./routes/ideas")
const retrievalRouter = require("./routes/retrieval")
const contextRouter = require("./routes/context")
const reasoningRouter = require("./routes/reasoning")
const evaluationRouter = require("./routes/evaluation")

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get("/api", (req, res) => {
  res.json({
    name: "GSoC Ideas API",
    version: "2.3.0",
    endpoints: {
      ideas: {
        list: "GET /api/ideas",
        getById: "GET /api/ideas/:id",
        byOrg: "GET /api/ideas/organizations/:org",
        byYear: "GET /api/ideas/years/:year",
        byTech: "GET /api/ideas/techs/:tech",
        byTopic: "GET /api/ideas/topics/:topic",
        stats: "GET /api/ideas/stats",
        meta: "GET /api/ideas/meta",
        search: "POST /api/ideas/search",
      },
      retrieval: {
        search: "POST /api/retrieval/search",
        batchSearch: "POST /api/retrieval/search/batch",
        analyzeQuery: "POST /api/retrieval/analyze/query",
        orgAnalysis: "GET /api/retrieval/organizations/:org/analysis",
        stats: "GET /api/retrieval/stats",
        resetStats: "POST /api/retrieval/stats/reset",
        testSearch: "POST /api/retrieval/test/search",
      },
      context: {
        assemble: "POST /api/context/assemble",
        summarize: "POST /api/context/summarize",
        getCitation: "GET /api/context/citations/:id",
        searchWithContext: "POST /api/context/context/with-search",
        customTemplate: "POST /api/context/custom-template",
        contextStats: "POST /api/context/context/statistics",
      },
      reasoning: {
        reason: "POST /api/reasoning/reason",
        multiHopAnalyze: "POST /api/reasoning/multi-hop-analyze",
        reasonWithContext: "POST /api/reasoning/reason-with-context",
        fullAnalysis: "POST /api/reasoning/full-analysis",
        tools: "GET /api/reasoning/tools",
        stats: "GET /api/reasoning/stats",
        reset: "POST /api/reasoning/reset",
        testReasoning: "POST /api/reasoning/test-reasoning",
      },
      evaluation: {
        evaluate: "POST /api/evaluation/evaluate",
        evaluatePipeline: "POST /api/evaluation/evaluate-pipeline",
        collectFeedback: "POST /api/evaluation/feedback",
        getInsights: "GET /api/evaluation/insights",
        getImprovements: "GET /api/evaluation/improvements",
        applyImprovements: "POST /api/evaluation/apply-improvements",
        getSummary: "GET /api/evaluation/feedback-summary",
        getRecommendations: "GET /api/evaluation/improvement-recommendations",
        stats: "GET /api/evaluation/stats",
        reset: "POST /api/evaluation/reset",
        testEvaluation: "POST /api/evaluation/test-evaluation",
      },
    },
  })
})

app.use("/api/ideas", ideasRouter)
app.use("/api/retrieval", retrievalRouter)
app.use("/api/context", contextRouter)
app.use("/api/reasoning", reasoningRouter)
app.use("/api/evaluation", evaluationRouter)

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" })
})

app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({ error: "Internal server error" })
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GSoC Ideas API running on port ${PORT}`)
    console.log(`Visit http://localhost:${PORT}/api for API documentation`)
  })
}

module.exports = app
