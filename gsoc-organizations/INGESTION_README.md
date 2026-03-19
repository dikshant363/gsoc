# GSoC Ideas Ingestion System

This system extracts, normalizes, and consolidates Google Summer of Code project ideas from 2016-2025 into a searchable, structured dataset.

## Features

- **Multi-source Ingestion**: Scrapes GSoC archive pages, organization ideas pages, and GitHub repositories
- **Intelligent Extraction**: Uses AI (Gemini) for tag extraction, difficulty estimation, and language detection
- **Normalization**: Applies existing filters to normalize technologies, topics, and organization names
- **Deduplication**: Identifies and merges duplicate ideas across years
- **Relationship Linking**: Links related ideas based on tech stack and topics
- **RESTful API**: Fast API for querying ideas with filters

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Usage

### Run Full Pipeline

Ingest all years, normalize, and build the complete dataset:

```bash
npm run ingest:all
```

### Run Individual Steps

```bash
# Ingest ideas from all sources
npm run ingest:ingest

# Normalize and deduplicate
npm run ingest:normalize

# Build final dataset with statistics
npm run ingest:build
```

### Start API Server

```bash
npm run api:start
```

The API will be available at `http://localhost:3001/api`

## API Endpoints

### List Ideas

```bash
GET /api/ideas?org=PostgreSQL&year=2024&tech=python&limit=10
```

Query parameters:

- `org`: Filter by organization (comma-separated)
- `year`: Filter by year (comma-separated)
- `tech`: Filter by technology (comma-separated)
- `topic`: Filter by topic (comma-separated)
- `difficulty`: Filter by difficulty (easy, medium, hard, expert)
- `status`: Filter by status (proposed, in-progress, completed, abandoned)
- `language`: Filter by language
- `search`: Full-text search in titles and descriptions
- `limit`: Limit results
- `offset`: Pagination offset

### Get Specific Idea

```bash
GET /api/ideas/:id
```

### Get Ideas by Organization

```bash
GET /api/ideas/organizations/:org
```

### Get Ideas by Year

```bash
GET /api/ideas/years/:year
```

### Get Ideas by Technology

```bash
GET /api/ideas/techs/:tech
```

### Get Ideas by Topic

```bash
GET /api/ideas/topics/:topic
```

### Get Statistics

```bash
GET /api/ideas/stats
```

Returns:

- Total ideas count
- Ideas per year
- Ideas per organization
- Ideas per status
- Top 20 technologies
- Top 20 topics

### Search Ideas

```bash
POST /api/ideas/search
{
  "query": "machine learning python",
  "limit": 10
}
```

## Data Structure

Each idea has the following schema:

```json
{
  "id": "postgresql-2025-a1b2c3d4",
  "org": "PostgreSQL",
  "year": 2025,
  "status": "in-progress",
  "title": "Project Title",
  "short_description": "Brief summary...",
  "description": "Full description...",
  "student_name": "Student Name",
  "proposal_id": "proposal_id",
  "project_url": "GSoC project URL",
  "code_url": "Source code URL",
  "tags": ["tag1", "tag2"],
  "tech_stack": ["python", "postgresql", "django"],
  "languages": ["Python", "JavaScript"],
  "topics": ["database", "web", "ui"],
  "mentors": ["mentor@example.com"],
  "difficulty": "medium",
  "outcome": "success",
  "source_url": "Source page URL",
  "last_updated": "2025-01-18T00:00:00.000Z",
  "language": "en",
  "related_ideas": ["id1", "id2"]
}
```

## Output Files

The pipeline generates the following files:

- `api/data/gsoc-ideas-{year}.json` - Ideas per year (raw)
- `api/data/gsoc-ideas.json` - Normalized ideas
- `api/data/gsoc-ideas-complete.json` - Final dataset with metadata
- `api/data/gsoc-ideas-stats.json` - Statistics

## Configuration

Set environment variables in `.env`:

```bash
GEMINI_API_KEY=your_api_key_here
PORT=3001
```

## Architecture

### Components

1. **Ingestor** (`scripts/ingest/gsoc-ingestor.js`)

   - Scrapes GSoC pages
   - Extracts ideas from organization pages
   - Analyzes GitHub repositories

2. **Normalizer** (`scripts/ingest/normalize.js`)

   - Normalizes data structure
   - Applies filters
   - Deduplicates ideas

3. **Dataset Builder** (`scripts/ingest/build-dataset.js`)

   - Links related ideas
   - Calculates statistics
   - Builds final dataset

4. **API** (`api/server.js`)
   - RESTful endpoints
   - Filtering and search
   - Statistics

### Utilities

- **Rate Limiter** - Controls request rate
- **Cache** - Caches API responses
- **Tag Extractor** - Extracts technologies and topics
- **Difficulty Estimator** - Estimates project difficulty
- **Language Detector** - Detects content language
- **GitHub Analyzer** - Analyzes repositories

## Performance

- **Rate Limiting**: 1 request/second to avoid blocking
- **Caching**: Reduces API calls
- **Batch Processing**: Processes multiple items in parallel
- **Incremental Updates**: Can run individual steps

## Troubleshooting

### Rate Limiting

If you encounter rate limiting:

```bash
# Wait and retry with longer delays
npm run ingest:ingest
```

### Missing Ideas

Some organizations may not have accessible ideas pages. Check the ingestion logs for errors.

### API Not Starting

Ensure port 3001 is available:

```bash
PORT=3002 npm run api:start
```

## Next Steps

- Phase 2: Build multi-vector indexing with Qdrant
- Phase 3: Implement hybrid retrieval system
- Phase 4: Add context assembler
- Phase 5: Build LLM reasoner
- Phase 6: Implement self-evaluation

## Contributing

When adding new scrapers or extractors:

1. Use the existing utilities (RateLimiter, Cache, etc.)
2. Follow the schema in `api/schemas/idea-schema.json`
3. Test with a small sample first
4. Add error handling and logging
