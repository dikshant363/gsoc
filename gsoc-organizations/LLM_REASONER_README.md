# Phase 5: LLM Reasoner & Multi-Hop Analysis

This phase implements intelligent LLM reasoning with tool-calling capabilities for complex GSoC project analysis.

## Architecture

### LLM Reasoner

Core reasoning engine with tool-calling capabilities:

**Components:**

- **Gemini Pro Integration**: Uses Google Gemini for advanced reasoning
- **Tool Calling**: Executes tools to gather additional information
- **Iterative Reasoning**: Multiple reasoning steps with tool results
- **Confidence Scoring**: Assesses answer quality and completeness

### Multi-Hop Analyzer

Orchestrates complex queries requiring multiple reasoning steps:

**Features:**

- **Query Decomposition**: Breaks complex queries into manageable parts
- **Sequential Reasoning**: Performs analysis in logical steps
- **Context Accumulation**: Builds knowledge across hops
- **Answer Synthesis**: Combines results from multiple steps

### Tool System

Available tools for gathering information:

1. **search_ideas**: Semantic/keyword search for GSoC projects
2. **get_org_analysis**: Detailed analysis of organization projects
3. **compare_ideas**: Compare projects, organizations, or technologies
4. **get_idea_details**: Get specific project information
5. **summarize_context**: Summarize provided context
6. **find_recommendations**: Personalized project recommendations

## Quick Start

### 1. Validate Setup

```bash
npm run validate:phase5
```

Expected: 15 passed, 5 warnings

### 2. Start Services

```bash
# Start Qdrant (if not running)
npm run qdrant:start

# Start API server
npm run api:start
```

### 3. Test Reasoning

```bash
npm run test:reasoning
```

## API Endpoints

### Basic Reasoning

```bash
POST /api/reasoning/reason
Content-Type: application/json

{
  "query": "What machine learning projects are available?",
  "context": "## Relevant Ideas\n\n[1]: PyTorch Project...",
  "options": {
    "maxIterations": 3,
    "maxToolCalls": 5
  }
}
```

**Response:**

```json
{
  "query": "What machine learning projects are available?",
  "finalAnswer": "Based on the available information...",
  "confidence": 0.92,
  "steps": [...],
  "toolCalls": [...],
  "metadata": {
    "iterations": 2,
    "totalToolCalls": 1,
    "reasoningTime": 1450
  }
}
```

### Multi-Hop Analysis

```bash
POST /api/reasoning/multi-hop-analyze
Content-Type: application/json

{
  "query": "Compare machine learning projects between PyTorch and TensorFlow",
  "options": {
    "maxHops": 3,
    "verbose": false
  }
}
```

**Response:**

```json
{
  "query": "Compare machine learning projects...",
  "finalAnswer": "Analysis of ML projects...",
  "confidence": 0.88,
  "multiHopInfo": {
    "totalHops": 2,
    "hopHistory": [...],
    "finalHop": 2
  }
}
```

### Reasoning with Context Assembly

```bash
POST /api/reasoning/reason-with-context
Content-Type: application/json

{
  "query": "Find beginner-friendly Python projects",
  "retrievalResults": {...},
  "reasoningOptions": {
    "maxIterations": 3
  },
  "contextOptions": {
    "maxTokens": 2000
  }
}
```

### Full Analysis Pipeline

```bash
POST /api/reasoning/full-analysis
Content-Type: application/json

{
  "query": "What are good GSoC projects for someone with Python experience?",
  "options": {
    "maxHops": 3
  }
}
```

Combines retrieval, context assembly, and reasoning in one call.

### Get Available Tools

```bash
GET /api/reasoning/tools
```

**Response:**

```json
{
  "tools": [
    {
      "name": "search_ideas",
      "description": "Search for GSoC ideas...",
      "parameters": {...}
    }
  ],
  "count": 6
}
```

### Reasoning Statistics

```bash
GET /api/reasoning/stats
```

**Response:**

```json
{
  "reasoner": {
    "mockMode": false,
    "totalToolCalls": 45,
    "totalIterations": 23,
    "availableTools": ["search_ideas", "get_org_analysis", ...]
  },
  "multiHop": {
    "totalHops": 12,
    "hopHistory": [...]
  }
}
```

## Usage Examples

### Simple Reasoning

```bash
curl -X POST http://localhost:3001/api/reasoning/reason \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What Python projects are available?",
    "context": "GSoC projects with Python...",
    "options": {
      "maxIterations": 2,
      "maxToolCalls": 3
    }
  }'
```

