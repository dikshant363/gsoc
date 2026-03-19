# Phase 3: Retrieval Orchestrator

This phase implements intelligent query analysis and retrieval orchestration with multi-hop reasoning capabilities.

## Architecture

### Query Intelligence Agent

Analyzes user queries to understand intent and extract search parameters:

**Query Types:**

- `semantic` - Concept-based, fuzzy matching
- `exact` - Precise term matching
- `hybrid` - Combines semantic and exact (default)

**Query Intents:**

- `search` - Find matching ideas
- `recommend` - Suggest best matches
- `compare` - Compare multiple queries/entities
- `analyze` - Analyze patterns/trends
- `summarize` - Provide overview

**Intelligence Features:**

- Named entity recognition (orgs, tech, people)
- Filter extraction (org, year, tech, difficulty, status)
- Multi-hop detection for complex queries
- Complexity estimation (simple/moderate/complex)
- Confidence scoring

### Retrieval Orchestrator

Coordinates between vector search, BM25, and hybrid retrieval:

**Search Methods:**

- **Vector Search**: Semantic similarity using Qdrant
- **BM25 Search**: Exact keyword matching
- **Hybrid Search**: Reciprocal Rank Fusion (RRF)
- **Multi-Hop Search**: Complex queries requiring multiple retrievals

**Performance:**

- Vector: < 100ms
- BM25: < 50ms
- Hybrid: < 200ms

### Per-Organization Analysis

Analyzes ideas within specific organizations:

**Analysis Dimensions:**

- Ideas by year
- Ideas by status
- Ideas by difficulty
- Technology stack distribution
- Topic distribution
- Most common technologies
- Most common topics
- Activity timeline

## Quick Start

### 1. Validate Setup

```bash
npm run validate:phase3
```

Expected: 13 passed, 5 warnings (expected if Phase 1/2 not run)

### 2. Start Services

```bash
# Start Qdrant (if not running)
npm run qdrant:start

# Start API server
npm run api:start
```

### 3. Test Retrieval

```bash
npm run test:retrieval
```

## API Endpoints

### Search Ideas

```bash
POST /api/retrieval/search
Content-Type: application/json

{
  "query": "machine learning python",
  "queryType": "auto",
  "topK": 10,
  "filters": {
    "year": [2024, 2025],
    "tech_stack": ["python", "tensorflow"]
  },
  "useHybrid": "auto",
  "returnMetadata": true
}
```

**Parameters:**

- `query`: Search query (required)
- `queryType`: "auto" | "vector" | "bm25" | "hybrid" (default: auto)
- `topK`: Number of results (default: 10)
- `filters`: Filter object (optional)
  - `org`: Organization name(s)
  - `year`: Year(s) (2016-2025)
  - `tech_stack`: Technology array
  - `topics`: Topic array
  - `difficulty`: "easy" | "medium" | "hard" | "expert"
  - `status`: "proposed" | "in-progress" | "completed" | "abandoned"
  - `language`: Language code
- `useHybrid`: true | false | "auto" (default: auto)
- `returnMetadata`: Include metadata (default: true)

**Response:**

```json
{
  "query": "machine learning python",
  "results": [...],
  "queryType": "hybrid",
  "intent": "search",
  "filters": {...},
  "responseTime": 123,
  "metadata": {
    "analysis": {...},
    "retrievalMethod": "hybrid",
    "confidence": 0.85
  }
}
```

### Batch Search

```bash
POST /api/retrieval/search/batch

{
  "queries": [
    "machine learning",
    "react web",
    "database optimization"
  ],
  "queryType": "auto",
  "topK": 5
}
```

### Analyze Query

```bash
POST /api/retrieval/analyze/query

{
  "query": "compare PostgreSQL and MongoDB"
}
```

**Response:**

```json
{
  "originalQuery": "compare PostgreSQL and MongoDB",
  "queryType": "hybrid",
  "intent": "compare",
  "filters": {},
  "language": "en",
  "complexity": "complex",
  "entities": [
    { "type": "technology", "value": "PostgreSQL" },
    { "type": "technology", "value": "MongoDB" }
  ],
  "needsMultiHop": true,
  "confidence": 0.9
}
```

### Per-Organization Analysis

```bash
GET /api/retrieval/organizations/:org/analysis?limit=50&sort=year&sortOrder=desc
```

**Response:**

```json
{
  "org": "PostgreSQL",
  "totalIdeas": 127,
  "ideas": [...],
  "analysis": {
    "byYear": { "2024": 45, "2025": 82 },
    "byStatus": { "in-progress": 72, "proposed": 55 },
    "byDifficulty": { "medium": 65, "hard": 40, "easy": 22 },
    "byTechStack": { "python": 95, "postgresql": 87, "c": 45 },
    "byTopic": { "database": 78, "web": 32, "api": 17 },
    "mostCommonTech": [
      ["python", 95],
      ["postgresql", 87],
      ["c", 45]
    ],
    "mostCommonTopic": [
      ["database", 78],
      ["web", 32],
      ["api", 17]
    ],
    "recentActivity": "...",
    "oldestActivity": "..."
  }
}
```

### Retrieval Statistics

```bash
GET /api/retrieval/stats
```

**Response:**

```json
{
  "totalQueries": 1234,
  "vectorSearches": 567,
  "bm25Searches": 234,
  "hybridSearches": 433,
  "multiHopSearches": 67,
  "averageResponseTime": 145.67,
  "qdrantPoints": 1276,
  "bm25Loaded": true,
  "bm25Stats": {
    "totalDocuments": 1276,
    "uniqueTerms": 15678,
    "averageDocumentLength": 234.5
  }
}
```

