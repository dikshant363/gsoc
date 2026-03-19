const axios = require("axios")
const cheerio = require("cheerio")

class GitHubAnalyzer {
  constructor() {
    this.apiBase = "https://api.github.com"
    this.rateLimitRemaining = 60
    this.rateLimitReset = 0
    this.cache = new Map()
  }

  extractRepoUrls(text) {
    const urls = []

    const githubPattern = /https?:\/\/(?:www\.)?github\.com\/[\w-]+\/[\w.-]+/gi
    const gitlabPattern = /https?:\/\/(?:www\.)?gitlab\.com\/[\w-]+\/[\w.-]+/gi
    const bitbucketPattern =
      /https?:\/\/(?:www\.)?bitbucket\.org\/[\w-]+\/[\w.-]+/gi

    const githubMatches = text.match(githubPattern) || []
    const gitlabMatches = text.match(gitlabPattern) || []
    const bitbucketMatches = text.match(bitbucketPattern) || []

    urls.push(...githubMatches)
    urls.push(...gitlabMatches)
    urls.push(...bitbucketMatches)

    return [...new Set(urls)]
  }

  parseRepoUrl(url) {
    const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (githubMatch) {
      return {
        platform: "github",
        owner: githubMatch[1],
        repo: githubMatch[2].replace(/\.git$/, ""),
        apiUrl: `https://api.github.com/repos/${
          githubMatch[1]
        }/${githubMatch[2].replace(/\.git$/, "")}`,
        rawUrl: url,
      }
    }

    const gitlabMatch = url.match(/gitlab\.com\/([^\/]+)\/([^\/]+)/)
    if (gitlabMatch) {
      return {
        platform: "gitlab",
        owner: gitlabMatch[1],
        repo: gitlabMatch[2].replace(/\.git$/, ""),
        apiUrl: `https://gitlab.com/api/v4/projects/${encodeURIComponent(
          gitlabMatch[1] + "/" + gitlabMatch[2]
        )}`,
        rawUrl: url,
      }
    }

    return null
  }

  async fetchGitHubRepoInfo(owner, repo) {
    const cacheKey = `github:${owner}/${repo}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    if (this.rateLimitRemaining <= 1) {
      await this.waitForRateLimit()
    }

    try {
      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GSoC-Organizations-Ingestor",
          },
          timeout: 10000,
        }
      )

      this.rateLimitRemaining = parseInt(
        response.headers["x-ratelimit-remaining"] || 0
      )
      this.rateLimitReset = parseInt(response.headers["x-ratelimit-reset"] || 0)

      const data = response.data
      const repoInfo = {
        name: data.name,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        languagesUrl: data.languages_url,
        updatedAt: data.updated_at,
        createdAt: data.created_at,
        size: data.size,
        openIssues: data.open_issues_count,
        homepage: data.homepage,
        hasWiki: data.has_wiki,
        hasPages: data.has_pages,
        topics: data.topics || [],
        license: data.license ? data.license.name : null,
      }

      this.cache.set(cacheKey, repoInfo)
      return repoInfo
    } catch (error) {
      console.error(
        `Failed to fetch GitHub repo ${owner}/${repo}:`,
        error.message
      )
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  async fetchGitLabRepoInfo(projectId) {
    try {
      const response = await axios.get(
        `https://gitlab.com/api/v4/projects/${projectId}`,
        {
          headers: {
            "User-Agent": "GSoC-Organizations-Ingestor",
          },
          timeout: 10000,
        }
      )

