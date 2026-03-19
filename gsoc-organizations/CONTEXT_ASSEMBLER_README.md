# Phase 4: Context Assembler

This phase implements context assembly with citation tracking and token control for retrieved ideas.

## Architecture

### Citation System

Generates proper citations for each retrieved idea:

**Citation Types:**

- **Markdown**: `[id]: **Title** (Organization, Year)`
- **Inline**: `(Source: id)`
- **Detailed**: Full citation with all metadata

**Features:**

- Unique ID per citation
- Automatic position numbering
- Relevance score tracking
- Token estimation per citation
- Source URL inclusion

### Context Assembler

Assembles retrieved results into structured context:

**Components:**

1. **Relevance Selection**: Top-K ideas by score
2. **Citation Generation**: Proper citations for each idea
3. **Context Building**: Markdown/Inline/Detailed formats
4. **Token Control**: Enforce token limits with smart truncation
5. **Metadata Inclusion**: Optional org/tech/topic context

**Context Types:**

- **Markdown**: `## Relevant Ideas\n\n[id]: Title...\nDescription...`
- **Inline**: `Here are ideas:\n1. Title (Source: id)...`
- **Detailed**: `## Detailed Ideas\n\n**Org**: Org\n**Year**: Year\n...`

### Token Control

Enforces LLM token limits:

**Features:**

- Configurable max tokens (default: 4000)
- Token estimation (words \* 1.3)
- Smart truncation (line by line)
- Truncation warnings
- Original token count tracking

**Control Strategies:**

- Stop at max tokens (soft limit)
- Truncate to fit within limit
- Preserve complete ideas where possible
- Add truncation indicator

## Quick Start

### 1. Validate Setup

```bash
npm run validate:phase4
```

Expected: 15 passed, 5 warnings (expected if Phase 1/2 not complete)

### 2. Start Services

```bash
# Start Qdrant (if not running)
npm run qdrant:start

# Start API server
npm run api:start
```

### 3. Test Context Assembly

```bash
npm run test:context
```

## API Endpoints

### Assemble Context

```bash
POST /api/context/assemble
Content-Type: application/json

{
  "query": "machine learning python",
  "retrievalResults": {
    "query": "...",
    "results": [...],
    "metadata": {...}
  },
  "options": {
    "maxTokens": 4000,
    "citationStyle": "markdown",
    "includeMetadata": true,
    "includeOrgContext": false,
    "includeTechContext": false,
    "sortByRelevance": true
  }
}
```

**Response:**

```json
{
  "query": "machine learning python",
  "ideas": [...],
  "citations": [...],
  "context": "## Relevant Ideas\n\n...",
  "tokenCount": 3845,
  "withinLimit": true,
  "metadata": {
    "totalIdeas": 10,
    "selectedIdeas": 5,
    "citationCount": 5,
    "queryType": "hybrid",
    "intent": "search"
  }
}
```

### Summarize Ideas

```bash
POST /api/context/summarize
Content-Type: application/json

{
  "ideas": [
    { "id": "1", "document": {...} },
    { "id": "2", "document": {...} }
  ]
}
```

**Response:**

```json
{
  "summary": "Found 2 relevant ideas...",
  "ideasCount": 2
}
```

### Get Citation

```bash
GET /api/context/citations/:id?format=markdown
```

**Parameters:**

- `format`: `markdown`, `inline`, `detailed` (default: markdown)

**Response:**

```json
{
  "id": "test-id-1",
  "markdown": "[test-id-1]: **Title** (Org, Year)",
  "inline": "(Source: test-id-1)",
  "json": {...}
}
```

### Context with Search

```bash
POST /api/context/context/with-search
Content-Type: application/json

{
  "query": "machine learning",
  "searchParams": {
    "topK": 10,
    "filters": {
      "year": 2025
    }
  },
  "contextOptions": {
    "maxTokens": 3000,
    "citationStyle": "inline"
  }
}
```

**Response:**

```json
{
  "query": "machine learning",
  "context": "...",
  "retrieval": {...},
  "citations": [...]
}
```

### Custom Template

```bash
POST /api/context/custom-template
Content-Type: application/json

{
  "retrievalResults": {...},
  "query": "query text",
  "template": "Top Ideas for \"{query}\"\n\n{position}. {title}\nOrganization: {org}\n..."
}
```

**Template Variables:**

