import axios from "axios"

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "/api" // In production, API is served from same domain
    : "http://localhost:3001/api"

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error("API Error:", error)
        return Promise.reject(this.handleError(error))
      }
    )
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      return {
        status,
        message: data.message || data.error || `Server error: ${status}`,
        details: data,
      }
    } else if (error.request) {
      // Network error
      return {
        status: 0,
        message:
          "Network error - please check your connection and ensure the API server is running",
        details: error.message,
      }
    } else {
      // Other error
      return {
        status: -1,
        message: error.message || "Unknown error occurred",
        details: error,
      }
    }
  }

  // Search API
  async search(query, options = {}) {
    const payload = {
      query: query.trim(),
      queryType: options.searchType || "auto",
      topK: options.topK || 10,
      filters: options.filters || {},
      returnMetadata: true,
      ...options,
    }

    const response = await this.client.post("/retrieval/search", payload)
    return response.data
  }

  // Full Analysis API (with reasoning)
  async fullAnalysis(query, options = {}) {
    const payload = {
      query: query.trim(),
      context: options.context || "full",
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.3,
      includeSources: options.includeSources !== false,
      reasoningDepth: options.reasoningDepth || "comprehensive",
      ...options,
    }

    const response = await this.client.post("/reasoning/full-analysis", payload)
    return response.data
  }

  // Quick Analysis API
  async quickAnalysis(query, options = {}) {
    const payload = {
      query: query.trim(),
      context: options.context || "summary",
      maxTokens: options.maxTokens || 1000,
      ...options,
    }

    const response = await this.client.post(
      "/reasoning/quick-analysis",
      payload
    )
    return response.data
  }

  // Evaluation API
  async evaluateResponse(query, response, options = {}) {
    const payload = {
      query,
      response,
      criteria: options.criteria || [
        "accuracy",
        "relevance",
        "completeness",
        "clarity",
      ],
      returnDetailedFeedback: true,
      ...options,
    }

    const responseData = await this.client.post("/evaluation/evaluate", payload)
    return responseData.data
  }

  // Submit Feedback API
  async submitFeedback(feedbackData) {
    const payload = {
      ...feedbackData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }

    const response = await this.client.post("/evaluation/feedback", payload)
    return response.data
  }

  // Get Insights API
  async getInsights(timeRange = "7d", options = {}) {
    const payload = {
      timeRange,
      includeCharts: true,
      ...options,
    }

    const response = await this.client.get("/evaluation/insights", {
      params: payload,
    })
    return response.data
  }

  // Get Statistics API
  async getStats(options = {}) {
    const response = await this.client.get("/evaluation/stats", {
      params: options,
    })
    return response.data
  }

  // Health Check
  async healthCheck() {
    try {
      const response = await this.client.get("/health")
      return response.data
    } catch (error) {
      return { status: "unhealthy", error: error.message }
    }
  }

  // Test connection
  async testConnection() {
    try {
      await this.healthCheck()
      return true
    } catch {
      return false
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient()

export default apiClient

// Export individual methods for convenience
export const {
  search,
  fullAnalysis,
  quickAnalysis,
  evaluateResponse,
  submitFeedback,
  getInsights,
  getStats,
  healthCheck,
  testConnection,
} = apiClient
