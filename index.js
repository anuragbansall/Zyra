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

const checkpointer = new MemorySaver();

const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

const tools = [tool];
const toolNode = new ToolNode(tools);

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
}).bindTools(tools);

async function callModel(state) {
  console.log("LLM is thinking...");
  const aiResponse = await llm.invoke(state.messages);

  return { messages: [aiResponse] };
}

function shouldContinue(state) {
  return state.messages[state.messages.length - 1].tool_calls?.length > 0
    ? "tools"
    : "__end__";
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

const app = workflow.compile({ checkpointer });

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

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
        configurable: { thread_id: threadId },
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