      const data = response.data
      return {
        name: data.name,
        description: data.description,
        stars: data.star_count,
        forks: data.forks_count,
        language: null,
        languages: null,
        updatedAt: data.last_activity_at,
        createdAt: data.created_at,
        openIssues: data.open_issues_count,
        topics: data.topics || [],
        license: data.license ? data.license.name : null,
      }
    } catch (error) {
      console.error(`Failed to fetch GitLab repo ${projectId}:`, error.message)
      return null
    }
  }

  async fetchRepoLanguages(repoInfo) {
    if (repoInfo.platform !== "github") {
      return {}
    }

    try {
      const { owner, repo } = repoInfo
      const cacheKey = `github:${owner}/${repo}:languages`

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/languages`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GSoC-Organizations-Ingestor",
          },
          timeout: 10000,
        }
      )

      const languages = response.data

      this.cache.set(cacheKey, languages)
      return languages
    } catch (error) {
      console.error(`Failed to fetch repo languages:`, error.message)
      return {}
    }
  }

  async fetchREADME(repoInfo) {
    if (repoInfo.platform !== "github") {
      return null
    }

    try {
      const { owner, repo } = repoInfo

      const response = await axios.get(
        `${this.apiBase}/repos/${owner}/${repo}/readme`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GSoC-Organizations-Ingestor",
          },
          timeout: 10000,
        }
      )

      const content = Buffer.from(response.data.content, "base64").toString(
        "utf-8"
      )
      return content
    } catch (error) {
      console.error(`Failed to fetch README:`, error.message)
      return null
    }
  }

  async waitForRateLimit() {
    if (this.rateLimitReset > 0) {
      const now = Math.floor(Date.now() / 1000)
      const waitSeconds = Math.max(0, this.rateLimitReset - now)
      console.log(`Rate limit reached. Waiting ${waitSeconds} seconds...`)

      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
    }
  }

  extractTechStackFromREADME(readme) {
    if (!readme) return []

    const techs = new Set()

    const commonTechs = [
      "javascript",
      "typescript",
      "python",
      "java",
      "go",
      "rust",
      "c++",
      "c#",
      "php",
      "ruby",
      "swift",
      "kotlin",
      "react",
      "vue",
      "angular",
      "node",
      "express",
      "django",
      "flask",
      "spring",
      "postgresql",
      "mongodb",
      "redis",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "tensorflow",
      "pytorch",
      "keras",
      "scikit-learn",
      "graphql",
      "grpc",
      "rest",
      "websocket",
      "mqtt",
      "electron",
      "react native",
      "flutter",
      "unity",
      "unreal",
    ]

    const readmeLower = readme.toLowerCase()

    for (const tech of commonTechs) {
      if (readmeLower.includes(tech)) {
        techs.add(tech)
      }
    }

    const badgePatterns = [
      /!\[.*?badge.*?\]\(.*?\)/gi,
      /!\[.*?build status.*?\]\(.*?\)/gi,
      /!\[.*?coverage.*?\]\(.*?\)/gi,
    ]

    for (const pattern of badgePatterns) {
      const matches = readme.match(pattern) || []
      for (const match of matches) {
        const urlMatch = match.match(/https?:\/\/[^\)]+/)
        if (urlMatch) {
          const url = urlMatch[0].toLowerCase()
          for (const tech of commonTechs) {
            if (url.includes(tech)) {
              techs.add(tech)
            }
          }
        }
      }
    }

    return Array.from(techs)
  }

  async analyzeRepo(url) {
    const repoInfo = this.parseRepoUrl(url)
    if (!repoInfo) {
      return null
    }

    if (repoInfo.platform === "github") {
      const info = await this.fetchGitHubRepoInfo(repoInfo.owner, repoInfo.repo)
      if (!info) return null

      const languages = await this.fetchRepoLanguages(repoInfo)
      const readme = await this.fetchREADME(repoInfo)
      const readmeTechs = this.extractTechStackFromREADME(readme)

      return {
        ...info,
        languages: Object.keys(languages),
        languageBreakdown: languages,
        readmeTechs,
      }
    } else if (repoInfo.platform === "gitlab") {
      return await this.fetchGitLabRepoInfo(repoInfo.repo)
    }

    return null
  }

  async analyzeRepos(urls) {
    const results = []

    for (const url of urls) {
      try {
        const result = await this.analyzeRepo(url)
        if (result) {
          results.push({ url, ...result })
        }
      } catch (error) {
        console.error(`Failed to analyze ${url}:`, error.message)
      }
    }

    return results
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitReset: this.rateLimitReset,
    }
  }
}

module.exports = GitHubAnalyzer
