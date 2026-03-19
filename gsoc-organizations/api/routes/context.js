const express = require("express")
const router = express.Router()
const ContextAssembler = require("../context/assembler")

const assembler = new ContextAssembler({
  maxTokens: 4000,
  maxIdeas: 10,
  citationStyle: "markdown",
  includeMetadata: true,
  sortByRelevance: true,
})

router.post("/assemble", async (req, res) => {
  try {
    const { query, retrievalResults, options = {} } = req.body

    if (!retrievalResults || !Array.isArray(retrievalResults.results)) {
      return res.status(400).json({
        error: "Retrieval results are required and must contain results array",
      })
    }

    console.log(`\n=== Context Assembly ===`)
    console.log(`Query: "${query || "N/A"}"`)
    console.log(`Ideas: ${retrievalResults.results.length}`)

    const context = assembler.assemble(retrievalResults, query, options)

    res.json(context)
  } catch (error) {
    console.error("Context assembly error:", error)
    res.status(500).json({
      error: "Failed to assemble context",
      message: error.message,
    })
  }
})

router.post("/summarize", async (req, res) => {
  try {
    const { ideas } = req.body

    if (!ideas || !Array.isArray(ideas)) {
      return res.status(400).json({
        error: "Ideas array is required",
      })
    }

    console.log(`\n=== Summarizing ${ideas.length} ideas ===`)

    const summary = await assembler.summarizeIdeas(ideas)

    res.json({
      summary,
      ideasCount: ideas.length,
    })
  } catch (error) {
    console.error("Summarization error:", error)
    res.status(500).json({
      error: "Failed to summarize ideas",
      message: error.message,
    })
  }
})

router.get("/citations/:id", (req, res) => {
  try {
    const { id } = req.params
    const citation = assembler.getCitation(id)

    if (!citation) {
      return res.status(404).json({
        error: "Citation not found",
      })
    }

    const { format = "markdown" } = req.query

    let response
    if (format === "inline") {
      response = {
        id: citation.id,
        inline: citation.toInlineCitation(),
        json: citation.toJSON(),
      }
    } else if (format === "detailed") {
      response = {
        id: citation.id,
        markdown: citation.toDetailedMarkdown(),
        json: citation.toJSON(),
      }
    } else {
      response = {
        id: citation.id,
        markdown: citation.toMarkdown(),
        json: citation.toJSON(),
      }
    }

    res.json(response)
  } catch (error) {
    console.error("Citation fetch error:", error)
    res.status(500).json({
      error: "Failed to fetch citation",
      message: error.message,
    })
  }
})

router.post("/context/with-search", async (req, res) => {
  try {
    const { query, searchParams = {}, contextOptions = {} } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    const RetrievalOrchestrator = require("../retrieval/orchestrator")
    const orchestrator = new RetrievalOrchestrator()

    console.log(`\n=== Context Assembly with Search ===`)
    console.log(`Query: "${query}"`)

    const retrievalResults = await orchestrator.retrieve({
      query,
      ...searchParams,
      topK: contextOptions.maxIdeas || 10,
      returnMetadata: true,
    })

    const context = assembler.assemble(retrievalResults, query, contextOptions)

    res.json({
      query,
      context,
      retrieval: retrievalResults.metadata,
      citations: assembler.getAllCitations(),
    })
  } catch (error) {
    console.error("Context with search error:", error)
    res.status(500).json({
      error: "Failed to perform search and assemble context",
      message: error.message,
    })
  }
})

router.post("/custom-template", async (req, res) => {
  try {
    const { retrievalResults, query, template } = req.body

    if (!template || typeof template !== "string") {
      return res.status(400).json({
        error: "Template string is required",
      })
    }

    if (!retrievalResults || !Array.isArray(retrievalResults.results)) {
      return res.status(400).json({
        error: "Retrieval results are required",
      })
    }

    const context = assembler.assemble(retrievalResults, query, {
      customTemplate: template,
    })

    res.json({
      query,
      template,
      context,
      citations: assembler.getAllCitations(),
    })
  } catch (error) {
    console.error("Custom template error:", error)
    res.status(500).json({
      error: "Failed to assemble context with custom template",
      message: error.message,
    })
  }
})

router.post("/context/statistics", async (req, res) => {
  try {
    const { context } = req.body

    if (!context || typeof context !== "string") {
      return res.status(400).json({
        error: "Context string is required",
      })
    }

    const stats = assembler.getContextStatistics(context)

    res.json(stats)
  } catch (error) {
    console.error("Context statistics error:", error)
    res.status(500).json({
      error: "Failed to get context statistics",
      message: error.message,
    })
  }
})

module.exports = router