### Multi-Hop Complex Analysis

```bash
curl -X POST http://localhost:3001/api/reasoning/multi-hop-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare web development projects between React and Vue organizations"
  }'
```

### Full Pipeline Analysis

```bash
curl -X POST http://localhost:3001/api/reasoning/full-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Recommend GSoC projects for a beginner interested in machine learning"
  }'
```

### Tool-Based Reasoning

```bash
curl -X POST http://localhost:3001/api/reasoning/reason \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Analyze PostgreSQL organization projects",
    "context": "Basic project info...",
    "options": {
      "maxToolCalls": 5
    }
  }'
```

## Tool System Details

### search_ideas

**Parameters:**

```json
{
  "query": "machine learning",
  "queryType": "semantic|exact|hybrid",
  "filters": {
    "org": "PyTorch",
    "year": 2025,
    "tech_stack": ["python"],
    "difficulty": "medium"
  },
  "topK": 10
}
```

### get_org_analysis

**Parameters:**

```json
{
  "org": "PostgreSQL",
  "limit": 50
}
```

**Returns:** Detailed organization statistics and project analysis.

### compare_ideas

**Parameters:**

```json
{
  "items": ["PyTorch", "TensorFlow"],
  "criteria": ["difficulty", "technology", "year"]
}
```

**Returns:** Comparison analysis between specified items.

### get_idea_details

**Parameters:**

```json
{
  "ideaId": "project-id-123"
}
```

**Returns:** Complete project information.

### summarize_context

**Parameters:**

```json
{
  "context": "Long text to summarize...",
  "focus": "key points"
}
```

**Returns:** Concise summary of provided context.

### find_recommendations

**Parameters:**

```json
{
  "profile": "Python developer, machine learning beginner",
  "criteria": ["beginner-friendly", "active mentorship"],
  "topK": 5
}
```

**Returns:** Personalized project recommendations.

## Reasoning Flow

### Single-Hop Reasoning

```
Query Input
    ↓
Query Intelligence Agent
    ↓
Context Assembly
    ↓
LLM Reasoning
    ↓
Tool Calling (optional)
    ↓
Final Answer
```

### Multi-Hop Reasoning

```
Query Input
    ↓
Hop 1: Initial Analysis
    ↓
Gather Additional Context
    ↓
Hop 2: Deeper Analysis
    ↓
Compare/Contrast Information
    ↓
Hop 3: Synthesis (if needed)
    ↓
Final Comprehensive Answer
```

## Configuration

### Environment Variables (.env)

```bash
# Gemini API (required for reasoning)
GEMINI_API_KEY=your_key_here  # For LLM reasoning

# Qdrant Configuration
QDRANT_HOST=localhost          # Qdrant host
QDRANT_PORT=6333              # Qdrant port

# API Configuration
PORT=3001                     # API port
```

### Reasoning Configuration

**LLM Reasoner Config:**

```javascript
{
  temperature: 0.7,           // Creativity level (0.0-1.0)
  topK: 40,                   // Token selection diversity
  topP: 0.95,                 // Nucleus sampling
  maxOutputTokens: 2048,      // Maximum response length
  maxToolCalls: 5,            // Maximum tool calls per reasoning
  maxIterations: 3            // Maximum reasoning iterations
}
```

**Multi-Hop Config:**

```javascript
{
  maxHops: 3,                 // Maximum reasoning hops
  hopHistory: [],             // Track reasoning history
  currentHop: 0               // Current hop counter
}
```

## Performance Characteristics

| Operation          | Speed | Notes                     |
| ------------------ | ----- | ------------------------- |
| Basic Reasoning    | <2s   | Single iteration          |
| Tool Calling       | <5s   | Includes tool execution   |
| Multi-Hop (2 hops) | <10s  | Sequential analysis       |
| Full Pipeline      | <15s  | End-to-end analysis       |
| Context Assembly   | <2s   | Token estimation included |

## Error Handling

### Graceful Degradation

- **No API Key**: Falls back to mock reasoning
- **Tool Failures**: Continues with available information
- **Network Issues**: Retries with exponential backoff
- **Invalid Queries**: Provides helpful error messages

### Confidence Scoring

- **High (>0.9)**: Comprehensive, well-supported answer
- **Medium (0.7-0.9)**: Good answer with some gaps
- **Low (<0.7)**: Incomplete or uncertain answer

## Testing

### Run All Tests

```bash
npm run test:reasoning
```

Tests:

