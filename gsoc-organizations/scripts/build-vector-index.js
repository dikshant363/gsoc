const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const YEAR = 2025;
const INPUT_FILE = path.join(__dirname, `../api/data/${YEAR}.json`);
const OUTPUT_FILE = path.join(__dirname, `../api/data/${YEAR}-embeddings.json`);

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

if (!genAI) {
    console.warn("WARNING: GEMINI_API_KEY not found. Using MOCK embeddings for testing/development.");
}

const model = genAI ? genAI.getGenerativeModel({ model: "embedding-001" }) : null;

// Mock embedding function for dev mode
function getMockEmbedding() {
    return { values: Array(768).fill(0).map(() => Math.random()) };
}

async function buildVectorIndex() {
    console.log(`Reading data from ${INPUT_FILE}...`);
    const rawData = fs.readFileSync(INPUT_FILE);
    const data = JSON.parse(rawData);
    const organizations = data.organizations;

    console.log(`Found ${organizations.length} organizations. Generating embeddings...`);

    const vectorStore = [];

    // Batch process to avoid rate limits if necessary, though simple sequential is fine for ~200 items.
    for (let i = 0; i < organizations.length; i++) {
        const org = organizations[i];

        // Construct a rich text representation for embedding
        const textToEmbed = `
      Name: ${org.name}
      Category: ${org.category}
      Technologies: ${org.technologies ? org.technologies.join(', ') : ''}
      Topics: ${org.topics ? org.topics.join(', ') : ''}
      Description: ${org.description || ''}
    `.trim();

        try {
            let embedding;
            if (model) {
                const result = await model.embedContent(textToEmbed);
                embedding = result.embedding;
            } else {
                embedding = getMockEmbedding();
            }

            vectorStore.push({
                id: i, // Use index or org.name as ID
                name: org.name,
                url: org.url,
                technologies: org.technologies,
                topics: org.topics,
                description: org.description,
                filters: {
                    category: org.category
                },
                embedding: embedding.values
            });

            process.stdout.write(`\rProcessed ${i + 1}/${organizations.length}`);
        } catch (error) {
            console.error(`\nError embedding ${org.name}:`, error.message);
        }

        // Simple rate limiting: wait 100ms between requests
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\nWriting embeddings to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorStore, null, 2));
    console.log("Vector index built successfully!");
}

buildVectorIndex().catch(err => console.error(err));
