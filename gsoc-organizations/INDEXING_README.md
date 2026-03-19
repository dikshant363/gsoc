# Phase 2: Multi-Vector Indexing

This phase implements multi-vector indexing with Qdrant and BM25 for hybrid search capabilities.

## Architecture

### Vector Search (Semantic)

- Uses Gemini embeddings (768-dimensional vectors)
- Four embeddings per idea:
  - **Title**: For title-based search
  - **Description**: For content-based search
  - **Tech Stack**: For technology matching
  - **Combined**: Full context (title + description + tech + org)

### BM25 Search (Exact)

- Traditional keyword-based search
- Term frequency-inverse document frequency (TF-IDF)
- Handles exact-term matching and boolean queries

### Hybrid Search

- Reciprocal Rank Fusion (RRF)
- Combines vector and BM25 results
- Balances semantic and exact matches

## Prerequisites

### 1. Docker & Docker Compose

```bash
# Check if Docker is installed
docker --version
docker-compose --version
```

### 2. GSoC Ideas Dataset

Ensure Phase 1 is complete:

```bash
# If not already done
npm run ingest:all
```

## Installation

Dependencies are already installed. If needed:

```bash
npm install
```

## Quick Start

### 1. Start Qdrant

```bash
# Start Qdrant with Docker
npm run qdrant:start

# Check logs
npm run qdrant:logs
```

Qdrant will be available at:

- HTTP API: `http://localhost:6333`
- Web UI: `http://localhost:6333/dashboard` (if enabled)

### 2. Build All Indexes

```bash
# Build both vector and BM25 indexes
npm run index:build
```

This will:

- Generate embeddings for all ideas using Gemini
- Create Qdrant collection with multi-vector configuration
- Upload all points to Qdrant
- Build BM25 index and save to file

### 3. Test Search

```bash
# Test search functionality
npm run index:test
```

## Individual Steps

### Build Vector Index Only

```bash
npm run index:vector
```

Generates embeddings and uploads to Qdrant.

### Build BM25 Index Only

```bash
npm run index:bm25
```

Builds BM25 index for keyword search.

## Search Options

### Vector Search

- Searches by semantic similarity
- Best for concept-based queries
- Uses embeddings

### BM25 Search

- Exact term matching
- Best for specific terms/technologies
- Uses TF-IDF scoring

### Hybrid Search

- Combines both approaches
- Reciprocal Rank Fusion (RRF)
- Best for most queries

## Configuration

### Environment Variables

```bash
# Qdrant Configuration
QDRANT_HOST=localhost          # Qdrant host (default: localhost)
QDRANT_PORT=6333              # Qdrant port (default: 6333)

# Gemini API (for embeddings)
GEMINI_API_KEY=your_key_here  # Required for real embeddings

# API Configuration
PORT=3001                     # API port
```

### Qdrant Configuration

Edit `api/qdrant/collection-schema.json`:

```json
{
  "vectors_config": {
    "title": {
      "size": 768,
      "distance": "Cosine"
    },
    "description": {
      "size": 768,
      "distance": "Cosine"
    },
    "tech_stack": {
      "size": 768,
      "distance": "Cosine"
    },
    "combined": {
      "size": 768,
      "distance": "Cosine"
    }
  }
}
```

## Usage Examples

### Start Qdrant

```bash
npm run qdrant:start
```

### Stop Qdrant

```bash
npm run qdrant:stop
```

### View Qdrant Logs

```bash
npm run qdrant:logs
```

### Build Indexes

```bash
# Full build (vector + BM25)
npm run index:build

# Vector only
npm run index:vector

# BM25 only
npm run index:bm25
```

### Test Search

```bash
npm run index:test
```

## Qdrant Collection Schema

### Vectors

- `title`: 768-dim, Cosine distance
- `description`: 768-dim, Cosine distance
- `tech_stack`: 768-dim, Cosine distance
- `combined`: 768-dim, Cosine distance

### Payload

- `id`: Unique idea ID
- `org`: Organization name
- `year`: GSoC year
- `status`: Project status
- `title`: Project title
- `description`: Project description
- `tech_stack`: Array of technologies
- `languages`: Array of programming languages
- `topics`: Array of topics
- `difficulty`: Difficulty level
- `language`: Content language
- `category`: Organization category

### Indexes