- `{id}` - Idea ID
- `{title}` - Idea title
- `{org}` - Organization
- `{year}` - Year
- `{description}` - Short description
- `{tech_stack}` - Technology array
- `{topics}` - Topic array
- `{difficulty}` - Difficulty level
- `{status}` - Status
- `{source_url}` - Project URL
- `{score}` - Relevance score
- `{position}` - Position (1-indexed)
- `{citation}` - Inline citation

### Context Statistics

```bash
POST /api/context/context/statistics
Content-Type: application/json

{
  "context": "## Relevant Ideas\n\n..."
}
```

**Response:**

```json
{
  "lineCount": 45,
  "wordCount": 234,
  "charCount": 1847,
  "estimatedTokens": 305
}
```

## Usage Examples

### Basic Context Assembly

```bash
curl -X POST http://localhost:3001/api/context/assemble \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning python",
    "retrievalResults": {
      "results": [
        {
          "id": "test-1",
          "document": {
            "title": "PyTorch for Beginners",
            "org": "PyTorch",
            "year": 2025,
            "description": "Introduction to PyTorch...",
            "short_description": "Learn PyTorch basics"
          },
          "score": 0.92
        }
      ]
    }
  }'
```

### Summarize Multiple Ideas

```bash
curl -X POST http://localhost:3001/api/context/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "ideas": [
      {
        "id": "1",
        "document": {
          "title": "React Web Development",
          "org": "React",
          "short_description": "Build web apps with React"
        }
      },
      {
        "id": "2",
        "document": {
          "title": "Django Framework",
          "org": "Django",
          "short_description": "Python web framework"
        }
      }
    ]
  }'
```

### Get Specific Citation

```bash
# Markdown format (default)
curl http://localhost:3001/api/context/citations/test-id-1

# Inline format
curl http://localhost:3001/api/context/citations/test-id-1?format=inline

# Detailed format
curl http://localhost:3001/api/context/citations/test-id-1?format=detailed
```

### Custom Template

```bash
curl -X POST http://localhost:3001/api/context/custom-template \
  -H "Content-Type: application/json" \
  -d '{
    "query": "react web",
    "template": "Relevant ideas for \"{query}\"\n\n{position}. {title}\nTech: {tech_stack}\n\n{description}\n",
    "retrievalResults": {
      "results": [...]
    }
  }'
```

## Configuration

### Environment Variables (.env)

```bash
# Qdrant Configuration
QDRANT_HOST=localhost          # Qdrant host (default: localhost)
QDRANT_PORT=6333              # Qdrant port (default: 6333)

# Gemini API (for AI summarization)
GEMINI_API_KEY=your_key_here  # Optional - uses simple method if not set

# API Configuration
PORT=3001                     # API port
```

### Assembler Configuration

**Default Configuration:**

```javascript
{
  maxTokens: 4000,           // Maximum tokens for context
  maxIdeas: 10,              // Maximum ideas to include
  citationStyle: 'markdown',   // markdown | inline | detailed
  includeMetadata: true,     // Include metadata in context
  sortByRelevance: true        // Sort by relevance score
  includeOrgContext: false,    // Include org context section
  includeTechContext: false     // Include tech context section
}
```

## Token Estimation

**Algorithm:**

- Word-based: `tokens = words * 1.3`
- Character-based: `tokens = chars / 4`
- Maximum of both methods

**Examples:**

```
"Hello world" (2 words) → ~3 tokens
"Hello world" (11 chars) → ~3 tokens
"Machine learning is amazing" (4 words) → ~5 tokens
"Machine learning is amazing" (28 chars) → ~7 tokens
```

**Special Tokens:**

- Markdown formatting: ~2 tokens per `**`
- Citations: ~2-3 tokens per citation
- Line breaks: 1 token

## Context Templates

### Default Markdown Template

```
## Relevant Ideas

[id]: **Title** (Org, Year)

Description: [short_description]

Technologies: [tech_stack]
Topics: [topics]

---
```

### Inline Template

```
Here are some relevant GSoC ideas:

1. Title (Source: id)
   [description]

2. Title (Source: id)
   [description]
```

### Detailed Template

```
## Detailed Ideas

### [id]: Title
**Organization**: Org
**Year**: Year
**Status**: Status
**Difficulty**: Difficulty

Description: [description]

**Technologies**: [tech_stack]
**Topics**: [topics]

**Source**: [source_url]
**Project URL**: [project_url]

---

Next Idea...
```

