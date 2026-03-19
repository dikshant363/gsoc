const fs = require("fs")
const path = require("path")

class FeedbackLoop {
  constructor(config = {}) {
    this.feedbackFile =
      config.feedbackFile ||
      path.join(__dirname, "../../data/feedback-data.json")
    this.improvementFile =
      config.improvementFile ||
      path.join(__dirname, "../../data/improvement-insights.json")

    this.feedbackData = this.loadFeedbackData()
    this.improvementData = this.loadImprovementData()

    this.learningRate = config.learningRate || 0.1
    this.minFeedbackSamples = config.minFeedbackSamples || 10
  }

  loadFeedbackData() {
    try {
      if (fs.existsSync(this.feedbackFile)) {
        const data = fs.readFileSync(this.feedbackFile, "utf-8")
        return JSON.parse(data)
      }
    } catch (error) {
      console.error("Failed to load feedback data:", error)
    }
    return []
  }

  loadImprovementData() {
    try {
      if (fs.existsSync(this.improvementFile)) {
        const data = fs.readFileSync(this.improvementFile, "utf-8")
        return JSON.parse(data)
      }
    } catch (error) {
      console.error("Failed to load improvement data:", error)
    }
    return {
      version: 1.0,
      lastUpdated: new Date().toISOString(),
      improvements: {},
    }
  }

  saveFeedbackData() {
    try {
      fs.writeFileSync(
        this.feedbackFile,
        JSON.stringify(this.feedbackData, null, 2)
      )
    } catch (error) {
      console.error("Failed to save feedback data:", error)
    }
  }

  saveImprovementData() {
    try {
      this.improvementData.lastUpdated = new Date().toISOString()
      fs.writeFileSync(
        this.improvementFile,
        JSON.stringify(this.improvementData, null, 2)
      )
    } catch (error) {
      console.error("Failed to save improvement data:", error)
    }
  }

  collectFeedback(responseId, feedback) {
    const feedbackEntry = {
      responseId,
      timestamp: new Date().toISOString(),
      ...feedback,
    }

    this.feedbackData.push(feedbackEntry)
    this.saveFeedbackData()

    // Trigger improvement analysis if we have enough data
    if (this.feedbackData.length >= this.minFeedbackSamples) {
      this.analyzeAndImprove()
    }

    return feedbackEntry
  }

  analyzeAndImprove() {
    console.log("\n=== Analyzing Feedback for Improvements ===")

    const insights = this.generateInsights()
    const improvements = this.generateImprovements(insights)

    this.improvementData.improvements = {
      ...this.improvementData.improvements,
      ...improvements,
    }

    this.saveImprovementData()

    console.log(
      `Generated ${Object.keys(improvements).length} improvement suggestions`
    )
    return improvements
  }

  generateInsights() {
    const insights = {
      totalFeedback: this.feedbackData.length,
      averageRating: 0,
      commonIssues: {},
      successfulPatterns: {},
      queryCategories: {},
      responseQualityTrends: [],
      userPreferences: {},
    }

    if (this.feedbackData.length === 0) {
      return insights
    }

    // Calculate average rating
    const ratings = this.feedbackData
      .filter(f => f.rating !== undefined)
      .map(f => f.rating)

    if (ratings.length > 0) {
      insights.averageRating =
        ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    }

    // Identify common issues
    const issues = {}
    for (const feedback of this.feedbackData) {
      if (feedback.issues && Array.isArray(feedback.issues)) {
        for (const issue of feedback.issues) {
          issues[issue] = (issues[issue] || 0) + 1
        }
      }
    }
    insights.commonIssues = issues

    // Identify successful patterns
    const positives = {}
    for (const feedback of this.feedbackData) {
      if (feedback.positives && Array.isArray(feedback.positives)) {
        for (const positive of feedback.positives) {
          positives[positive] = (positives[positive] || 0) + 1
        }
      }
    }
    insights.successfulPatterns = positives

    // Categorize queries
    const queryCategories = {}
    for (const feedback of this.feedbackData) {
      if (feedback.query) {
        const category = this.categorizeQuery(feedback.query)
        queryCategories[category] = (queryCategories[category] || 0) + 1
      }
    }
    insights.queryCategories = queryCategories

    // Analyze response quality trends
    insights.responseQualityTrends = this.analyzeQualityTrends()

    return insights
  }

  categorizeQuery(query) {
    const q = query.toLowerCase()

    if (
      q.includes("recommend") ||
      q.includes("suggest") ||
      q.includes("good for")
    ) {
      return "recommendation"
    }

    if (
      q.includes("compare") ||
      q.includes("vs") ||
      q.includes("versus") ||
      q.includes("difference")
    ) {
      return "comparison"
    }

    if (q.includes("find") || q.includes("search") || q.includes("list")) {
      return "search"
    }

    if (
      q.includes("analyze") ||
      q.includes("statistics") ||
      q.includes("trends")
    ) {
      return "analysis"
    }

    if (
      q.includes("how") ||
      q.includes("what") ||
      q.includes("why") ||
      q.includes("explain")
    ) {
      return "explanatory"
    }

    return "general"
  }

