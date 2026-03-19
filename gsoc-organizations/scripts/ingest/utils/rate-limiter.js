const { default: PQueue } = require("p-queue")

class RateLimiter {
  constructor(options = {}) {
    this.ratePerSecond = options.ratePerSecond || 1
    this.maxConcurrent = options.maxConcurrent || 1

    const interval = 1000 / this.ratePerSecond

    this.queue = new PQueue({
      concurrency: this.maxConcurrent,
      interval,
      intervalCap: this.ratePerSecond,
    })

    this.requestCount = 0
    this.startTime = Date.now()
  }

  async execute(task) {
    this.requestCount++

    try {
      const result = await this.queue.add(task)
      return result
    } catch (error) {
      console.error("Task failed:", error.message)
      throw error
    }
  }

  async executeWithRetry(task, maxRetries = 3, backoffMs = 1000) {
    let lastError

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.execute(task)
      } catch (error) {
        lastError = error

        if (attempt < maxRetries - 1) {
          const waitTime = backoffMs * Math.pow(2, attempt)
          console.log(`Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms`)
          await this.sleep(waitTime)
        }
      }
    }

    throw lastError
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getStats() {
    const elapsed = (Date.now() - this.startTime) / 1000
    return {
      requestCount: this.requestCount,
      elapsedSeconds: elapsed,
      requestsPerSecond: this.requestCount / elapsed,
      queueSize: this.queue.size,
      pending: this.queue.pending,
      queueSize: this.queue.size,
      pending: this.queue.pending,
    }
  }

  async onIdle() {
    return this.queue.onIdle()
  }

  pause() {
    this.queue.pause()
  }

  start() {
    this.queue.start()
  }

  clear() {
    this.queue.clear()
  }

  reset() {
    this.requestCount = 0
    this.startTime = Date.now()
    this.clear()
  }
}

module.exports = RateLimiter