- Payload indexes for filtering (org, year, status, difficulty, language, category)
- Optimized for point lookups and filtered searches

## BM25 Index

### Storage

- File: `api/data/bm25-index.json`
- Contains:
  - Document vectors
  - Document lengths
  - Inverted index (term → document IDs)
  - Document frequencies

### Configuration

- k1: 1.5 (term frequency saturation)
- b: 0.75 (length normalization)
- Stop words: 50 common words removed

## Search Query Types

### Semantic Search

```javascript
{
  query: "machine learning python",
  type: "vector",
  topK: 10
}
```

### Keyword Search

```javascript
{
  query: "blockchain cryptocurrency",
  type: "bm25",
  topK: 10
}
```

### Hybrid Search

```javascript
{
  query: "react javascript web",
  type: "hybrid",
  topK: 10
}
```

### With Filters

```javascript
{
  query: "database",
  type: "hybrid",
  filters: {
    org: "PostgreSQL",
    year: 2024,
    difficulty: "medium",
    tech_stack: ["python", "postgresql"]
  },
  topK: 10
}
```

## Multi-Vector Search

You can search using specific embeddings:

```javascript
{
  query: "web development",
  vectorName: "title",        // Use title embedding only
  topK: 10
}
```

```javascript
{
  query: "machine learning",
  vectorName: "tech_stack",   // Use tech stack embedding
  topK: 10
}
```

## Performance

### Vector Search

- Typical response: < 100ms
- Scales with collection size
- Benefits from caching

### BM25 Search

- Typical response: < 50ms
- In-memory index
- Very fast for exact matches

### Hybrid Search

- Typical response: < 200ms
- Combines both approaches
- Better relevance overall

## Troubleshooting

### Qdrant Won't Start

```bash
# Check Docker is running
docker ps

# Check logs
npm run qdrant:logs

# Restart Qdrant
npm run qdrant:stop && npm run qdrant:start
```

### Embeddings Fail (Mock Mode)

```bash
# Set GEMINI_API_KEY in .env
GEMINI_API_KEY=your_key_here

# Re-run index build
npm run index:build
```

### Index Already Exists

```bash
# The system will recreate collection automatically
# Or delete manually via Qdrant API
curl -X DELETE http://localhost:6333/collections/gsoc_ideas
```

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - 6334:6333

# Or stop conflicting service
lsof -ti:6333 | xargs kill
```

## Output Files

After running `npm run index:build`:

- `api/data/bm25-index.json` - BM25 index
- Qdrant collection `gsoc_ideas` - Vector index

## Qdrant Web Interface

Access Qdrant dashboard:

```bash
# Open browser
open http://localhost:6333/dashboard
```

Features:

- View collection stats
- Browse points
- Test search queries
- Monitor performance

## Next Steps

After Phase 2:

1. **Phase 3**: Build Retrieval Orchestrator (Query Intelligence Agent)
2. **Phase 4**: Implement Context Assembler
3. **Phase 5**: Build LLM Reasoner
4. **Phase 6**: Add Self-Evaluator

## Advanced Usage

### Custom Weights for Hybrid Search

```javascript
{
  query: "react web",
  type: "hybrid",
  weights: {
    vector: 0.7,    // 70% weight to semantic
    bm25: 0.3        // 30% weight to keywords
  },
  topK: 10
}
```

### Specific Vector Search

```javascript
{
  query: "machine learning",
  vectors: {
    title: titleEmbedding,
    description: descEmbedding
  },
  weights: {
    title: 0.6,
    description: 0.4
  },
  topK: 10
}
```

## Metrics

Monitor index performance:

```javascript
{
  totalIdeas: 10000,
  successfulEmbeddings: 9990,
  failedEmbeddings: 10,
  uploadedToQdrant: 9990,
  bm25IndexSize: 10000,
  vectorDimensions: 768,
  vectorCount: 4 * 9990  // 4 vectors per idea
}
```

## Best Practices

1. **Always stop Qdrant** before editing `docker-compose.yml`
2. **Use mock embeddings** for testing (faster, no API costs)
3. **Monitor API rate limits** with Gemini
4. **Rebuild indexes** after data updates
5. **Test with small sample** before full build

## Contributing

When modifying indexes:

1. Test with small dataset first
2. Validate embeddings manually
3. Check Qdrant collection health
4. Verify search relevance
5. Update documentation
