const LLMReasoner = require("./llm-reasoner")
const ContextAssembler = require("../context/assembler")
const RetrievalOrchestrator = require("../retrieval/orchestrator")

class MultiHopAnalyzer {
  constructor(config = {}) {
    this.reasoner = new LLMReasoner(config.reasoner)
    this.assembler = new ContextAssembler(config.assembler)
    this.orchestrator = new RetrievalOrchestrator(config.orchestrator)

    this.maxHops = config.maxHops || 3
    this.hopHistory = []
    this.currentHop = 0
  }

  async analyze(query, options = {}) {
    const {
      initialContext = null,
      verbose = false,
      maxHops = this.maxHops,
    } = options

    console.log(`\n=== Multi-Hop Analysis ===`)
    console.log(`Query: "${query}"`)
    console.log(`Max hops: ${maxHops}`)

    this.hopHistory = []
    this.currentHop = 0

    let currentContext = initialContext
    let finalResult = null

    try {
      for (let hop = 1; hop <= maxHops; hop++) {
        this.currentHop = hop

        if (verbose) {
          console.log(`\n--- Hop ${hop}/${maxHops} ---`)
        }

        // If we don't have context yet, get initial retrieval
        if (!currentContext) {
          currentContext = await this.getInitialContext(query)
        }

        // Perform reasoning on current context
        const reasoningResult = await this.performReasoning(
          query,
          currentContext,
          hop
        )

        // Check if we have a satisfactory answer
        if (this.isAnswerSatisfactory(reasoningResult)) {
          finalResult = reasoningResult
          finalResult.multiHopInfo = {
            totalHops: hop,
            hopHistory: this.hopHistory,
            finalHop: hop,
          }
          break
        }

        // Determine if we need another hop
        const nextHopNeeded = await this.needsNextHop(
          reasoningResult,
          hop,
          maxHops
        )

        if (!nextHopNeeded) {
          finalResult = reasoningResult
          finalResult.multiHopInfo = {
            totalHops: hop,
            hopHistory: this.hopHistory,
            finalHop: hop,
            stoppedEarly: true,
          }
          break
        }

        // Plan and execute next hop
        const nextHopPlan = await this.planNextHop(reasoningResult, query, hop)

        if (verbose) {
          console.log(`Next hop plan: ${JSON.stringify(nextHopPlan, null, 2)}`)
        }

        currentContext = await this.executeNextHop(nextHopPlan)

        this.hopHistory.push({
          hop: hop,
          reasoning: reasoningResult,
          nextHopPlan: nextHopPlan,
          newContext: currentContext ? "updated" : "unchanged",
        })

        // Safety check to prevent infinite loops
        if (hop === maxHops) {
          finalResult = reasoningResult
          finalResult.multiHopInfo = {
            totalHops: hop,
            hopHistory: this.hopHistory,
            finalHop: hop,
            maxHopsReached: true,
          }
        }
      }
    } catch (error) {
      console.error("Multi-hop analysis failed:", error)
      finalResult = {
        error: error.message,
        query,
        finalAnswer: `I encountered an error during analysis: ${error.message}. Please try rephrasing your query.`,
        confidence: 0.1,
        multiHopInfo: {
          totalHops: this.currentHop,
          hopHistory: this.hopHistory,
          error: true,
        },
      }
    }

    if (verbose) {
      console.log(`\n=== Analysis Complete ===`)
      console.log(`Total hops: ${finalResult.multiHopInfo?.totalHops || 0}`)
      console.log(`Confidence: ${finalResult.confidence}`)
    }

    return finalResult
  }

  async getInitialContext(query) {
    console.log("Getting initial context...")

    // Perform initial retrieval
    const retrievalResults = await this.orchestrator.retrieve({
      query,
      topK: 10,
      returnMetadata: true,
    })

    if (retrievalResults.results.length === 0) {
      return null
    }

    // Assemble context
    const context = await this.assembler.assemble(retrievalResults, query, {
      maxTokens: 2000,
      citationStyle: "inline",
    })

    return context
  }

