import { PrismaClient, Category, MasteryLevel } from '@prisma/client';

const prisma = new PrismaClient();

const starterTopics = [
  // DSA
  { category: Category.DSA, name: 'Arrays & Strings', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.DSA, name: 'Hashmaps', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.DSA, name: 'Two Pointers & Sliding Window', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.DSA, name: 'Trees', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.DSA, name: 'Graphs (BFS/DFS)', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.DSA, name: 'Dynamic Programming Basics', masteryLevel: MasteryLevel.NOT_STARTED },

  // SYSTEM DESIGN
  { category: Category.SYSTEM_DESIGN, name: 'API Design & REST Principles', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.SYSTEM_DESIGN, name: 'DB Indexing & Scaling', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.SYSTEM_DESIGN, name: 'Caching (Redis)', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.SYSTEM_DESIGN, name: 'Load Balancing', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.SYSTEM_DESIGN, name: 'Pub/Sub & Message Queues', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.SYSTEM_DESIGN, name: 'Design a Real-Time System (mock interview prep)', masteryLevel: MasteryLevel.NOT_STARTED },

  // AI AGENTIC
  { category: Category.AI_AGENTIC, name: 'RAG Fundamentals', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.AI_AGENTIC, name: 'Vector DBs (Pinecone/Chroma)', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.AI_AGENTIC, name: 'LangChain Basics', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.AI_AGENTIC, name: 'LangGraph & Multi-Agent Orchestration', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.AI_AGENTIC, name: 'Tool-Calling / Function-Calling Patterns', masteryLevel: MasteryLevel.NOT_STARTED },

  // CLOUD-NATIVE COMPUTING
  { category: Category.CLOUD_NATIVE_COMPUTING, name: 'Kubernetes Fundamentals', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.CLOUD_NATIVE_COMPUTING, name: 'Service Mesh & Observability', masteryLevel: MasteryLevel.NOT_STARTED },
  { category: Category.CLOUD_NATIVE_COMPUTING, name: 'Cloud Native Deployments & CI/CD', masteryLevel: MasteryLevel.NOT_STARTED }
];

async function main() {
  console.log('Seeding starter topics...');
  
  // Clear out any existing topics to avoid duplicates
  await prisma.topic.deleteMany({});
  
  for (const topic of starterTopics) {
    const created = await prisma.topic.create({
      data: topic
    });
    console.log(`Created topic: ${created.name} (${created.category})`);
  }
  
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
