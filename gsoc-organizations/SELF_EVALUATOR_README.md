# Phase 6: Self-Evaluator & Feedback Loop

This phase implements intelligent self-evaluation and continuous improvement through user feedback collection and analysis.

## Architecture

### Self-Evaluator

Comprehensive evaluation system that assesses LLM responses across multiple dimensions:

**Evaluation Criteria:**

- **Factual Consistency**: Accuracy against provided sources
- **Source Coverage**: How well sources support claims
- **Completeness**: Depth and comprehensiveness of answers
- **Hallucination Score**: Detection of fabricated information
- **Relevance**: Alignment with original query

**Evaluation Methods:**

- **AI-Powered**: Uses Gemini for factual checking and hallucination detection
- **Rule-Based**: Fallback heuristics for source coverage and relevance
- **Confidence Scoring**: Overall quality assessment

### Feedback Loop

Continuous improvement system that learns from user interactions:

**Feedback Collection:**

- User ratings (1-5 scale)
- Categorization (search, reasoning, etc.)
- Issue identification
- Positive feedback
- Improvement suggestions

**Improvement Analysis:**

- Pattern recognition in feedback
- Trend analysis over time
- Automatic improvement suggestions
- System parameter adjustments

## Quick Start

### 1. Validate Setup

```bash
npm run validate:phase6
```

Expected: 15 passed, 5 warnings (expected if Phase 1-5 not complete)

### 2. Start Services

```bash
npm run qdrant:start
npm run api:start
```

### 3. Test Evaluation

```bash
npm run test:evaluation
```

## API Endpoints

### Evaluate Response

```bash
POST /api/evaluation/evaluate
Content-Type: application/json

{
  "response": {
    "finalAnswer": "Your answer here...",
    "confidence": 0.85,
    "toolCalls": [...],
    "steps": [...],
    "metadata": {...}
  },
  "context": {
    "citations": [...],
    "context": "...",
    "tokenCount": 150
  },
  "options": {
    "detailedFeedback": true,
    "includeSuggestions": true
  }
}
```

**Response:**

```json
{
  "overallScore": 0.82,
  "confidence": 0.85,
  "criteria": {
    "factualConsistency": { "score": 0.9, "evidence": "..." },
    "sourceCoverage": { "score": 0.8, "evidence": "..." },
    "completeness": { "score": 0.75, "evidence": "..." },
    "hallucinationScore": { "score": 0.85, "evidence": "..." },
    "relevance": { "score": 0.9, "evidence": "..." }
  },
  "feedback": {
    "factualConsistency": { "level": "excellent", "message": "...", "score": 0.9 },
    "sourceCoverage": { "level": "good", "message": "...", "score": 0.8 },
    ...
  },
  "suggestions": [
    {
      "type": "completeness",
      "priority": "medium",
      "suggestion": "Provide more detailed examples",
      "action": "Include code snippets and specific project links"
    }
  ],
  "needsImprovement": false,
  "timestamp": "2025-01-18T..."
}
```

### Evaluate Full Pipeline

```bash
POST /api/evaluation/evaluate-pipeline
Content-Type: application/json

{
  "query": "machine learning python",
  "retrievalResults": {...},
  "reasoningResults": {...},
  "contextResults": {...}
}
```

### Collect Feedback

```bash
POST /api/evaluation/feedback
Content-Type: application/json

{
  "responseId": "response-123",
  "rating": 4,
  "category": "search",
  "comment": "Good response but could be more detailed",
  "issues": ["lacks_examples", "too_brief"],
  "positives": ["accurate", "well_structured"],
  "suggestions": ["add_more_examples", "include_code_snippets"]
}
```

### Get Insights

```bash
GET /api/evaluation/insights
```

**Response:**

```json
{
  "totalFeedback": 25,
  "averageRating": 4.2,
  "commonIssues": {
    "too_vague": 8,
    "missing_sources": 5,
    "incomplete": 3
  },
  "successfulPatterns": {
    "detailed_examples": 12,
    "clear_structure": 9,
    "accurate_sources": 7
  },
  "queryCategories": {
    "search": 15,
    "recommendation": 6,
    "comparison": 4
  },
  "responseQualityTrends": {
    "recent": { "count": 10, "averageRating": 4.3 },
    "older": { "count": 15, "averageRating": 4.1 },
    "trend": 0.2
  }
}
```

### Get Improvements

```bash
GET /api/evaluation/improvements
```

**Response:**