## Performance Characteristics

| Operation                  | Speed | Description             |
| -------------------------- | ----- | ----------------------- |
| Citation Generation        | <10ms | Per citation            |
| Context Assembly (5 ideas) | <50ms | Full assembly           |
| Token Estimation           | <5ms  | Full context            |
| Summarization              | 1-2s  | AI-powered (if enabled) |
| Custom Template            | <30ms | Variable-based          |

## Token Control Strategies

### Smart Truncation

1. Complete ideas first
2. If limit reached, truncate last idea
3. Preserve sentence boundaries
4. Add truncation indicator: `... (truncated)`

### Example

```
Max tokens: 1000
Idea 1: 200 tokens ✓
Idea 2: 300 tokens ✓
Idea 3: 400 tokens ✓
Idea 4: 150 tokens
Idea 5: 100 tokens

Result: Truncated after Idea 4 to fit limit
```

## Troubleshooting

### Context Too Long

```bash
# Reduce maxTokens in options
{
  "options": {
    "maxTokens": 2000
  }
}

# Or reduce maxIdeas
{
  "options": {
    "maxIdeas": 5
  }
}
```

### Summarization Not Working

```bash
# Set GEMINI_API_KEY for AI mode
GEMINI_API_KEY=your_actual_key

# Or system will use simple summarization
```

### Citation Format Issues

```bash
# Use format parameter for different citation styles
?format=markdown     # [id]: **Title**
?format=inline       # (Source: id)
?format=detailed     # Full citation with all metadata
```

## Testing

### Run All Tests

```bash
npm run test:context
```

Tests:

1. Basic assembly
2. Citation generation
3. Summarization
4. Token control
5. Custom template
6. Context with search

### Manual Testing

```bash
# Test basic assembly
curl -X POST http://localhost:3001/api/context/assemble \
  -H "Content-Type: application/json" \
  -d '{"query":"test","retrievalResults":{"results":[{"id":"test-1","document":{"title":"Test","short_description":"Test"}}]}}'

# Test with custom options
curl -X POST http://localhost:3001/api/context/assemble \
  -H "Content-Type: application/json" \
  -d '{"query":"test","retrievalResults":{"results":[...]},"options":{"maxTokens":2000,"citationStyle":"inline"}}'
```

## Integration

### With Phase 3 (Retrieval Orchestrator)

```javascript
const retrievalResults = await orchestrator.retrieve({
  query: "machine learning python",
  topK: 10,
  returnMetadata: true,
})

const context = await assembler.assemble(retrievalResults, query)

// Use context for LLM
const llmResponse = await llm.generate(context.context)
```

### Complete Pipeline

```javascript
// 1. Query Intelligence (Phase 3)
const analysis = await queryAgent.analyze(query)

// 2. Retrieval (Phase 3)
const retrievalResults = await orchestrator.retrieve(analysis)

// 3. Context Assembly (Phase 4)
const context = await assembler.assemble(retrievalResults, query)

// 4. LLM Reasoning (Phase 5)
const reasoning = await llmReasoner.reason(context, query)

// 5. Self-Evaluation (Phase 6)
const evaluation = await selfEvaluator.evaluate(reasoning, context)
```

## Documentation

- **Phase 4 Guide**: This file
- **Phase 4 Overview**: `PHASE4_OVERVIEW.md` (quick reference)
- **Phase 3 Guide**: `RETRIEVAL_README.md` (retrieval system)
- **Phase 2 Guide**: `INDEXING_README.md` (vector + BM25)
- **Phase 1 Guide**: `INGESTION_README.md` (data ingestion)

## Next Steps

After Phase 4:

1. **Phase 5**: Build LLM Reasoner with tool-calling
2. **Phase 6**: Implement Self-Evaluator
3. **Integration**: Connect all phases end-to-end
4. **Frontend**: Add UI for all features

## Best Practices

1. **Set appropriate token limits**: Balance completeness vs. performance
2. **Use relevant citations**: Proper attribution for sources
3. **Choose right citation style**: Markdown for reading, inline for brevity
4. **Monitor token usage**: Track context sizes for optimization
5. **Include metadata when needed**: More context for better responses
6. **Custom templates for specific use cases**: Tailor output to your needs
