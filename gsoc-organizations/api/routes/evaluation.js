const express = require("express")
const router = express.Router()
const SelfEvaluator = require("../evaluation/self-evaluator")
const FeedbackLoop = require("../evaluation/feedback-loop")

const evaluator = new SelfEvaluator()
const feedbackLoop = new FeedbackLoop()

router.post("/evaluate", async (req, res) => {
  try {
    const { response, context, options = {} } = req.body

    if (!response || !response.finalAnswer) {
      return res.status(400).json({
        error: "Response with finalAnswer is required",
      })
    }

    if (!context) {
      return res.status(400).json({
        error: "Context is required",
      })
    }

    console.log(`\n=== API Evaluation Request ===`)
    console.log(`Response length: ${response.finalAnswer?.length || 0}`)
    console.log(`Context sources: ${context.citations?.length || 0}`)

    const evaluation = await evaluator.evaluate(response, context, options)

    res.json(evaluation)
  } catch (error) {
    console.error("Evaluation API error:", error)
    res.status(500).json({
      error: "Evaluation failed",
      message: error.message,
    })
  }
})

router.post("/evaluate-pipeline", async (req, res) => {
  try {
    const {
      query,
      retrievalResults,
      reasoningResults,
      contextResults,
      options = {},
    } = req.body

    if (!query || !retrievalResults || !reasoningResults || !contextResults) {
      return res.status(400).json({
        error:
          "Query, retrieval results, reasoning results, and context results are required",
      })
    }

    console.log(`\n=== Full Pipeline Evaluation ===`)
    console.log(`Query: "${query}"`)

    // Combine the results into evaluation format
    const combinedResponse = {
      query,
      finalAnswer: reasoningResults.finalAnswer,
      confidence: reasoningResults.confidence,
      toolCalls: reasoningResults.toolCalls,
      steps: reasoningResults.steps,
      metadata: reasoningResults.metadata,
    }

    const combinedContext = {
      query,
      context: contextResults.context,
      tokenCount: contextResults.tokenCount,
      citations: contextResults.citations,
      metadata: contextResults.metadata,
    }

    const evaluation = await evaluator.evaluate(
      combinedResponse,
      combinedContext,
      options
    )

    // Add pipeline-specific metadata
    evaluation.pipeline = {
      retrievalResults: retrievalResults.results?.length || 0,
      reasoningSteps: reasoningResults.steps?.length || 0,
      contextTokens: contextResults.tokenCount || 0,
      toolCalls: reasoningResults.toolCalls?.length || 0,
    }

    res.json({
      evaluation,
      pipeline: evaluation.pipeline,
    })
  } catch (error) {
    console.error("Pipeline evaluation error:", error)
    res.status(500).json({
      error: "Pipeline evaluation failed",
      message: error.message,
    })
  }
})

router.post("/feedback", (req, res) => {
  try {
    const {
      responseId,
      rating,
      category,
      comment,
      issues = [],
      positives = [],
      suggestions = [],
    } = req.body

    if (!responseId) {
      return res.status(400).json({
        error: "Response ID is required",
      })
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5",
      })
    }

    const feedback = feedbackLoop.collectFeedback(responseId, {
      rating,
      category,
      comment,
      issues,
      positives,
      suggestions,
    })

    console.log(`\n=== Feedback Collected ===`)
    console.log(`Response ID: ${responseId}`)
    console.log(`Rating: ${rating || "N/A"}`)
    console.log(`Category: ${category || "general"}`)

    res.json({
      success: true,
      feedbackId: feedback.responseId,
      message: "Feedback collected successfully",
    })
  } catch (error) {
    console.error("Feedback collection error:", error)
    res.status(500).json({
      error: "Feedback collection failed",
      message: error.message,
    })
  }
})

router.get("/insights", (req, res) => {
  try {
    const insights = feedbackLoop.generateInsights()

    res.json({
      insights,
      timestamp: new Date().toISOString(),
      dataPoints: feedbackLoop.feedbackData.length,
    })
  } catch (error) {
    console.error("Insights retrieval error:", error)
    res.status(500).json({
      error: "Failed to retrieve insights",
      message: error.message,
    })
  }
})

router.get("/improvements", (req, res) => {
  try {
    const improvements = feedbackLoop.getImprovementHistory()

    res.json(improvements)
  } catch (error) {
    console.error("Improvements retrieval error:", error)
    res.status(500).json({
      error: "Failed to retrieve improvements",
      message: error.message,
    })
  }
})