```json
{
  "version": 1.0,
  "lastUpdated": "2025-01-18T...",
  "improvements": {
    "response_quality": {
      "type": "response_generation",
      "currentRating": 4.1,
      "improvement": "Improve overall response quality",
      "actions": ["Add more examples", "Better source attribution"],
      "confidence": 0.9
    },
    "issue_fix_1": {
      "type": "issue_resolution",
      "issue": "too_vague",
      "frequency": 8,
      "improvement": "Address common issue: too_vague",
      "priority": "high",
      "confidence": 0.8
    }
  }
}
```

### Apply Improvements

```bash
POST /api/evaluation/apply-improvements
```

Automatically applies learned improvements to system components.

### Get Feedback Summary

```bash
GET /api/evaluation/feedback-summary
```

**Response:**

```json
{
  "totalFeedback": 25,
  "averageRating": 4.2,
  "ratingDistribution": { "1": 0, "2": 1, "3": 2, "4": 12, "5": 10 },
  "categories": {
    "search": 15,
    "reasoning": 6,
    "comparison": 4
  },
  "recentFeedback": [
    {
      "rating": 4,
      "category": "search",
      "timestamp": "2025-01-18T...",
      "summary": "Good response but could be more detailed"
    }
  ]
}
```

### Get Improvement Recommendations

```bash
GET /api/evaluation/improvement-recommendations
```

**Response:**

```json
{
  "recommendations": {
    "retrieval": {
      "search_accuracy": {
        "type": "retrieval",
        "improvement": "Improve search accuracy based on user feedback",
        "feedbackCount": 8,
        "confidence": 0.7
      }
    },
    "reasoning": {
      "answer_quality": {
        "type": "reasoning",
        "improvement": "Improve answer quality and reasoning",
        "feedbackCount": 6,
        "confidence": 0.7
      }
    },
    "system": {
      "performance": {
        "type": "system",
        "improvement": "Improve system performance and response times",
        "slowResponseCount": 5,
        "totalResponses": 25,
        "confidence": 0.8
      }
    }
  },
  "totalCount": 3
}
```

### Get Statistics

```bash
GET /api/evaluation/stats
```

**Response:**

```json
{
  "evaluator": {
    "totalEvaluations": 45,
    "mockMode": false,
    "evaluationCriteria": ["factualConsistency", "sourceCoverage", ...]
  },
  "feedback": {
    "feedbackCount": 25,
    "improvementCount": 8,
    "averageRating": 4.2,
    "dataFiles": {
      "feedback": "api/data/feedback-data.json",
      "improvements": "api/data/improvement-insights.json"
    }
  },
  "combined": {
    "totalEvaluations": 45,
    "totalFeedback": 25,
    "averageRating": 4.2,
    "evaluationCriteria": 5
  }
}
```

## Usage Examples

### Evaluate a Response

```bash
curl -X POST http://localhost:3001/api/evaluation/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "response": {
      "finalAnswer": "React is a popular JavaScript library for building user interfaces. Based on GSoC projects, there are many React-based ideas focused on web development.",
      "confidence": 0.85
    },
    "context": {
      "citations": [
        {"id": "1", "title": "React Web Dev", "snippet": "React framework..."}
      ],
      "context": "## React Projects\n\n[1]: React Web Development...",
      "tokenCount": 120
    }
  }'
```

### Collect User Feedback

```bash
curl -X POST http://localhost:3001/api/evaluation/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "response-123",
    "rating": 4,
    "category": "search",
    "comment": "Good information but could include more specific examples",
    "issues": ["lacks_examples"],
    "positives": ["accurate", "well_organized"],
    "suggestions": ["add_code_examples", "include_project_links"]
  }'
```

### Get Quality Insights

```bash
curl http://localhost:3001/api/evaluation/insights
```

### Apply Learned Improvements

```bash
curl -X POST http://localhost:3001/api/evaluation/apply-improvements
```

### Check Improvement Recommendations

```bash
curl http://localhost:3001/api/evaluation/improvement-recommendations
```

## Configuration

### Environment Variables (.env)

```bash
# Gemini API (for evaluation and hallucination detection)
GEMINI_API_KEY=your_key_here  # Optional - uses mock methods if not set

# Evaluation Configuration
PORT=3001                     # API port

# Feedback Loop Configuration
FEEDBACK_DATA_FILE=api/data/feedback-data.json
IMPROVEMENT_DATA_FILE=api/data/improvement-insights.json
MIN_FEEDBACK_SAMPLES=10       # Minimum samples before improvement analysis
LEARNING_RATE=0.1            # How aggressively to apply improvements
```

