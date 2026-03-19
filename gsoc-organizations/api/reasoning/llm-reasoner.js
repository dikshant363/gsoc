const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

class LLMReasoner {
  constructor(config = {}) {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null

    this.model = this.genAI
      ? this.genAI.getGenerativeModel({
          model: "gemini-pro",
          generationConfig: {
            temperature: config.temperature || 0.7,
            topK: config.topK || 40,
            topP: config.topP || 0.95,
            maxOutputTokens: config.maxOutputTokens || 2048,
          },
        })
      : null

    this.mockMode = !this.genAI
    this.maxToolCalls = config.maxToolCalls || 5
    this.maxIterations = config.maxIterations || 3

    this.conversationHistory = []
    this.toolCalls = 0
    this.iterations = 0

    this.tools = this.defineTools()
  }

  defineTools() {
    return {
      search_ideas: {
        name: "search_ideas",
        description:
          "Search for GSoC ideas using semantic similarity or keyword matching",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for GSoC ideas",
            },
            queryType: {
              type: "string",
              enum: ["semantic", "exact", "hybrid"],
              description: "Type of search to perform",
            },
            filters: {
              type: "object",
              properties: {
                org: {
                  type: "string",
                  description: "Filter by organization name",
                },
                year: { type: "integer", description: "Filter by year" },
                tech_stack: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by technologies",
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard", "expert"],
                  description: "Filter by difficulty level",
                },
              },
            },
            topK: {
              type: "integer",
              description: "Number of results to return",
              default: 10,
            },
          },
          required: ["query"],
        },
      },

      get_org_analysis: {
        name: "get_org_analysis",
        description:
          "Get detailed analysis of all ideas from a specific organization",
        parameters: {
          type: "object",
          properties: {
            org: { type: "string", description: "Organization name" },
            limit: {
              type: "integer",
              description: "Maximum ideas to analyze",
              default: 50,
            },
          },
          required: ["org"],
        },
      },

      compare_ideas: {
        name: "compare_ideas",
        description: "Compare two or more ideas or organizations",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { type: "string" },
              description:
                "List of items to compare (org names, tech stacks, etc.)",
            },
            criteria: {
              type: "array",
              items: { type: "string" },
              description: "Criteria to compare on",
            },
          },
          required: ["items"],
        },
      },

      get_idea_details: {
        name: "get_idea_details",
        description: "Get detailed information about a specific idea",
        parameters: {
          type: "object",
          properties: {
            ideaId: {
              type: "string",
              description: "ID of the idea to get details for",
            },
          },
          required: ["ideaId"],
        },
      },

      summarize_context: {
        name: "summarize_context",
        description: "Summarize provided context about GSoC ideas",
        parameters: {
          type: "object",
          properties: {
            context: { type: "string", description: "Context to summarize" },
            focus: {
              type: "string",
              description: "What to focus on in the summary",
            },
          },
          required: ["context"],
        },
      },

      find_recommendations: {
        name: "find_recommendations",
        description: "Find personalized recommendations based on user profile",
        parameters: {
          type: "object",
          properties: {
            profile: {
              type: "string",
              description: "User profile/skills/interests",
            },
            criteria: {
              type: "array",
              items: { type: "string" },
              description: "Additional criteria for recommendations",
            },
            topK: {
              type: "integer",
              description: "Number of recommendations",
              default: 5,
            },
          },
          required: ["profile"],
        },
      },
    }
  }

  async reason(query, context, options = {}) {
    const {
      maxIterations = this.maxIterations,
      maxToolCalls = this.maxToolCalls,
      verbose = false,
    } = options

    this.conversationHistory = []
    this.toolCalls = 0
    this.iterations = 0

    const systemPrompt = this.buildSystemPrompt(context)
    const initialPrompt = this.buildInitialPrompt(query, context)

    let currentPrompt = initialPrompt
    let reasoning = {
      query,
      steps: [],
      toolCalls: [],
      finalAnswer: null,
      confidence: 0.0,
      metadata: {
        iterations: 0,
        totalToolCalls: 0,
        reasoningTime: 0,
      },
    }

    const startTime = Date.now()

    try {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        this.iterations = iteration + 1

        if (verbose) {
          console.log(`\n=== Iteration ${iteration + 1} ===`)
          console.log(`Prompt length: ${currentPrompt.length}`)
        }

        const response = await this.callLLM(currentPrompt, systemPrompt)
        const parsedResponse = this.parseResponse(response)

        reasoning.steps.push({
          iteration: iteration + 1,
          prompt: currentPrompt.substring(0, 200) + "...",
          response: response,
          parsedResponse,
        })

        // Check if we have a final answer
        if (parsedResponse.finalAnswer) {
          reasoning.finalAnswer = parsedResponse.finalAnswer
          reasoning.confidence = parsedResponse.confidence || 0.8
          break
        }

        // Check if we need to call tools
        if (parsedResponse.toolCall && this.toolCalls < maxToolCalls) {
          const toolResult = await this.executeTool(parsedResponse.toolCall)

          reasoning.toolCalls.push({
            iteration: iteration + 1,
            toolCall: parsedResponse.toolCall,
            result: toolResult,
          })

          currentPrompt = this.buildFollowUpPrompt(
            parsedResponse,
            toolResult,
            currentPrompt
          )
          this.toolCalls++
        } else {
          // No more tool calls needed or limit reached
          break
        }
      }

      // If we don't have a final answer, generate one
      if (!reasoning.finalAnswer) {
        const finalResponse = await this.callLLM(
          "Based on all the information gathered, provide a final answer to the user's query.",
          systemPrompt
        )
        reasoning.finalAnswer = this.extractFinalAnswer(finalResponse)
        reasoning.confidence = 0.7 // Lower confidence for forced final answer
      }
    } catch (error) {
      console.error("Reasoning failed:", error)
      reasoning.error = error.message
      reasoning.finalAnswer = `I encountered an error while reasoning about your query: ${error.message}. Please try rephrasing your question.`
      reasoning.confidence = 0.1
    }

    reasoning.metadata = {
      iterations: this.iterations,
      totalToolCalls: this.toolCalls,
      reasoningTime: Date.now() - startTime,
    }

    return reasoning
  }

  buildSystemPrompt(context) {
    return `You are an expert AI assistant specializing in Google Summer of Code (GSoC) project analysis and recommendations.

CONTEXT INFORMATION:
${context}

Your role is to help users understand GSoC projects, find suitable matches for their skills and interests, and provide detailed analysis of organizations and project ideas.

You have access to the following tools to gather additional information when needed:

1. search_ideas - Search for GSoC ideas using semantic or keyword matching
2. get_org_analysis - Get detailed analysis of all ideas from a specific organization
3. compare_ideas - Compare two or more ideas, organizations, or technologies
4. get_idea_details - Get detailed information about a specific idea
5. summarize_context - Summarize provided context
6. find_recommendations - Find personalized recommendations based on user profile

When using tools, you must format your response as:
TOOL_CALL: {"tool": "tool_name", "parameters": {...}}

After receiving tool results, continue your reasoning process.

When you have enough information to provide a final answer, format it as:
FINAL_ANSWER: Your comprehensive answer here
CONFIDENCE: 0.95

Always provide detailed, helpful, and accurate responses based on the available information.`
  }

  buildInitialPrompt(query, context) {
    return `User Query: ${query}

Please analyze this query and provide a helpful response about GSoC projects. Use the available tools if you need additional information to give a complete answer.

Consider:
- What is the user asking for?
- Do I have enough context to answer directly?
- Should I use tools to gather more information?
- What kind of analysis or recommendations would be most helpful?

If you need to use a tool, respond with:
TOOL_CALL: {"tool": "tool_name", "parameters": {...}}

If you can provide a final answer, respond with:
FINAL_ANSWER: Your answer here
CONFIDENCE: confidence_level (0.0-1.0)`
  }

  async callLLM(prompt, systemPrompt) {
    if (this.mockMode) {
      return this.generateMockResponse(prompt)
    }

    try {
      const fullPrompt = `${systemPrompt}\n\n${prompt}`

      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      const text = response.text()

      return text
    } catch (error) {
      console.error("LLM call failed:", error)
      throw new Error(`LLM call failed: ${error.message}`)
    }
  }

  generateMockResponse(prompt) {
    console.warn("⚠ Using mock LLM response (GEMINI_API_KEY not set)")

    if (prompt.includes("TOOL_CALL")) {
      return `TOOL_CALL: {"tool": "search_ideas", "parameters": {"query": "machine learning", "topK": 5}}`
    }

    if (prompt.includes("FINAL_ANSWER")) {
      return `FINAL_ANSWER: Based on the available information, I can provide the following analysis of GSoC projects related to your query. The projects shown have various technologies and difficulty levels. For more specific recommendations, please provide additional details about your interests and experience level.

CONFIDENCE: 0.75`
    }

    return `I can help you analyze GSoC projects. Based on the context provided, I can see several interesting projects. Let me gather more information if needed.

TOOL_CALL: {"tool": "search_ideas", "parameters": {"query": "python", "topK": 3}}`
  }

  parseResponse(response) {
    const result = {
      text: response,
      toolCall: null,
      finalAnswer: null,
      confidence: null,
    }

    // Check for tool call
    const toolCallMatch = response.match(/TOOL_CALL:\s*(\{[\s\S]*?\})/)
    if (toolCallMatch) {
      try {
        result.toolCall = JSON.parse(toolCallMatch[1])
      } catch (error) {
        console.error("Failed to parse tool call:", error)
      }
    }

    // Check for final answer
    const finalAnswerMatch = response.match(
      /FINAL_ANSWER:\s*([\s\S]*?)(?=CONFIDENCE:|$)/
    )
    if (finalAnswerMatch) {
      result.finalAnswer = finalAnswerMatch[1].trim()
    }

    // Check for confidence
    const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9.]+)/)
    if (confidenceMatch) {
      result.confidence = parseFloat(confidenceMatch[1])
    }

    return result
  }

  async executeTool(toolCall) {
    const { tool, parameters } = toolCall

    console.log(`\n=== Executing Tool: ${tool} ===`)
    console.log("Parameters:", parameters)

    try {
      switch (tool) {
        case "search_ideas":
          return await this.executeSearchIdeas(parameters)

        case "get_org_analysis":
          return await this.executeGetOrgAnalysis(parameters)

        case "compare_ideas":
          return await this.executeCompareIdeas(parameters)

        case "get_idea_details":
          return await this.executeGetIdeaDetails(parameters)

        case "summarize_context":
          return await this.executeSummarizeContext(parameters)

        case "find_recommendations":
          return await this.executeFindRecommendations(parameters)

        default:
          return { error: `Unknown tool: ${tool}` }
      }
    } catch (error) {
      console.error(`Tool execution failed: ${tool}`, error)
      return { error: error.message }
    }
  }

  async executeSearchIdeas(parameters) {
    const RetrievalOrchestrator = require("../retrieval/orchestrator")
    const orchestrator = new RetrievalOrchestrator()

    const results = await orchestrator.retrieve({
      query: parameters.query,
      queryType: parameters.queryType || "auto",
      topK: parameters.topK || 10,
      filters: parameters.filters || {},
      returnMetadata: false,
    })

    return {
      tool: "search_ideas",
      query: parameters.query,
      results: results.results,
      count: results.results.length,
    }
  }

  async executeGetOrgAnalysis(parameters) {
    const RetrievalOrchestrator = require("../retrieval/orchestrator")
    const orchestrator = new RetrievalOrchestrator()

    const analysis = await orchestrator.perOrgAnalysis(parameters.org, {
      limit: parameters.limit || 50,
    })

    return {
      tool: "get_org_analysis",
      organization: parameters.org,
      analysis: analysis.analysis,
      totalIdeas: analysis.totalIdeas,
    }
  }

  async executeCompareIdeas(parameters) {
    // This would compare multiple items - simplified for now
    const results = []

    for (const item of parameters.items) {
      const searchResult = await this.executeSearchIdeas({
        query: item,
        topK: 5,
      })
      results.push({
        item,
        results: searchResult.results,
      })
    }

    return {
      tool: "compare_ideas",
      items: parameters.items,
      criteria: parameters.criteria || [],
      comparisons: results,
    }
  }

  async executeGetIdeaDetails(parameters) {
    const ideasData = require("../lib/ideas-data-access")
    const idea = ideasData.getIdeaById(parameters.ideaId)

    return {
      tool: "get_idea_details",
      ideaId: parameters.ideaId,
      idea: idea || { error: "Idea not found" },
    }
  }

  async executeSummarizeContext(parameters) {
    const ContextAssembler = require("../context/assembler")
    const assembler = new ContextAssembler()

    const summary = await assembler.summarizeIdeas([
      { document: { description: parameters.context } },
    ])

    return {
      tool: "summarize_context",
      context: parameters.context.substring(0, 100) + "...",
      focus: parameters.focus || "general",
      summary,
    }
  }

  async executeFindRecommendations(parameters) {
    const searchResult = await this.executeSearchIdeas({
      query: parameters.profile,
      topK: parameters.topK || 5,
      queryType: "semantic",
    })

    // Filter and rank recommendations
    const recommendations = searchResult.results
      .filter(idea => {
        const doc = idea.document
        const profileMatch = this.checkProfileMatch(parameters.profile, doc)
        return profileMatch > 0.5
      })
      .slice(0, parameters.topK || 5)

    return {
      tool: "find_recommendations",
      profile: parameters.profile,
      criteria: parameters.criteria || [],
      recommendations,
      count: recommendations.length,
    }
  }

  checkProfileMatch(profile, ideaDoc) {
    const profileLower = profile.toLowerCase()
    const techMatch = ideaDoc.tech_stack?.some(tech =>
      profileLower.includes(tech.toLowerCase())
    )
      ? 0.3
      : 0

    const difficultyMatch = ideaDoc.difficulty ? 0.2 : 0

    const descriptionMatch = ideaDoc.description
      ?.toLowerCase()
      .includes(profileLower.split(" ").slice(0, 3).join(" "))
      ? 0.3
      : 0

    return Math.min(1.0, techMatch + difficultyMatch + descriptionMatch)
  }

  buildFollowUpPrompt(parsedResponse, toolResult, previousPrompt) {
    return `${previousPrompt}

Tool Result for ${toolResult.tool}:
${JSON.stringify(toolResult, null, 2)}

Based on this additional information, continue your analysis. If you have enough information for a final answer, provide it now. Otherwise, use another tool or ask for clarification.

If you need another tool:
TOOL_CALL: {"tool": "tool_name", "parameters": {...}}

If you can provide a final answer:
FINAL_ANSWER: Your comprehensive answer
CONFIDENCE: confidence_level`
  }

  extractFinalAnswer(response) {
    const finalAnswerMatch = response.match(
      /FINAL_ANSWER:\s*([\s\S]*?)(?=CONFIDENCE:|TOOL_CALL:|$)/
    )
    if (finalAnswerMatch) {
      return finalAnswerMatch[1].trim()
    }

    // Fallback: return the response as-is
    return response
  }

  getStats() {
    return {
      mockMode: this.mockMode,
      totalToolCalls: this.toolCalls,
      totalIterations: this.iterations,
      conversationLength: this.conversationHistory.length,
      availableTools: Object.keys(this.tools),
    }
  }

  reset() {
    this.conversationHistory = []
    this.toolCalls = 0
    this.iterations = 0
  }
}

module.exports = LLMReasoner