1. Basic LLM reasoning
2. Tool calling capabilities
3. Multi-hop analysis
4. Reasoning with context
5. Full analysis pipeline

### Manual Testing

```bash
# Test basic reasoning
curl -X POST http://localhost:3001/api/reasoning/reason \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What ML projects are available?",
    "context": "GSoC projects..."
  }'

# Test multi-hop analysis
curl -X POST http://localhost:3001/api/reasoning/multi-hop-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare Python and Java projects"
  }'

# Get available tools
curl http://localhost:3001/api/reasoning/tools

# Check statistics
curl http://localhost:3001/api/reasoning/stats
```

## Troubleshooting

### Low Confidence Scores

```bash
# Set GEMINI_API_KEY for better reasoning
GEMINI_API_KEY=your_actual_key

# Provide more context in queries
"Analyze machine learning projects in detail"
```

### Tool Calls Failing

```bash
# Check Qdrant is running
curl http://localhost:6333/health

# Verify retrieval endpoints work
curl -X POST http://localhost:3001/api/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'
```

### Multi-Hop Not Working

```bash
# Use comparison keywords
"Compare X and Y"
"X vs Y projects"
"Difference between X and Y"
```

### Slow Responses

```bash
# Reduce maxIterations
{
  "options": {
    "maxIterations": 2,
    "maxToolCalls": 3
  }
}

# Reduce maxHops
{
  "options": {
    "maxHops": 2
  }
}
```

## Integration

### With Previous Phases

```javascript
// Phase 3: Get retrieval results
const retrievalResults = await orchestrator.retrieve({
  query: "machine learning python",
  topK: 10,
})

// Phase 4: Assemble context
const context = await assembler.assemble(retrievalResults, query)

// Phase 5: Perform reasoning
const reasoning = await reasoner.reason(query, context.context, {
  maxIterations: 3,
  maxToolCalls: 5,
})

// Final result combines all phases
const finalResult = {
  query,
  retrieval: retrievalResults,
  context: context,
  reasoning: reasoning,
}
```

### Complete Pipeline

```javascript
const fullAnalysis = await multiHopAnalyzer.analyze(query, {
  maxHops: 3,
  // Includes automatic retrieval and context assembly
})

// Result contains everything: retrieval, context, reasoning
```

## Best Practices

1. **Provide Context**: Always include relevant context for better reasoning
2. **Use Specific Queries**: "Compare React and Vue" vs "Compare frameworks"
3. **Set Appropriate Limits**: Balance speed vs. completeness
4. **Monitor Confidence**: Use confidence scores to assess answer quality
5. **Handle Errors**: Check for error fields in responses
6. **Cache Results**: Implement caching for frequent queries

## Advanced Features

### Custom Tool Development

Add new tools by extending the `defineTools()` method:

```javascript
custom_tool: {
  name: "custom_tool",
  description: "Custom analysis tool",
  parameters: {
    type: "object",
    properties: {
      param1: { type: "string" }
    },
    required: ["param1"]
  }
}
```

### Reasoning Strategies

- **Chain-of-Thought**: Step-by-step reasoning
- **Tree-of-Thought**: Explore multiple reasoning paths
- **Tool-Augmented**: Use tools to expand knowledge
- **Multi-Hop**: Sequential analysis steps

## Documentation

- **Phase 5 Guide**: This file
- **Phase 5 Overview**: `PHASE5_OVERVIEW.md` (quick reference)
- **Phase 4 Guide**: `CONTEXT_ASSEMBLER_README.md` (context assembly)
- **Phase 3 Guide**: `RETRIEVAL_README.md` (retrieval system)
- **Phase 2 Guide**: `INDEXING_README.md` (vector + BM25)
- **Phase 1 Guide**: `INGESTION_README.md` (data ingestion)

## Next Steps

After Phase 5:

1. **Phase 6**: Implement Self-Evaluator for answer quality assessment
2. **Integration**: Connect all phases into unified API
3. **Frontend**: Build user interface for all capabilities
4. **Production**: Optimize for production deployment

## Success Criteria

- ✅ LLM reasoning with Gemini Pro integration
- ✅ Tool-calling system with 6 specialized tools
- ✅ Multi-hop analysis for complex queries
- ✅ Confidence scoring and answer quality assessment
- ✅ Integration with previous phases
- ✅ RESTful API with comprehensive endpoints
- ✅ Comprehensive test suite
- ✅ Performance <15s for full pipeline
- ✅ Error handling and graceful degradation