### Evaluation Criteria Weights

```javascript
{
  factualConsistency: 0.3,    // 30% weight
  sourceCoverage: 0.25,       // 25% weight
  completeness: 0.2,          // 20% weight
  hallucinationScore: 0.15,   // 15% weight
  relevance: 0.1              // 10% weight
}
```

## Evaluation Criteria Details

### Factual Consistency (30%)

- **AI Evaluation**: Cross-references answer with provided sources
- **Scoring**: 0.0 (contradictory) to 1.0 (perfectly consistent)
- **Fallback**: Simple heuristic based on source references

### Source Coverage (25%)

- **Citation Analysis**: Checks if sources are referenced in answer
- **Coverage Ratio**: Referenced sources / Total sources
- **Evidence**: "3/5 sources referenced (60% coverage)"

### Completeness (20%)

- **Content Analysis**: Word count, structure, depth
- **Heuristics**: Length, presence of examples, multiple perspectives
- **Evidence**: "150 words, structured response"

### Hallucination Score (15%)

- **AI Detection**: Identifies potentially fabricated information
- **Inverted Scoring**: Lower score = More hallucinations detected
- **Patterns**: Suspicious claims, absolute statements, unsupported generalizations

### Relevance (10%)

- **Query Matching**: Keyword overlap between query and answer
- **Semantic Similarity**: How well answer addresses the question
- **Evidence**: "4/6 query terms found in answer"

## Feedback Loop Features

### Feedback Categories

- **search**: Search and retrieval quality
- **reasoning**: Answer logic and reasoning quality
- **comparison**: Effectiveness of comparisons
- **recommendation**: Quality of suggestions
- **general**: Overall experience

### Common Issues Detected

- **too_vague**: Answer lacks specificity
- **missing_sources**: No source attribution
- **incomplete**: Missing key information
- **incorrect_info**: Factual errors
- **poor_structure**: Hard to follow
- **too_technical**: Too advanced for audience

### Successful Patterns Identified

- **detailed_examples**: Includes specific examples
- **clear_structure**: Well-organized response
- **accurate_sources**: Proper source attribution
- **comprehensive**: Covers all aspects
- **actionable**: Provides practical advice

## Improvement Types

### Retrieval Improvements

- **Search accuracy**: Better matching algorithms
- **Result ranking**: Improved relevance scoring
- **Filter effectiveness**: More precise filtering

### Reasoning Improvements

- **Answer quality**: Better response generation
- **Tool usage**: More effective tool selection
- **Context utilization**: Better source integration

### System Improvements

- **Performance**: Faster response times
- **Reliability**: Fewer errors
- **User experience**: Better interface

## Data Storage

### Feedback Data (`api/data/feedback-data.json`)

```json
[
  {
    "responseId": "response-123",
    "timestamp": "2025-01-18T...",
    "rating": 4,
    "category": "search",
    "comment": "Good response...",
    "issues": ["lacks_examples"],
    "positives": ["accurate"],
    "suggestions": ["add_examples"]
  }
]
```

### Improvement Insights (`api/data/improvement-insights.json`)

```json
{
  "version": 1.0,
  "lastUpdated": "2025-01-18T...",
  "improvements": {
    "response_quality": {
      "type": "response_generation",
      "currentRating": 4.1,
      "improvement": "Improve overall response quality",
      "actions": ["Add more examples", "Better source attribution"],
      "confidence": 0.9,
      "applied": false
    }
  }
}
```

## Testing

### Run All Tests

```bash
npm run test:evaluation
```

Tests:

1. Basic self-evaluation
2. Feedback collection
3. Improvement analysis
4. Evaluation pipeline

### Manual Testing

```bash
# Test evaluation
curl -X POST http://localhost:3001/api/evaluation/test-evaluation

# Collect feedback
curl -X POST http://localhost:3001/api/evaluation/feedback \
  -H "Content-Type: application/json" \
  -d '{"responseId":"test-1","rating":4,"comment":"Good"}'

# Get insights
curl http://localhost:3001/api/evaluation/insights

# Get recommendations
curl http://localhost:3001/api/evaluation/improvement-recommendations
```

## Integration

### With Previous Phases

