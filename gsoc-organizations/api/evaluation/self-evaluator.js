const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

class SelfEvaluator {
  constructor(config = {}) {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null

    this.model = this.genAI
      ? this.genAI.getGenerativeModel({
          model: "gemini-pro",
          generationConfig: {
            temperature: config.temperature || 0.1,
            topK: config.topK || 20,
            topP: config.topP || 0.8,
            maxOutputTokens: config.maxOutputTokens || 1024,
          },
        })
      : null

    this.mockMode = !this.genAI

    this.evaluationCriteria = {
      factualConsistency: {
        weight: 0.3,
        description: "Factual accuracy and consistency with provided sources",
      },
      sourceCoverage: {
        weight: 0.25,
        description: "How well sources support the claims made",
      },
      completeness: {
        weight: 0.2,
        description: "Completeness and comprehensiveness of answer",
      },
      hallucinationScore: {
        weight: 0.15,
        description: "Detection of fabricated or unsupported information",
      },
      relevance: {
        weight: 0.1,
        description: "Relevance to the original query",
      },
    }

    this.evaluationHistory = []
    this.feedbackData = []
  }

  async evaluate(response, context, options = {}) {
    const {
      detailedFeedback = true,
      includeSuggestions = true,
      confidenceThreshold = 0.7,
    } = options

    console.log(`\n=== Self-Evaluation ===`)
    console.log(`Response length: ${response.finalAnswer?.length || 0} chars`)
    console.log(`Context sources: ${context.citations?.length || 0}`)

    const evaluation = {
      overallScore: 0,
      confidence: 0,
      criteria: {},
      feedback: {},
      suggestions: [],
      needsImprovement: false,
      timestamp: new Date().toISOString(),
      responseMetadata: {
        answerLength: response.finalAnswer?.length || 0,
        sourceCount: context.citations?.length || 0,
        toolCalls: response.toolCalls?.length || 0,
        reasoningSteps: response.steps?.length || 0,
      },
    }

    // Evaluate each criterion
    evaluation.criteria.factualConsistency =
      await this.evaluateFactualConsistency(response.finalAnswer, context)

    evaluation.criteria.sourceCoverage = this.evaluateSourceCoverage(
      response.finalAnswer,
      context
    )

    evaluation.criteria.completeness = this.evaluateCompleteness(
      response.finalAnswer,
      response.query
    )

    evaluation.criteria.hallucinationScore = await this.detectHallucinations(
      response.finalAnswer,
      context
    )

    evaluation.criteria.relevance = this.evaluateRelevance(
      response.finalAnswer,
      response.query
    )

    // Calculate overall score
    evaluation.overallScore = this.calculateOverallScore(evaluation.criteria)

    // Determine confidence and improvement needs
    evaluation.confidence = this.calculateConfidence(evaluation)
    evaluation.needsImprovement = evaluation.overallScore < confidenceThreshold

    // Generate feedback and suggestions
    if (detailedFeedback) {
      evaluation.feedback = this.generateDetailedFeedback(evaluation.criteria)
    }

    if (includeSuggestions) {
      evaluation.suggestions = this.generateSuggestions(
        evaluation.criteria,
        response,
        context
      )
    }

    // Store in history
    this.evaluationHistory.push({
      evaluation,
      response,
      context,
      timestamp: new Date().toISOString(),
    })

    console.log(`Overall score: ${(evaluation.overallScore * 100).toFixed(1)}%`)
    console.log(`Confidence: ${(evaluation.confidence * 100).toFixed(1)}%`)
    console.log(`Needs improvement: ${evaluation.needsImprovement}`)

    return evaluation
  }

  async evaluateFactualConsistency(answer, context) {
    if (!answer || !context.citations || context.citations.length === 0) {
      return { score: 0.3, evidence: "No sources provided for verification" }
    }

    if (this.mockMode) {
      return this.mockFactualConsistency(answer, context)
    }

    try {
      const citationsText = context.citations.map(c => c.snippet).join("\n\n")
      const prompt = `Evaluate factual consistency between the answer and the provided sources.

Answer: "${answer}"

Sources:
${citationsText}

Rate the factual consistency on a scale of 0-1, where:
- 1.0 = Perfectly consistent, all claims supported by sources
- 0.8 = Mostly consistent, minor unsupported details
- 0.6 = Somewhat consistent, some claims not fully supported
- 0.4 = Inconsistent, several claims contradict sources
- 0.2 = Largely inconsistent, most claims not supported
- 0.0 = Completely fabricated or contradictory

Return only the numerical score (e.g., 0.85) and a brief explanation.`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text().trim()

      const scoreMatch = text.match(/(\d+\.?\d*)/)
      const score = scoreMatch
        ? Math.min(1.0, Math.max(0.0, parseFloat(scoreMatch[1])))
        : 0.5

      return {
        score,
        evidence:
          text.replace(/^\d+\.?\d*/, "").trim() || "AI evaluation completed",
      }
    } catch (error) {
      console.error("Factual consistency evaluation failed:", error)
      return { score: 0.5, evidence: "Evaluation failed, using default score" }
    }
  }

