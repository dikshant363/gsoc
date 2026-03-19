const crypto = require("crypto")
const slugify = require("slugify")

class IDGenerator {
  static generate(org, year, title) {
    const orgSlug = slugify(org, {
      lower: true,
      strict: true,
      remove: /[^\w\s-]/g,
    })

    const hash = this.hashTitle(title)

    return `${orgSlug}-${year}-${hash}`
  }

  static hashTitle(title) {
    const hash = crypto.createHash("sha256")
    hash.update(title.trim())
    const fullHash = hash.digest("hex")
    return fullHash.substring(0, 8)
  }

  static generateFromProject(org, year, project) {
    return this.generate(
      org,
      year,
      project.title || project.short_description || ""
    )
  }

  static generateUniqueId() {
    return crypto.randomUUID()
  }

  static validate(id) {
    const pattern = /^[a-z0-9-]+-\d{4}-[a-f0-9]+$/
    return pattern.test(id)
  }

  static extractOrg(id) {
    const match = id.match(/^([a-z0-9-]+)-\d{4}-[a-f0-9]+$/)
    return match ? match[1] : null
  }

  static extractYear(id) {
    const match = id.match(/^[a-z0-9-]+-(\d{4})-[a-f0-9]+$/)
    return match ? parseInt(match[1]) : null
  }
}

module.exports = IDGenerator