```javascript
// Phase 5: Get reasoning results
const reasoningResult = await reasoner.reason(query, context)

// Phase 6: Evaluate the response
const evaluation = await evaluator.evaluate(reasoningResult, context)

// Collect user feedback (when available)
if (userFeedback) {
  feedbackLoop.collectFeedback(responseId, userFeedback)
}

// Apply improvements periodically
if (feedbackLoop.feedbackData.length >= minSamples) {
  const improvements = feedbackLoop.analyzeAndImprove()
  feedbackLoop.applyImprovements(systemComponents)
}
```

### Complete Evaluation Pipeline

```javascript
// Full system evaluation
const pipelineEvaluation = await evaluatePipeline({
  query,
  retrievalResults,
  reasoningResults,
  contextResults,
})

// Store evaluation for analysis
evaluationHistory.push(pipelineEvaluation)

// Generate improvement insights
const insights = feedbackLoop.generateInsights()
const improvements = feedbackLoop.generateImprovements(insights)
```

## Best Practices

1. **Regular Evaluation**: Evaluate responses regularly to maintain quality
2. **Collect Diverse Feedback**: Get feedback from different user types and use cases
3. **Apply Improvements Gradually**: Test improvements before full deployment
4. **Monitor Trends**: Track quality metrics over time
5. **Balance Metrics**: Don't over-optimize for any single criterion
6. **User-Centric**: Focus on what users actually find valuable

## Troubleshooting

### Low Evaluation Scores

```bash
# Check if GEMINI_API_KEY is set
# Verify context contains proper citations
# Ensure answer is detailed enough
```

### Feedback Not Collecting

```bash
# Check responseId format
# Verify rating is 1-5
# Check JSON syntax
```

### Improvements Not Applying

```bash
# Ensure minimum feedback samples reached
# Check system component availability
# Verify improvement confidence threshold
```

### Performance Issues

```bash
# Reduce evaluation frequency
# Use mock mode for development
# Cache evaluation results
```

## Advanced Features

### Custom Evaluation Criteria

Extend evaluation by adding new criteria:

```javascript
// Add custom criterion
evaluator.evaluationCriteria.customMetric = {
  weight: 0.1,
  description: "Custom evaluation metric"
};

// Implement evaluation method
evaluateCustomMetric(answer, context) {
  // Custom logic
  return { score: 0.8, evidence: "Custom evaluation" };
}
```

### Automated Improvement Application

```javascript
// Automatic improvement based on feedback patterns
setInterval(() => {
  if (feedbackLoop.feedbackData.length >= minSamples) {
    const improvements = feedbackLoop.analyzeAndImprove()
    const applied = feedbackLoop.applyImprovements(systemComponents)
    console.log(`Applied ${applied} improvements`)
  }
}, 3600000) // Hourly
```

### A/B Testing Improvements

```javascript
// Test improvement effectiveness
const testGroup = Math.random() < 0.5 ? "control" : "improvement"

if (testGroup === "improvement") {
  // Apply improvement
  applyImprovement(improvement)
}

// Track results by group
evaluation.testGroup = testGroup
```

## Documentation

- **Phase 6 Guide**: This file
- **Phase 6 Overview**: `PHASE6_OVERVIEW.md` (quick reference)
- **Phase 5 Guide**: `LLM_REASONER_README.md` (reasoning system)
- **Phase 4 Guide**: `CONTEXT_ASSEMBLER_README.md` (context assembly)
- **Phase 3 Guide**: `RETRIEVAL_README.md` (retrieval system)
- **Phase 2 Guide**: `INDEXING_README.md` (vector + BM25)
- **Phase 1 Guide**: `INGESTION_README.md` (data ingestion)

## Next Steps

This is the final phase of the GSoC Ideas Retrieval & Analysis System!

**The complete system now includes:**

1. **Data Ingestion** (Phase 1) - Scraped and processed GSoC data
2. **Vector Indexing** (Phase 2) - Qdrant + BM25 for retrieval
3. **Query Orchestration** (Phase 3) - Intelligent search
4. **Context Assembly** (Phase 4) - Citations and token control
5. **LLM Reasoning** (Phase 5) - Tool-augmented analysis
6. **Self-Evaluation** (Phase 6) - Quality assessment and improvement

## Success Criteria

- ✅ Multi-criteria evaluation system
- ✅ Factual consistency checking
- ✅ Hallucination detection
- ✅ Source coverage analysis
- ✅ Feedback collection and analysis
- ✅ Continuous improvement loop
- ✅ RESTful API integration
- ✅ Comprehensive test suite
- ✅ Performance monitoring
- ✅ User-centric quality metrics
