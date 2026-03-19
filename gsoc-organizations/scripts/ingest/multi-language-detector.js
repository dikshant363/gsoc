const { franc } = require("franc")

class LanguageDetector {
  constructor() {
    this.cache = new Map()
    this.supportedLanguages = {
      eng: "en",
      spa: "es",
      fra: "fr",
      deu: "de",
      por: "pt",
      rus: "ru",
      chi: "zh",
      jpn: "ja",
      kor: "ko",
      ara: "ar",
      hin: "hi",
      ben: "bn",
      ind: "id",
      vie: "vi",
      tha: "th",
      tur: "tr",
      ita: "it",
      nld: "nl",
      pol: "pl",
      ukr: "uk",
      heb: "he",
    }
  }

  detect(text, minLength = 20) {
    if (!text || text.length < minLength) {
      return { language: "en", confidence: 0, code: "en" }
    }

    const cacheKey = text.substring(0, 100)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const detected = franc(text)

      if (detected === "und") {
        const result = { language: "en", confidence: 0, code: "en" }
        this.cache.set(cacheKey, result)
        return result
      }

      const isoCode = this.mapToISO(detected)

      const result = {
        language: isoCode,
        confidence: this.estimateConfidence(text, detected),
        code: detected,
      }

      this.cache.set(cacheKey, result)
      return result
    } catch (error) {
      console.error("Language detection failed:", error.message)
      return { language: "en", confidence: 0, code: "en" }
    }
  }

  mapToISO(francCode) {
    return this.supportedLanguages[francCode] || "en"
  }

  estimateConfidence(text, francCode) {
    const length = text.length

    if (length < 50) return 0.3
    if (length < 100) return 0.5
    if (length < 200) return 0.7

    if (francCode === "und") return 0
    if (francCode === "eng") return 0.9

    return 0.8
  }

  isEnglish(text) {
    const result = this.detect(text)
    return result.language === "en" && result.confidence > 0.7
  }

  detectBatch(texts) {
    return texts.map(text => this.detect(text))
  }

  async translateIfNeeded(text, targetLanguage = "en") {
    const detected = this.detect(text)

    if (detected.language === targetLanguage && detected.confidence > 0.8) {
      return {
        original: text,
        translated: null,
        originalLanguage: detected.language,
        needsTranslation: false,
      }
    }

    return {
      original: text,
      translated: text,
      originalLanguage: detected.language,
      needsTranslation: false,
    }
  }

  getLanguageStats(texts) {
    const stats = {}

    for (const text of texts) {
      const result = this.detect(text)
      const lang = result.language

      if (!stats[lang]) {
        stats[lang] = 0
      }
      stats[lang]++
    }

    const total = texts.length
    return Object.entries(stats)
      .map(([language, count]) => ({
        language,
        count,
        percentage: ((count / total) * 100).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count)
  }
}

module.exports = LanguageDetector