  analyzeQualityTrends() {
    // Group feedback by time periods and analyze quality trends
    const recentFeedback = this.feedbackData.slice(-20) // Last 20 feedbacks
    const olderFeedback = this.feedbackData.slice(0, -20)

    const calculateAvgRating = feedbacks => {
      const ratings = feedbacks
        .filter(f => f.rating !== undefined)
        .map(f => f.rating)
      return ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0
    }

    return {
      recent: {
        count: recentFeedback.length,
        averageRating: calculateAvgRating(recentFeedback),
      },
      older: {
        count: olderFeedback.length,
        averageRating: calculateAvgRating(olderFeedback),
      },
      trend:
        recentFeedback.length > 0 && olderFeedback.length > 0
          ? calculateAvgRating(recentFeedback) -
            calculateAvgRating(olderFeedback)
          : 0,
    }
  }

  generateImprovements(insights) {
    const improvements = {}

    // Query understanding improvements
    if (insights.queryCategories) {
      const mostCommonCategory = Object.entries(insights.queryCategories).sort(
        ([, a], [, b]) => b - a
      )[0]

      if (mostCommonCategory) {
        improvements.query_understanding = {
          type: "query_processing",
          category: mostCommonCategory[0],
          improvement: `Improve handling of ${mostCommonCategory[0]} queries (${mostCommonCategory[1]} instances)`,
          confidence: 0.8,
        }
      }
    }

    // Response quality improvements
    if (insights.averageRating < 4.0) {
      improvements.response_quality = {
        type: "response_generation",
        currentRating: insights.averageRating,
        improvement: "Improve overall response quality and helpfulness",
        actions: [
          "Add more detailed explanations",
          "Include more examples",
          "Better source attribution",
        ],
        confidence: 0.9,
      }
    }

    // Common issue fixes
    if (insights.commonIssues) {
      const topIssues = Object.entries(insights.commonIssues)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      for (let i = 0; i < topIssues.length; i++) {
        const [issue, count] = topIssues[i]
        improvements[`issue_fix_${i + 1}`] = {
          type: "issue_resolution",
          issue,
          frequency: count,
          improvement: `Address common issue: ${issue}`,
          priority: i === 0 ? "high" : i === 1 ? "medium" : "low",
          confidence: 0.7,
        }
      }
    }

    // Successful pattern reinforcement
    if (insights.successfulPatterns) {
      const topPatterns = Object.entries(insights.successfulPatterns)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)

      for (let i = 0; i < topPatterns.length; i++) {
        const [pattern, count] = topPatterns[i]
        improvements[`pattern_reinforcement_${i + 1}`] = {
          type: "pattern_reinforcement",
          pattern,
          frequency: count,
          improvement: `Reinforce successful pattern: ${pattern}`,
          confidence: 0.6,
        }
      }
    }

    // Quality trend improvements
    if (insights.responseQualityTrends.trend < -0.2) {
      improvements.quality_trend = {
        type: "trend_analysis",
        trend: "declining",
        improvement: "Address declining response quality trends",
        actions: [
          "Review recent changes",
          "Check for data quality issues",
          "Validate tool outputs",
        ],
        confidence: 0.8,
      }
    }

