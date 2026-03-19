const { JSDOM } = require("jsdom")

class TextNormalizer {
  static normalizeHTML(html) {
    if (!html) return ""

    const dom = new JSDOM(html)
    const document = dom.window.document

    const body = document.body

    const cleanNode = node => {
      if (node.nodeType === 3) {
        return node.textContent
      }

      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase()
        if (tag === "script" || tag === "style" || tag === "noscript") {
          return ""
        }

        if (tag === "br" || tag === "hr") {
          return "\n"
        }

        if (tag === "p" || tag === "div") {
          return Array.from(node.childNodes).map(cleanNode).join("") + "\n"
        }

        return Array.from(node.childNodes).map(cleanNode).join("")
      }

      return ""
    }

    return cleanNode(body).trim()
  }

  static normalizeTitle(title) {
    if (!title) return ""

    return title
      .replace(/[\r\n\t]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\w\s\-:.,!?()]/g, "")
      .trim()
  }

  static normalizeDescription(description) {
    if (!description) return ""

    let normalized = description
      .replace(/[\r\n]+/g, "\n")
      .replace(/\t+/g, " ")
      .replace(/\s{3,}/g, "  ")
      .trim()

    return normalized
  }

  static removeMarkdown(markdown) {
    if (!markdown) return ""

    let text = markdown
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/---/g, "")
      .replace(/===/g, "")

    return text.trim()
  }

  static truncate(text, maxLength = 500, suffix = "...") {
    if (!text) return ""
    if (text.length <= maxLength) return text

    return text.substring(0, maxLength - suffix.length).trim() + suffix
  }

  static extractSentences(text, maxSentences = 2) {
    if (!text) return ""

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    return sentences.slice(0, maxSentences).join(" ").trim()
  }
}

module.exports = TextNormalizer
