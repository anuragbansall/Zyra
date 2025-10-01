import { HumanMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import readline from "node:readline/promises";

function callModel(state) {
  // TODO: Call GROQ model here

  return state;
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

    console.log("Response:", response);
  }

  rl.close();
}

main().catch((err) => {
  console.error("An error occurred:", err);
});