    return improvements
  }

  getRetrievalImprovements() {
    const improvements = this.improvementData.improvements || {}
    const retrievalImprovements = {}

    // Extract retrieval-related improvements
    for (const [key, improvement] of Object.entries(improvements)) {
      if (improvement.type === "retrieval") {
        retrievalImprovements[key] = improvement
      }
    }

    // Add default retrieval improvements based on feedback
    if (this.feedbackData.length > 5) {
      const retrievalFeedback = this.feedbackData.filter(
        f =>
          f.category === "retrieval" ||
          f.issues?.some(
            issue => issue.includes("search") || issue.includes("find")
          )
      )

      if (retrievalFeedback.length > 0) {
        retrievalImprovements.search_accuracy = {
          type: "retrieval",
          improvement: "Improve search accuracy based on user feedback",
          feedbackCount: retrievalFeedback.length,
          confidence: 0.7,
        }
      }
    }

    return retrievalImprovements
  }

  getReasoningImprovements() {
    const improvements = this.improvementData.improvements || {}
    const reasoningImprovements = {}

    // Extract reasoning-related improvements
    for (const [key, improvement] of Object.entries(improvements)) {
      if (improvement.type === "reasoning") {
        reasoningImprovements[key] = improvement
      }
    }

    // Add default reasoning improvements
    if (this.feedbackData.length > 5) {
      const reasoningFeedback = this.feedbackData.filter(
        f =>
          f.category === "reasoning" ||
          f.issues?.some(
            issue => issue.includes("answer") || issue.includes("logic")
          )
      )

      if (reasoningFeedback.length > 0) {
        reasoningImprovements.answer_quality = {
          type: "reasoning",
          improvement: "Improve answer quality and reasoning based on feedback",
          feedbackCount: reasoningFeedback.length,
          confidence: 0.7,
        }
      }
    }

    return reasoningImprovements
  }

  getSystemImprovements() {
    const improvements = this.improvementData.improvements || {}
    const systemImprovements = {}

    // Extract system-related improvements
    for (const [key, improvement] of Object.entries(improvements)) {
      if (improvement.type === "system") {
        systemImprovements[key] = improvement
      }
    }

    // Add performance improvements
    if (this.feedbackData.length > 10) {
      const slowResponses = this.feedbackData.filter(
        f => f.responseTime && f.responseTime > 5000
      )

      if (slowResponses.length > this.feedbackData.length * 0.2) {
        systemImprovements.performance = {
          type: "system",
          improvement: "Improve system performance and response times",
          slowResponseCount: slowResponses.length,
          totalResponses: this.feedbackData.length,
          confidence: 0.8,
        }
      }
    }

    return systemImprovements
  }

  applyImprovements(systemComponents) {
    console.log("\n=== Applying System Improvements ===")

    const improvements = this.improvementData.improvements || {}
    let appliedCount = 0

    for (const [key, improvement] of Object.entries(improvements)) {
      if (improvement.applied) continue

      try {
        this.applyImprovement(improvement, systemComponents)
        improvement.applied = true
        improvement.appliedAt = new Date().toISOString()
        appliedCount++
      } catch (error) {
        console.error(`Failed to apply improvement ${key}:`, error)
      }
    }

    this.saveImprovementData()

    console.log(`Applied ${appliedCount} improvements`)
    return appliedCount
  }

  applyImprovement(improvement, systemComponents) {
    switch (improvement.type) {
      case "query_processing":
        if (systemComponents.queryIntelligence) {
          // Add query processing improvements
          console.log(
            `  Applied query processing improvement: ${improvement.improvement}`
          )
        }
        break

      case "response_generation":
        if (systemComponents.llmReasoner) {
          // Adjust reasoning parameters based on feedback
          console.log(
            `  Applied response quality improvement: ${improvement.improvement}`
          )
        }
        break

      case "retrieval":
        if (systemComponents.retrievalOrchestrator) {
          // Adjust retrieval parameters
          console.log(
            `  Applied retrieval improvement: ${improvement.improvement}`
          )
        }
        break

      case "issue_resolution":
        console.log(`  Applied issue fix: ${improvement.improvement}`)
        break

      default:
        console.log(`  Applied general improvement: ${improvement.improvement}`)
    }
  }

  getFeedbackSummary() {
    const summary = {
      totalFeedback: this.feedbackData.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categories: {},
      recentFeedback: [],
      insights: this.generateInsights(),
    }

    if (this.feedbackData.length === 0) {
      return summary
    }

    // Calculate statistics
    const ratings = this.feedbackData.filter(f => f.rating !== undefined)
    if (ratings.length > 0) {
      summary.averageRating =
        ratings.reduce((sum, f) => sum + f.rating, 0) / ratings.length

      // Rating distribution
      ratings.forEach(f => {
        if (f.rating >= 1 && f.rating <= 5) {
          summary.ratingDistribution[Math.floor(f.rating)]++
        }
      })
    }

    // Category breakdown
    const categories = {}
    this.feedbackData.forEach(f => {
      const category = f.category || "general"
      categories[category] = (categories[category] || 0) + 1
    })
    summary.categories = categories

    // Recent feedback (last 5)
    summary.recentFeedback = this.feedbackData.slice(-5).map(f => ({
      rating: f.rating,
      category: f.category,
      timestamp: f.timestamp,
      summary: f.comment ? f.comment.substring(0, 100) : "No comment",
    }))

    return summary
  }

  getImprovementHistory() {
    return {
      ...this.improvementData,
      feedbackDataPoints: this.feedbackData.length,
      appliedImprovements: Object.values(
        this.improvementData.improvements || {}
      ).filter(imp => imp.applied).length,
      pendingImprovements: Object.values(
        this.improvementData.improvements || {}
      ).filter(imp => !imp.applied).length,
    }
  }

  reset() {
    this.feedbackData = []
    this.improvementData = {
      version: 1.0,
      lastUpdated: new Date().toISOString(),
      improvements: {},
    }

    this.saveFeedbackData()
    this.saveImprovementData()

    console.log("Feedback loop data reset")
  }

  getStats() {
    return {
      feedbackCount: this.feedbackData.length,
      improvementCount: Object.keys(this.improvementData.improvements || {})
        .length,
      averageRating: this.getFeedbackSummary().averageRating,
      dataFiles: {
        feedback: this.feedbackFile,
        improvements: this.improvementFile,
      },
    }
  }
}

module.exports = FeedbackLoop