router.post("/apply-improvements", (req, res) => {
  try {
    // Mock system components for improvement application
    const systemComponents = {
      queryIntelligence: true,
      retrievalOrchestrator: true,
      llmReasoner: true,
      contextAssembler: true,
    }

    const appliedCount = feedbackLoop.applyImprovements(systemComponents)

    res.json({
      success: true,
      improvementsApplied: appliedCount,
      message: `Applied ${appliedCount} system improvements`,
    })
  } catch (error) {
    console.error("Improvement application error:", error)
    res.status(500).json({
      error: "Failed to apply improvements",
      message: error.message,
    })
  }
})

router.get("/feedback-summary", (req, res) => {
  try {
    const summary = feedbackLoop.getFeedbackSummary()

    res.json(summary)
  } catch (error) {
    console.error("Feedback summary error:", error)
    res.status(500).json({
      error: "Failed to generate feedback summary",
      message: error.message,
    })
  }
})

router.get("/improvement-recommendations", (req, res) => {
  try {
    const recommendations = {
      retrieval: feedbackLoop.getRetrievalImprovements(),
      reasoning: feedbackLoop.getReasoningImprovements(),
      system: feedbackLoop.getSystemImprovements(),
    }

    res.json({
      recommendations,
      totalCount:
        Object.keys(recommendations.retrieval).length +
        Object.keys(recommendations.reasoning).length +
        Object.keys(recommendations.system).length,
    })
  } catch (error) {
    console.error("Improvement recommendations error:", error)
    res.status(500).json({
      error: "Failed to generate improvement recommendations",
      message: error.message,
    })
  }
})

router.get("/stats", (req, res) => {
  try {
    const evaluatorStats = evaluator.getStats()
    const feedbackStats = feedbackLoop.getStats()

    res.json({
      evaluator: evaluatorStats,
      feedback: feedbackStats,
      combined: {
        totalEvaluations: evaluatorStats.totalEvaluations,
        totalFeedback: feedbackStats.feedbackCount,
        averageRating: feedbackStats.averageRating,
        evaluationCriteria: evaluatorStats.evaluationCriteria,
      },
    })
  } catch (error) {
    console.error("Stats retrieval error:", error)
    res.status(500).json({
      error: "Failed to retrieve statistics",
      message: error.message,
    })
  }
})

router.post("/reset", (req, res) => {
  try {
    evaluator.reset()
    feedbackLoop.reset()

    res.json({
      success: true,
      message: "Evaluation and feedback systems reset successfully",
    })
  } catch (error) {
    console.error("Reset error:", error)
    res.status(500).json({
      error: "Failed to reset systems",
      message: error.message,
    })
  }
})

router.post("/test-evaluation", async (req, res) => {
  try {
    console.log(`\n=== Testing Evaluation System ===`)

    // Create mock response and context
    const mockResponse = {
      query: "machine learning python",
      finalAnswer:
        "Based on the provided context, there are several machine learning projects available using Python. The projects include PyTorch implementations and TensorFlow applications.",
      confidence: 0.85,
      toolCalls: [{ tool: "search_ideas" }],
      steps: [{ iteration: 1 }],
      metadata: { iterations: 1, totalToolCalls: 1 },
    }

    const mockContext = {
      query: "machine learning python",
      context:
        "## Relevant Ideas\n\n[1]: **PyTorch for Beginners** (PyTorch, 2025)\nIntroduction to PyTorch...",
      tokenCount: 150,
      citations: [
        {
          id: "1",
          title: "PyTorch for Beginners",
          snippet: "Introduction to PyTorch framework...",
        },
      ],
    }

    const evaluation = await evaluator.evaluate(mockResponse, mockContext)

    const testResult = {
      evaluation: {
        overallScore: evaluation.overallScore,
        confidence: evaluation.confidence,
        needsImprovement: evaluation.needsImprovement,
        criteriaCount: Object.keys(evaluation.criteria).length,
        suggestionsCount: evaluation.suggestions?.length || 0,
      },
      success: evaluation.overallScore > 0.5,
      mockMode: evaluator.mockMode,
    }

    res.json(testResult)
  } catch (error) {
    console.error("Test evaluation error:", error)
    res.status(500).json({
      error: "Test evaluation failed",
      message: error.message,
    })
  }
})

module.exports = router