  async performReasoning(query, context, hopNumber) {
    const contextText = context ? context.context : "No context available"

    const reasoningOptions = {
      maxIterations: 2,
      maxToolCalls: 3,
      verbose: false,
    }

    const reasoning = await this.reasoner.reason(
      `${query} (Hop ${hopNumber})`,
      contextText,
      reasoningOptions
    )

    reasoning.hopNumber = hopNumber
    reasoning.contextUsed = context ? context.tokenCount : 0

    return reasoning
  }

  isAnswerSatisfactory(reasoningResult) {
    // Check confidence level
    if (reasoningResult.confidence >= 0.8) {
      return true
    }

    // Check if final answer is comprehensive
    const answer = reasoningResult.finalAnswer || ""
    const wordCount = answer.split(/\s+/).length

    // Consider answer satisfactory if it's detailed enough
    return wordCount > 50 && reasoningResult.confidence >= 0.6
  }

  async needsNextHop(reasoningResult, currentHop, maxHops) {
    // Don't exceed max hops
    if (currentHop >= maxHops) {
      return false
    }

    // If confidence is high enough, don't need another hop
    if (reasoningResult.confidence >= 0.9) {
      return false
    }

    // Check if reasoning indicates need for more information
    const answer = reasoningResult.finalAnswer || ""
    const lowerAnswer = answer.toLowerCase()

    const needsMoreIndicators = [
      "need more information",
      "additional context",
      "further analysis",
      "more details",
      "compare with",
      "look at",
      "consider",
      "also check",
      "furthermore",
      "additionally",
    ]

    const needsMore = needsMoreIndicators.some(indicator =>
      lowerAnswer.includes(indicator)
    )

    // Check if we used many tool calls (indicates complex analysis)
    const usedManyTools = reasoningResult.metadata?.totalToolCalls > 2

    return needsMore || usedManyTools
  }

  async planNextHop(reasoningResult, originalQuery, currentHop) {
    const plan = {
      action: "search",
      query: originalQuery,
      filters: {},
      hopNumber: currentHop + 1,
    }

    // Analyze the current answer to determine what additional information we need
    const answer = reasoningResult.finalAnswer || ""

    // Look for specific patterns that indicate what to search for next
    const orgPattern =
      /organization[s]?\s+(?:like|such as|similar to)\s+([^.!?]+)/i
    const orgMatch = answer.match(orgPattern)
    if (orgMatch) {
      plan.action = "org_analysis"
      plan.org = orgMatch[1].trim()
    }

    const techPattern =
      /(?:technology|tech|skill)[s]?\s+(?:like|such as|similar to)\s+([^.!?]+)/i
    const techMatch = answer.match(techPattern)
    if (techMatch) {
      plan.action = "tech_focused_search"
      plan.tech = techMatch[1].trim()
    }

    const comparePattern =
      /(?:compare|comparison)\s+(?:with|between|vs)\s+([^.!?]+)/i
    const compareMatch = answer.match(comparePattern)
    if (compareMatch) {
      plan.action = "comparison"
      plan.compareWith = compareMatch[1].trim()
    }

    // If no specific pattern found, do a broader search
    if (plan.action === "search") {
      plan.query = this.generateFollowUpQuery(answer, originalQuery)
    }

    return plan
  }

  generateFollowUpQuery(answer, originalQuery) {
    // Extract key terms from the answer that weren't in the original query
    const answerWords = answer.toLowerCase().split(/\s+/)
    const queryWords = originalQuery.toLowerCase().split(/\s+/)

    const newTerms = answerWords.filter(
      word =>
        word.length > 3 && !queryWords.includes(word) && !this.isStopWord(word)
    )

    if (newTerms.length > 0) {
      const additionalTerms = newTerms.slice(0, 3).join(" ")
      return `${originalQuery} ${additionalTerms}`
    }

    return originalQuery
  }

  isStopWord(word) {
    const stopWords = [
      "that",
      "with",
      "have",
      "this",
      "will",
      "your",
      "from",
      "they",
      "know",
      "want",
      "need",
      "make",
      "work",
      "also",
      "like",
      "well",
      "many",
      "some",
      "good",
      "best",
      "more",
      "most",
      "such",
      "same",
      "other",
    ]
    return stopWords.includes(word)
  }