  mockFactualConsistency(answer, context) {
    console.warn("⚠ Using mock factual consistency evaluation")

    // Simple heuristic: check if answer mentions sources
    const hasSourceMentions = context.citations.some(
      citation =>
        answer.includes(citation.id) ||
        answer.includes(citation.title.substring(0, 20))
    )

    const score = hasSourceMentions ? 0.8 : 0.5

    return {
      score,
      evidence: hasSourceMentions
        ? "Answer references provided sources"
        : "Answer does not clearly reference sources",
    }
  }

  evaluateSourceCoverage(answer, context) {
    if (!answer || !context.citations || context.citations.length === 0) {
      return { score: 0.0, evidence: "No sources available" }
    }

    const citations = context.citations
    let coveredSources = 0
    const totalSources = citations.length

    // Check if answer references sources
    for (const citation of citations) {
      const isReferenced =
        answer.includes(`[${citation.id}]`) ||
        answer.includes(citation.id) ||
        answer
          .toLowerCase()
          .includes(citation.title.toLowerCase().substring(0, 15))

      if (isReferenced) {
        coveredSources++
      }
    }

    const coverageRatio = coveredSources / totalSources
    let score

    if (coverageRatio >= 0.8) score = 1.0
    else if (coverageRatio >= 0.6) score = 0.8
    else if (coverageRatio >= 0.4) score = 0.6
    else if (coverageRatio >= 0.2) score = 0.4
    else score = 0.2

    return {
      score,
      evidence: `${coveredSources}/${totalSources} sources referenced (${(
        coverageRatio * 100
      ).toFixed(1)}% coverage)`,
    }
  }

  evaluateCompleteness(answer, query) {
    if (!answer) {
      return { score: 0.0, evidence: "No answer provided" }
    }

    const answerLength = answer.length
    const wordCount = answer.split(/\s+/).length

    // Basic heuristics for completeness
    let score = 0.5 // Base score

    // Length-based scoring
    if (wordCount > 100) score += 0.2
    else if (wordCount > 50) score += 0.1
    else if (wordCount < 20) score -= 0.2

    // Structure-based scoring
    const hasStructure =
      answer.includes("\n") || answer.includes("- ") || answer.includes("•")
    if (hasStructure) score += 0.1

    // Query-specific elements
    if (
      query.toLowerCase().includes("compare") &&
      answer.toLowerCase().includes("vs")
    ) {
      score += 0.1
    }

    if (
      query.toLowerCase().includes("recommend") &&
      (answer.includes("suggest") || answer.includes("consider"))
    ) {
      score += 0.1
    }

    score = Math.min(1.0, Math.max(0.0, score))

    return {
      score,
      evidence: `${wordCount} words, ${answerLength} characters`,
    }
  }

  async detectHallucinations(answer, context) {
    if (!answer) {
      return { score: 0.0, evidence: "No answer to evaluate" }
    }

    if (this.mockMode) {
      return this.mockHallucinationDetection(answer, context)
    }

    try {
      const sourcesText =
        context.citations?.map(c => c.snippet).join("\n\n") ||
        "No sources available"

      const prompt = `Detect potential hallucinations in this answer compared to the provided sources.

Answer: "${answer}"

Sources:
${sourcesText}

Rate hallucination level on a scale of 0-1, where:
- 0.0 = No hallucinations detected
- 0.2 = Minor unsupported details
- 0.4 = Some claims not supported by sources
- 0.6 = Significant unsupported information
- 0.8 = Largely fabricated content
- 1.0 = Completely hallucinated

Return only the numerical score (e.g., 0.15) and a brief explanation of any detected issues.`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text().trim()

      const scoreMatch = text.match(/(\d+\.?\d*)/)
      const score = scoreMatch
        ? Math.min(1.0, Math.max(0.0, parseFloat(scoreMatch[1])))
        : 0.1

      // Invert score: higher hallucination = lower quality
      const qualityScore = 1.0 - score

      return {
        score: qualityScore,
        evidence:
          score > 0.3
            ? text.replace(/^\d+\.?\d*/, "").trim()
            : "No significant hallucinations detected",
      }
    } catch (error) {
      console.error("Hallucination detection failed:", error)
      return {
        score: 0.8,
        evidence: "Detection failed, assuming low hallucination risk",
      }
    }
  }

