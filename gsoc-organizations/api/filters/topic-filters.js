const filters = {
  ml: ["machine learning"],
  ai: ["artificial intelligence"],
  cv: ["computer vision"],
  nlp: ["natural language processing"],
  "web dev": ["web development"],
  webapp: ["web development"],
}

const filter = topic => {
  if (topic in filters) {
    return filters[topic]
  }

  return [topic.trim()]
}

module.exports = {
  filter: filter,
}
