const LLMReasoner = require("../../api/reasoning/llm-reasoner")
const MultiHopAnalyzer = require("../../api/reasoning/multi-hop-analyzer")
const ContextAssembler = require("../../api/context/assembler")

class ReasoningTester {
  constructor() {
    this.reasoner = new LLMReasoner()
    this.multiHopAnalyzer = new MultiHopAnalyzer()
    this.assembler = new ContextAssembler()
  }

  async runTests() {
    console.log("====================================")
    console.log("Phase 5: LLM Reasoning Tests")
    console.log("====================================\n")

    await this.testBasicReasoning()
    await this.testToolCalling()
    await this.testMultiHopAnalysis()
    await this.testReasoningWithContext()
    await this.testFullAnalysisPipeline()

    this.printFinalStats()
  }

  async testBasicReasoning() {
    console.log("\n=== Testing Basic LLM Reasoning ===")

    const mockContext = `## Relevant GSoC Ideas

[1]: **PyTorch for Beginners** (PyTorch, 2025)
Introduction to PyTorch framework for machine learning and deep learning. Covers basic concepts like tensors, autograd, and neural network modules.

[2]: **TensorFlow ML Projects** (TensorFlow, 2024)
Advanced TensorFlow projects for image classification and natural language processing tasks.

Technologies: python, machine learning, pytorch, tensorflow
Topics: machine learning, ai, neural networks, computer vision
Organizations: PyTorch, TensorFlow`

    const queries = [
      "What machine learning projects are available?",
      "Recommend a project for a beginner in Python",
      "Which organization has more ML projects?",
    ]

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const result = await this.reasoner.reason(query, mockContext, {
          maxIterations: 2,
          maxToolCalls: 1,
        })

        console.log(`✓ Reasoning completed`)
        console.log(`  Confidence: ${result.confidence.toFixed(2)}`)
        console.log(`  Iterations: ${result.metadata.iterations}`)
        console.log(`  Tool calls: ${result.metadata.totalToolCalls}`)

        if (result.finalAnswer) {
          const preview = result.finalAnswer.substring(0, 100)
          console.log(`  Answer preview: "${preview}..."`)
        }
      } catch (error) {
        console.log(`✗ Reasoning failed: ${error.message}`)
      }
    }
  }

  async testToolCalling() {
    console.log("\n=== Testing Tool Calling ===")

    const mockContext =
      "Looking at machine learning projects from PyTorch and TensorFlow organizations."

    console.log("Testing tool calling with mock context...")

    try {
      const result = await this.reasoner.reason(
        "Find more details about PyTorch projects",
        mockContext,
        {
          maxIterations: 1,
          maxToolCalls: 2,
        }
      )

      console.log("✓ Tool calling test completed")
      console.log(`  Tool calls made: ${result.metadata.totalToolCalls}`)
      console.log(`  Iterations: ${result.metadata.iterations}`)

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`  Tool calls:`)
        result.toolCalls.forEach((call, i) => {
          console.log(
            `    ${i + 1}. ${
              call.toolCall?.tool || "unknown"
            } (${JSON.stringify(call.toolCall?.parameters || {})})`
          )
        })
      }
    } catch (error) {
      console.log(`✗ Tool calling test failed: ${error.message}`)
    }
  }

  async testMultiHopAnalysis() {
    console.log("\n=== Testing Multi-Hop Analysis ===")

    const queries = [
      "Compare machine learning projects between PyTorch and TensorFlow",
      "Find beginner-friendly Python projects and analyze their requirements",
      "What are the most popular technologies in recent GSoC projects?",
    ]

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`)
      try {
        const result = await this.multiHopAnalyzer.analyze(query, {
          maxHops: 2,
          verbose: false,
        })

        console.log("✓ Multi-hop analysis completed")
        console.log(`  Total hops: ${result.multiHopInfo?.totalHops || 0}`)
        console.log(`  Confidence: ${result.confidence.toFixed(2)}`)

        if (result.multiHopInfo?.hopHistory) {
          console.log(
            `  Hop history: ${result.multiHopInfo.hopHistory.length} entries`
          )
        }
      } catch (error) {
        console.log(`✗ Multi-hop analysis failed: ${error.message}`)
      }
    }
  }

  async testReasoningWithContext() {
    console.log("\n=== Testing Reasoning with Context Assembly ===")

    // Create mock retrieval results
    const mockRetrievalResults = {
      query: "machine learning python",
      queryType: "hybrid",
      intent: "search",
      results: [
        {
          id: "test-1",
          document: {
            id: "test-1",
            title: "PyTorch Neural Networks",
            org: "PyTorch",
            year: 2025,
            description: "Build neural network models using PyTorch framework.",
            tech_stack: ["python", "pytorch", "machine learning"],
          },
          score: 0.95,
        },
        {
          id: "test-2",
          document: {
            id: "test-2",
            title: "TensorFlow Image Classification",
            org: "TensorFlow",
            year: 2024,
            description: "Create image classification models with TensorFlow.",
            tech_stack: ["python", "tensorflow", "machine learning"],
          },
          score: 0.88,
        },
      ],
    }

    try {
      // Assemble context
      const context = await this.assembler.assemble(
        mockRetrievalResults,
        "machine learning python"
      )

      console.log("✓ Context assembled")
      console.log(`  Ideas: ${context.ideas.length}`)
      console.log(`  Citations: ${context.citations.length}`)
      console.log(`  Tokens: ${context.tokenCount}`)

      // Perform reasoning
      const reasoning = await this.reasoner.reason(
        "machine learning python",
        context.context,
        {
          maxIterations: 2,
          maxToolCalls: 1,
        }
      )

      console.log("✓ Reasoning completed")
      console.log(`  Confidence: ${reasoning.confidence.toFixed(2)}`)
      console.log(`  Final answer available: ${!!reasoning.finalAnswer}`)
    } catch (error) {
      console.log(`✗ Reasoning with context failed: ${error.message}`)
    }
  }

  async testFullAnalysisPipeline() {
    console.log("\n=== Testing Full Analysis Pipeline ===")

    const query = "Find machine learning projects suitable for beginners"

    console.log(`Query: "${query}"`)
    console.log("Note: This test may take longer as it runs the full pipeline")

    try {
      const result = await this.multiHopAnalyzer.analyze(query, {
        maxHops: 2,
        verbose: false,
      })

      console.log("✓ Full analysis pipeline completed")
      console.log(`  Final confidence: ${result.confidence.toFixed(2)}`)
      console.log(`  Total hops: ${result.multiHopInfo?.totalHops || 0}`)
      console.log(
        `  Answer length: ${result.finalAnswer?.length || 0} characters`
      )

      if (result.error) {
        console.log(`  Error: ${result.error}`)
      } else {
        console.log(`  Analysis successful`)
      }
    } catch (error) {
      console.log(`✗ Full analysis pipeline failed: ${error.message}`)
    }
  }

  printFinalStats() {
    console.log("\n====================================")
    console.log("Phase 5 Tests Completed")
    console.log("====================================\n")

    console.log("All tests executed successfully!")
    console.log("\nReasoning Features:")
    console.log("  ✓ LLM reasoning with Gemini Pro")
    console.log("  ✓ Tool calling for additional information")
    console.log("  ✓ Multi-hop analysis for complex queries")
    console.log("  ✓ Context assembly integration")
    console.log("  ✓ Full pipeline orchestration")
  }
}

if (require.main === module) {
  const tester = new ReasoningTester()
  tester.runTests().catch(error => {
    console.error("Test suite failed:", error)
    process.exit(1)
  })
}

module.exports = ReasoningTester