  mockHallucinationDetection(answer, context) {
    console.warn("⚠ Using mock hallucination detection")

    // Simple heuristic: check for suspicious patterns
    const suspiciousPatterns = [
      /\b(according to|research shows|studies indicate)\b.*\b(impossible|never|always)\b/i,
      /\b(all|every|none)\b.*\bprojects?\b/i,
      /\b(best|worst|ultimate)\b.*\b(solution|approach)\b/i,
    ]

    let hallucinationIndicators = 0

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(answer)) {
        hallucinationIndicators++
      }
    }

    const score = Math.max(0.6, 1.0 - hallucinationIndicators * 0.2)

    return {
      score,
      evidence:
        hallucinationIndicators > 0
          ? `${hallucinationIndicators} potentially unsupported claims detected`
          : "No obvious hallucination indicators",
    }
  }

  evaluateRelevance(answer, query) {
    if (!answer || !query) {
      return { score: 0.0, evidence: "Missing answer or query" }
    }

    // Simple keyword overlap scoring
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
    const answerWords = answer
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)

    let matchingWords = 0
    for (const qWord of queryWords) {
      if (answerWords.includes(qWord)) {
        matchingWords++
      }
    }

    const relevanceRatio = matchingWords / Math.max(1, queryWords.length)
    const score = Math.min(1.0, relevanceRatio * 1.2) // Allow slight boost

    return {
      score,
      evidence: `${matchingWords}/${queryWords.length} query terms found in answer`,
    }
  }

  calculateOverallScore(criteria) {
    let weightedSum = 0
    let totalWeight = 0

    for (const [criterion, data] of Object.entries(criteria)) {
      const weight = this.evaluationCriteria[criterion]?.weight || 0.2
      weightedSum += data.score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5
  }

  calculateConfidence(evaluation) {
    const overallScore = evaluation.overallScore

    // Base confidence on overall score
    let confidence = overallScore

    // Boost confidence for well-supported answers
    if (evaluation.criteria.sourceCoverage.score > 0.7) {
      confidence += 0.1
    }

    // Reduce confidence for hallucinations
    if (evaluation.criteria.hallucinationScore.score < 0.7) {
      confidence -= 0.2
    }

    // Consider answer length (longer answers tend to be more comprehensive)
    if (evaluation.responseMetadata.answerLength > 500) {
      confidence += 0.05
    }

    return Math.min(1.0, Math.max(0.0, confidence))
  }

  generateDetailedFeedback(criteria) {
    const feedback = {}

    for (const [criterion, data] of Object.entries(criteria)) {
      const score = data.score
      const description = this.evaluationCriteria[criterion]?.description || ""

      let level, message

      if (score >= 0.9) {
        level = "excellent"
        message = `Excellent ${description.toLowerCase()}`
      } else if (score >= 0.8) {
        level = "good"
        message = `Good ${description.toLowerCase()}`
      } else if (score >= 0.7) {
        level = "adequate"
        message = `Adequate ${description.toLowerCase()}`
      } else if (score >= 0.5) {
        level = "needs_improvement"
        message = `Needs improvement in ${description.toLowerCase()}`
      } else {
        level = "poor"
        message = `Poor ${description.toLowerCase()}`
      }

      feedback[criterion] = {
        level,
        message,
        score,
        evidence: data.evidence,
      }
    }

    return feedback
  }

  generateSuggestions(criteria, response, context) {
    const suggestions = []

    // Factual consistency suggestions
    if (criteria.factualConsistency.score < 0.7) {
      suggestions.push({
        type: "factual_improvement",
        priority: "high",
        suggestion:
          "Improve factual accuracy by better verifying claims against sources",
        action: "Cross-reference all claims with provided citations",
      })
    }

    // Source coverage suggestions
    if (criteria.sourceCoverage.score < 0.6) {
      suggestions.push({
        type: "source_coverage",
        priority: "high",
        suggestion:
          "Improve source utilization by referencing more provided sources",
        action: "Explicitly cite sources for major claims",
      })
    }

    // Completeness suggestions
    if (criteria.completeness.score < 0.7) {
      suggestions.push({
        type: "completeness",
        priority: "medium",
        suggestion:
          "Provide more comprehensive answers with additional details",
        action: "Expand on key points and provide examples",
      })
    }

    // Hallucination suggestions
    if (criteria.hallucinationScore.score < 0.8) {
      suggestions.push({
        type: "hallucination_reduction",
        priority: "high",
        suggestion:
          "Reduce unsupported claims and stick to available information",
        action: "Only make claims supported by the provided context",
      })
    }

    // Tool usage suggestions
    if (response.toolCalls && response.toolCalls.length < 2) {
      suggestions.push({
        type: "tool_usage",
        priority: "medium",
        suggestion: "Use more tools for comprehensive information gathering",
        action:
          "Consider calling additional tools like get_org_analysis or compare_ideas",
      })
    }

    // Context utilization suggestions
    if (
      context.citations &&
      context.citations.length > 5 &&
      criteria.sourceCoverage.score < 0.5
    ) {
      suggestions.push({
        type: "context_utilization",
        priority: "medium",
        suggestion: "Better utilize available context and citations",
        action:
          "Reference more sources and use provided information more effectively",
      })
    }

    return suggestions
  }

  collectFeedback(responseId, userFeedback) {
    const feedback = {
      responseId,
      timestamp: new Date().toISOString(),
      ...userFeedback,
    }

    this.feedbackData.push(feedback)

    // Update evaluation history if we can find the response
    const evaluation = this.evaluationHistory.find(
      e =>
        e.response.id === responseId || e.response.query === userFeedback.query
    )

    if (evaluation) {
      evaluation.userFeedback = userFeedback
    }

    return feedback
  }

  getImprovementInsights() {
    const insights = {
      averageScores: this.calculateAverageScores(),
      commonIssues: this.identifyCommonIssues(),
      improvementTrends: this.analyzeImprovementTrends(),
      topSuggestions: this.getTopSuggestions(),
    }

    return insights
  }

  calculateAverageScores() {
    if (this.evaluationHistory.length === 0) {
      return {}
    }

    const averages = {}
    const criteriaNames = Object.keys(this.evaluationCriteria)

    for (const criterion of criteriaNames) {
      const scores = this.evaluationHistory
        .filter(e => e.evaluation.criteria[criterion])
        .map(e => e.evaluation.criteria[criterion].score)

      if (scores.length > 0) {
        averages[criterion] =
          scores.reduce((sum, score) => sum + score, 0) / scores.length
      }
    }

    averages.overall =
      this.evaluationHistory
        .map(e => e.evaluation.overallScore)
        .reduce((sum, score) => sum + score, 0) / this.evaluationHistory.length

    return averages
  }

  identifyCommonIssues() {
    const issues = {}

    for (const evaluation of this.evaluationHistory) {
      for (const [criterion, data] of Object.entries(
        evaluation.evaluation.criteria
      )) {
        if (data.score < 0.7) {
          if (!issues[criterion]) {
            issues[criterion] = { count: 0, examples: [] }
          }
          issues[criterion].count++

          if (issues[criterion].examples.length < 3) {
            issues[criterion].examples.push({
              query: evaluation.response.query,
              score: data.score,
              evidence: data.evidence,
            })
          }
        }
      }
    }

    return issues
  }

  analyzeImprovementTrends() {
    // Simple trend analysis - can be enhanced
    const recentEvaluations = this.evaluationHistory.slice(-10)
    const olderEvaluations = this.evaluationHistory.slice(0, -10)

    if (olderEvaluations.length < 5) {
      return { message: "Not enough data for trend analysis" }
    }

    const recentAvg =
      recentEvaluations
        .map(e => e.evaluation.overallScore)
        .reduce((sum, score) => sum + score, 0) / recentEvaluations.length

    const olderAvg =
      olderEvaluations
        .map(e => e.evaluation.overallScore)
        .reduce((sum, score) => sum + score, 0) / olderEvaluations.length

    const improvement = recentAvg - olderAvg

    return {
      recentAverage: recentAvg,
      olderAverage: olderAvg,
      improvement: improvement,
      trend:
        improvement > 0.05
          ? "improving"
          : improvement < -0.05
          ? "declining"
          : "stable",
    }
  }

  getTopSuggestions() {
    const suggestionCounts = {}

    for (const evaluation of this.evaluationHistory) {
      if (evaluation.evaluation.suggestions) {
        for (const suggestion of evaluation.evaluation.suggestions) {
          const key = suggestion.type
          if (!suggestionCounts[key]) {
            suggestionCounts[key] = { count: 0, suggestion }
          }
          suggestionCounts[key].count++
        }
      }
    }

    return Object.values(suggestionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  getStats() {
    return {
      totalEvaluations: this.evaluationHistory.length,
      totalFeedback: this.feedbackData.length,
      averageOverallScore: this.calculateAverageScores().overall || 0,
      mockMode: this.mockMode,
      evaluationCriteria: Object.keys(this.evaluationCriteria),
    }
  }

  reset() {
    this.evaluationHistory = []
    this.feedbackData = []
  }
}

module.exports = SelfEvaluator
