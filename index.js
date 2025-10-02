import { HumanMessage } from "@langchain/core/messages";
import {
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import readline from "node:readline/promises";
import { config } from "dotenv";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
import { threadId } from "node:worker_threads";

config();

// In-memory checkpointer to save state between runs
const checkpointer = new MemorySaver();

// Web search tool
const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

// Wrap the tools in a ToolNode
const tools = [tool];
const toolNode = new ToolNode(tools);

// Initialize the LLM and bind tools so it can call them
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
}).bindTools(tools);

// Function to call the LLM with the current state
async function callModel(state) {
  console.log("LLM is thinking...");
  const aiResponse = await llm.invoke(state.messages);

  return { messages: [aiResponse] };
}

// Function to determine the next step based on the state
function shouldContinue(state) {
  return state.messages[state.messages.length - 1].tool_calls?.length > 0
    ? "tools"
    : "__end__";
}

// Define the workflow graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Compile the workflow with the checkpointer
const app = workflow.compile({ checkpointer });

// Main function to handle user input and interact with the workflow
async function main() {
  // Create a readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Start the interaction loop
  while (true) {
    const userInput = await rl.question("Enter something: ");

    if (userInput.toLowerCase() === "exit") {
      console.log("Exiting...");
      break;
    }

    const response = await app.invoke(
      {
        messages: [new HumanMessage(userInput)],
      },
      {
        configurable: { thread_id: threadId }, // Use threadId for unique session
      }
    );

    console.log(
      "Response:",
      response.messages[response.messages.length - 1].content
    );
  }

  rl.close();
}

main().catch((err) => {
  console.error("An error occurred:", err);
});