## Usage Examples

### Simple Search

```bash
curl -X POST http://localhost:3001/api/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning python",
    "topK": 5
  }'
```

### Search with Filters

```bash
curl -X POST http://localhost:3001/api/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "react web development",
    "queryType": "hybrid",
    "filters": {
      "year": 2024,
      "difficulty": "medium"
    },
    "topK": 10
  }'
```

### Compare Technologies

```bash
curl -X POST http://localhost:3001/api/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "tensorflow vs pytorch machine learning"
  }'
```

### Find Beginner-Friendly Projects

```bash
curl -X POST http://localhost:3001/api/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "projects for beginners",
    "filters": {
      "difficulty": "easy"
    },
    "topK": 5
  }'
```

### Analyze PostgreSQL Projects

```bash
curl http://localhost:3001/api/retrieval/organizations/PostgreSQL/analysis
```

## Configuration

### Environment Variables (.env)

```bash
# Qdrant Configuration
QDRANT_HOST=localhost          # Qdrant host (default: localhost)
QDRANT_PORT=6333              # Qdrant port (default: 6333)

# Gemini API (for query intelligence)
GEMINI_API_KEY=your_key_here  # Optional - uses rules if not set

# API Configuration
PORT=3001                     # API port
```

### Query Intelligence Modes

#### AI Mode (GEMINI_API_KEY set)

Uses Gemini Pro for query analysis:

- Better intent detection
- Smarter entity extraction
- Higher confidence scores
- Natural language understanding

#### Rules Mode (no GEMINI_API_KEY)

Uses rule-based analysis:

- Faster (no API calls)
- Pattern matching
- Heuristic detection
- 100% deterministic

## Multi-Hop Search

Complex queries are automatically detected and processed with multiple retrievals:

**Examples of multi-hop queries:**

- "Compare PostgreSQL and MongoDB projects"
- "Apache vs PostgreSQL database"
- "TensorFlow vs PyTorch machine learning"

**Process:**

1. Analyze query and detect multi-hop intent
2. Execute parallel retrievals for each entity
3. Compare and combine results
4. Return consolidated results

## Performance Optimization

### Vector Search Optimization

- Qdrant HNSW index for fast ANN search
- Payload filters for pre-filtering
- Batch processing for multiple queries
- Connection pooling

### BM25 Optimization

- In-memory inverted index
- Cached document lengths
- Pre-computed IDF scores
- Stop word filtering

### Hybrid Search Optimization

- Reciprocal Rank Fusion (RRF) with configurable K
- Parallel execution of vector and BM25
- Early termination for performance
- Result deduplication

## Error Handling

### Graceful Degradation

- If Qdrant unavailable: Use BM25 only
- If BM25 unavailable: Use vector only
- If both unavailable: Return error with clear message

### Retry Logic

- Automatic retries for transient failures
- Exponential backoff
- Maximum retry limit (3 attempts)
- Circuit breaker pattern

## Testing

### Run All Tests

```bash
npm run test:retrieval
```

Tests:

1. Query Intelligence Agent tests
2. Vector search tests
3. BM25 search tests
4. Hybrid search tests
5. Multi-hop search tests
6. Per-org analysis tests
7. Batch search tests
8. Performance statistics

### Manual Testing

Test specific queries:

```bash
curl -X POST http://localhost:3001/api/retrieval/test/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test query",
    "topK": 3
  }'
```

## Troubleshooting

### Qdrant Connection Failed

```bash
# Check if Qdrant is running
curl http://localhost:6333/health

# Start Qdrant
npm run qdrant:start

# Check logs
npm run qdrant:logs
```

### BM25 Index Not Found

```bash
# Run Phase 2 to build indexes
npm run index:build

# Verify index exists
ls -la api/data/bm25-index.json
```

### Low Confidence Scores

```bash
# Set GEMINI_API_KEY for better analysis
# Add to .env:
GEMINI_API_KEY=your_actual_api_key
```

### Slow Responses

```bash
# Check Qdrant connection
# Increase Qdrant timeout (default: 30s)
# Reduce topK for faster responses
```

## Integration

### With Phase 1 (Data Ingestion)

```bash
# Phase 1 creates dataset
npm run ingest:all

# Phase 3 consumes dataset
curl http://localhost:3001/api/retrieval/search
```

### With Phase 2 (Vector Indexing)

```bash
# Phase 2 creates indexes
npm run index:build

# Phase 3 uses indexes
curl http://localhost:3001/api/retrieval/search
```

## Next Steps

After Phase 3:

1. **Phase 4**: Implement Context Assembler
2. **Phase 5**: Build LLM Reasoner
3. **Phase 6**: Add Self-Evaluator
4. **Integration**: Connect all components

## Best Practices

1. **Use AI mode** for production (better query understanding)
2. **Set appropriate topK** (10-20 for most queries)
3. **Leverage filters** for better precision
4. **Cache frequent queries** for performance
5. **Monitor statistics** to identify bottlenecks

## Contributing

When extending Phase 3:

1. Add new query intents to QueryIntelligenceAgent
2. Implement new search methods in RetrievalOrchestrator
3. Add API endpoints in retrieval routes
4. Update tests to cover new functionality
5. Document changes in this README
