import readline from "node:readline/promises";

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

    console.log(`You entered: ${userInput}`);
  }

  rl.close();
}

main().catch((err) => {
  console.error("An error occurred:", err);
});
