import { HumanMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import readline from "node:readline/promises";
import { config } from "dotenv";

config();

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
});

async function callModel(state) {
  console.log("LLM is thinking...");
  const aiResponse = await llm.invoke(state.messages);

  return { messages: [aiResponse] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__");

const app = workflow.compile();

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

    const response = await app.invoke({
      messages: [new HumanMessage(userInput)],
    });

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
