const { GoogleGenerativeAI } = require("@google/generative-ai")
require("dotenv").config()

class DifficultyEstimator {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: "gemini-pro" })
      : null
  }

  async estimate(project) {
    if (!this.model) {
      return this.fallbackEstimate(project)
    }

    try {
      const prompt = this.buildPrompt(project)
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text().trim().toLowerCase()

      return this.parseDifficulty(text)
    } catch (error) {
      console.error("AI difficulty estimation failed:", error.message)
      return this.fallbackEstimate(project)
    }
  }

  buildPrompt(project) {
    return `Analyze the difficulty of this GSoC project and classify it as one of: easy, medium, hard, or expert.

Title: ${project.title}
Description: ${project.description || project.short_description || ""}
Tech Stack: ${project.tech_stack ? project.tech_stack.join(", ") : ""}

Consider:
- Complexity of the codebase/tools involved
- Scope and size of the work
- Required knowledge depth
- Documentation quality
- Mentoring support available

Respond with ONLY one word: easy, medium, hard, or expert`
  }

  parseDifficulty(text) {
    const levels = ["expert", "hard", "medium", "easy"]
    for (const level of levels) {
      if (text.includes(level)) {
        return level
      }
    }
    return "medium"
  }

  fallbackEstimate(project) {
    let score = 0

    const title = (project.title || "").toLowerCase()
    const description = (
      project.description ||
      project.short_description ||
      ""
    ).toLowerCase()
    const techStack = (project.tech_stack || []).map(t => t.toLowerCase())

    const hardIndicators = [
      "kernel",
      "driver",
      "compiler",
      "optimization",
      "distributed",
      "scalability",
      "performance",
      "cryptography",
      "security",
      "blockchain",
      "machine learning",
      "deep learning",
      "ai",
      "reinforcement learning",
      "neural network",
      "research",
      "experiment",
      "novel",
    ]

    const easyIndicators = [
      "ui",
      "frontend",
      "documentation",
      "translation",
      "tutorial",
      "example",
      "sample",
      "demo",
      "simple",
      "basic",
      "beginner",
      "starter",
    ]

    const text = `${title} ${description}`

    for (const indicator of hardIndicators) {
      if (text.includes(indicator)) score += 2
    }

    for (const indicator of easyIndicators) {
      if (text.includes(indicator)) score -= 1
    }

    const complexTechs = [
      "rust",
      "c++",
      "kernel",
      "assembly",
      "haskell",
      "erlang",
    ]
    for (const tech of techStack) {
      if (complexTechs.some(ct => tech.includes(ct))) score += 2
    }

    const beginnerTechs = ["html", "css", "javascript", "python"]
    for (const tech of techStack) {
      if (beginnerTechs.includes(tech)) score -= 0.5
    }

    if (score >= 4) return "expert"
    if (score >= 2) return "hard"
    if (score >= 0) return "medium"
    return "easy"
  }

  async estimateBatch(projects) {
    const estimates = await Promise.all(
      projects.map(project => this.estimate(project))
    )
    return projects.map((project, index) => ({
      ...project,
      difficulty: estimates[index],
    }))
  }
}

module.exports = DifficultyEstimator