  async executeNextHop(plan) {
    console.log(`Executing hop ${plan.hopNumber}: ${plan.action}`)

    let newContext = null

    try {
      switch (plan.action) {
        case "search":
          const retrievalResults = await this.orchestrator.retrieve({
            query: plan.query,
            topK: 8,
            filters: plan.filters || {},
            returnMetadata: false,
          })

          if (retrievalResults.results.length > 0) {
            newContext = await this.assembler.assemble(
              retrievalResults,
              plan.query,
              {
                maxTokens: 1500,
                citationStyle: "inline",
              }
            )
          }
          break

        case "org_analysis":
          const orgAnalysis = await this.orchestrator.perOrgAnalysis(plan.org, {
            limit: 20,
          })

          // Convert org analysis to context format
          newContext = this.convertOrgAnalysisToContext(orgAnalysis)
          break

        case "comparison":
          // Perform comparison search
          const compareResults = await this.orchestrator.retrieve({
            query: `compare ${plan.compareWith}`,
            topK: 12,
            returnMetadata: false,
          })

          if (compareResults.results.length > 0) {
            newContext = await this.assembler.assemble(
              compareResults,
              `comparison with ${plan.compareWith}`,
              {
                maxTokens: 1800,
                citationStyle: "markdown",
              }
            )
          }
          break

        case "tech_focused_search":
          const techResults = await this.orchestrator.retrieve({
            query: plan.tech,
            topK: 6,
            filters: { tech_stack: [plan.tech.toLowerCase()] },
            returnMetadata: false,
          })

          if (techResults.results.length > 0) {
            newContext = await this.assembler.assemble(techResults, plan.tech, {
              maxTokens: 1200,
              citationStyle: "inline",
            })
          }
          break

        default:
          console.warn(`Unknown hop action: ${plan.action}`)
      }
    } catch (error) {
      console.error(`Hop execution failed: ${plan.action}`, error)
    }

    return newContext
  }

  convertOrgAnalysisToContext(orgAnalysis) {
    const analysis = orgAnalysis.analysis

    let contextText = `## Organization Analysis: ${orgAnalysis.org}\n\n`
    contextText += `**Total Ideas**: ${orgAnalysis.totalIdeas}\n\n`

    if (analysis.byYear && Object.keys(analysis.byYear).length > 0) {
      contextText += `### Ideas by Year\n`
      Object.entries(analysis.byYear)
        .sort((a, b) => b[0] - a[0])
        .forEach(([year, count]) => {
          contextText += `- ${year}: ${count} ideas\n`
        })
      contextText += "\n"
    }

    if (analysis.byTechStack && analysis.byTechStack.length > 0) {
      contextText += `### Top Technologies\n`
      analysis.byTechStack.slice(0, 5).forEach(([tech, count]) => {
        contextText += `- ${tech}: ${count} ideas\n`
      })
      contextText += "\n"
    }

    if (analysis.byTopic && analysis.byTopic.length > 0) {
      contextText += `### Top Topics\n`
      analysis.byTopic.slice(0, 5).forEach(([topic, count]) => {
        contextText += `- ${topic}: ${count} ideas\n`
      })
      contextText += "\n"
    }

    return {
      query: orgAnalysis.org,
      context: contextText,
      tokenCount: this.assembler.estimateTokens(contextText),
      withinLimit: true,
      metadata: {
        type: "org_analysis",
        org: orgAnalysis.org,
        totalIdeas: orgAnalysis.totalIdeas,
      },
    }
  }

  getHopHistory() {
    return this.hopHistory
  }

  getStats() {
    return {
      totalHops: this.currentHop,
      hopHistory: this.hopHistory,
      reasonerStats: this.reasoner.getStats(),
    }
  }

  reset() {
    this.hopHistory = []
    this.currentHop = 0
    this.reasoner.reset()
  }
}

module.exports = MultiHopAnalyzer
