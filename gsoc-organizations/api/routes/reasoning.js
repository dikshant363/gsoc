const express = require("express")
const router = express.Router()
const LLMReasoner = require("../reasoning/llm-reasoner")
const MultiHopAnalyzer = require("../reasoning/multi-hop-analyzer")

const reasoner = new LLMReasoner()
const multiHopAnalyzer = new MultiHopAnalyzer()

router.post("/reason", async (req, res) => {
  try {
    const { query, context, options = {} } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    if (!context || context.trim().length === 0) {
      return res.status(400).json({
        error: "Context is required",
      })
    }

    console.log(`\n=== LLM Reasoning ===`)
    console.log(`Query: "${query}"`)
    console.log(`Context length: ${context.length}`)

    const reasoningResult = await reasoner.reason(query, context, options)

    res.json(reasoningResult)
  } catch (error) {
    console.error("Reasoning error:", error)
    res.status(500).json({
      error: "Reasoning failed",
      message: error.message,
    })
  }
})

router.post("/multi-hop-analyze", async (req, res) => {
  try {
    const { query, initialContext = null, options = {} } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    console.log(`\n=== Multi-Hop Analysis ===`)
    console.log(`Query: "${query}"`)

    const analysisResult = await multiHopAnalyzer.analyze(query, {
      initialContext,
      ...options,
    })

    res.json(analysisResult)
  } catch (error) {
    console.error("Multi-hop analysis error:", error)
    res.status(500).json({
      error: "Multi-hop analysis failed",
      message: error.message,
    })
  }
})

router.post("/reason-with-context", async (req, res) => {
  try {
    const {
      query,
      retrievalResults,
      reasoningOptions = {},
      contextOptions = {},
    } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    if (!retrievalResults || !Array.isArray(retrievalResults.results)) {
      return res.status(400).json({
        error: "Retrieval results are required",
      })
    }

    console.log(`\n=== Reason with Context ===`)
    console.log(`Query: "${query}"`)
    console.log(`Ideas: ${retrievalResults.results.length}`)

    // Assemble context from retrieval results
    const ContextAssembler = require("../context/assembler")
    const assembler = new ContextAssembler()

    const context = await assembler.assemble(
      retrievalResults,
      query,
      contextOptions
    )

    // Perform reasoning
    const reasoningResult = await reasoner.reason(
      query,
      context.context,
      reasoningOptions
    )

    // Combine results
    const combinedResult = {
      query,
      context: {
        assembled: context.context,
        tokenCount: context.tokenCount,
        citations: context.citations,
      },
      reasoning: reasoningResult,
      metadata: {
        retrievalResults: retrievalResults.results.length,
        contextTokens: context.tokenCount,
        reasoningSteps: reasoningResult.steps?.length || 0,
        toolCalls: reasoningResult.toolCalls?.length || 0,
      },
    }

    res.json(combinedResult)
  } catch (error) {
    console.error("Reason with context error:", error)
    res.status(500).json({
      error: "Reasoning with context failed",
      message: error.message,
    })
  }
})

router.post("/full-analysis", async (req, res) => {
  try {
    const { query, options = {} } = req.body

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      })
    }

    console.log(`\n=== Full Analysis Pipeline ===`)
    console.log(`Query: "${query}"`)

    // Step 1: Multi-hop analysis (includes retrieval and context assembly)
    const analysisResult = await multiHopAnalyzer.analyze(query, options)

    // If analysis is not satisfactory, try with more context
    if (analysisResult.confidence < 0.7) {
      console.log("Low confidence, attempting enhanced analysis...")

      // Try with broader search
      const RetrievalOrchestrator = require("../retrieval/orchestrator")
      const orchestrator = new RetrievalOrchestrator()

      const broadSearch = await orchestrator.retrieve({
        query,
        topK: 15,
        returnMetadata: false,
      })

      if (broadSearch.results.length > 0) {
        const ContextAssembler = require("../context/assembler")
        const assembler = new ContextAssembler()

        const enhancedContext = await assembler.assemble(broadSearch, query, {
          maxTokens: 2500,
          citationStyle: "inline",
        })

        const enhancedReasoning = await reasoner.reason(
          query,
          enhancedContext.context,
          {
            maxIterations: 3,
            maxToolCalls: 4,
          }
        )

        if (enhancedReasoning.confidence > analysisResult.confidence) {
          analysisResult.finalAnswer = enhancedReasoning.finalAnswer
          analysisResult.confidence = enhancedReasoning.confidence
          analysisResult.enhanced = true
        }
      }
    }

    res.json({
      ...analysisResult,
      pipeline: "full-analysis",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Full analysis error:", error)
    res.status(500).json({
      error: "Full analysis failed",
      message: error.message,
      query,
      pipeline: "full-analysis",
      timestamp: new Date().toISOString(),
    })
  }
})

router.get("/tools", (req, res) => {
  try {
    const tools = reasoner.tools
    const toolList = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      parameters: tool.parameters,
    }))

    res.json({
      tools: toolList,
      count: toolList.length,
    })
  } catch (error) {
    console.error("Tools list error:", error)
    res.status(500).json({
      error: "Failed to get tools list",
      message: error.message,
    })
  }
})

router.get("/stats", (req, res) => {
  try {
    const reasonerStats = reasoner.getStats()
    const multiHopStats = multiHopAnalyzer.getStats()

    res.json({
      reasoner: reasonerStats,
      multiHop: multiHopStats,
      combined: {
        mockMode: reasonerStats.mockMode,
        totalHops: multiHopStats.totalHops,
        availableTools: reasonerStats.availableTools,
      },
    })
  } catch (error) {
    console.error("Stats error:", error)
    res.status(500).json({
      error: "Failed to get statistics",
      message: error.message,
    })
  }
})

router.post("/reset", (req, res) => {
  try {
    reasoner.reset()
    multiHopAnalyzer.reset()

    res.json({
      message: "Reasoning systems reset successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Reset error:", error)
    res.status(500).json({
      error: "Failed to reset reasoning systems",
      message: error.message,
    })
  }
})

router.post("/test-reasoning", async (req, res) => {
  try {
    const { query = "machine learning python projects" } = req.body

    console.log(`\n=== Testing Reasoning System ===`)
    console.log(`Query: "${query}"\n`)

    // Create mock context
    const mockContext = `## Relevant GSoC Ideas

[1]: **PyTorch for Beginners** (PyTorch, 2025)
Introduction to PyTorch framework for machine learning.

[2]: **TensorFlow ML Projects** (TensorFlow, 2024)
Advanced TensorFlow projects for image classification.

Technologies mentioned: python, machine learning, pytorch, tensorflow
Organizations: PyTorch, TensorFlow
Years: 2024, 2025`

    const reasoningResult = await reasoner.reason(query, mockContext, {
      maxIterations: 2,
      maxToolCalls: 2,
    })

    const testResult = {
      query,
      mockContext: mockContext.substring(0, 200) + "...",
      reasoning: {
        finalAnswer: reasoningResult.finalAnswer,
        confidence: reasoningResult.confidence,
        iterations: reasoningResult.metadata.iterations,
        toolCalls: reasoningResult.metadata.totalToolCalls,
      },
      success: reasoningResult.confidence > 0.5,
    }

    res.json(testResult)
  } catch (error) {
    console.error("Test reasoning error:", error)
    res.status(500).json({
      error: "Test reasoning failed",
      message: error.message,
    })
  }
})

module.exports = router
