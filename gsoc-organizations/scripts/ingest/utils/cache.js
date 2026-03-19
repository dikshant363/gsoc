const NodeCache = require("node-cache")

class DataCache {
  constructor(ttlSeconds = 3600) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds / 2,
      useClones: false,
    })
  }

  get(key) {
    return this.cache.get(key)
  }

  set(key, value, ttl) {
    return this.cache.set(key, value, ttl)
  }

  del(key) {
    return this.cache.del(key)
  }

  flushAll() {
    this.cache.flushAll()
  }

  getStats() {
    return this.cache.getStats()
  }

  has(key) {
    return this.cache.has(key)
  }

  getOrSet(key, factory, ttl) {
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }

    const value = factory()
    this.set(key, value, ttl)
    return value
  }

  getMultiple(keys) {
    return this.cache.mget(keys)
  }

  setMultiple(keyValueMap, ttl) {
    return this.cache.mset(keyValueMap)
  }
}

module.exports = DataCache
