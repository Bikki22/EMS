import { createServer } from "node:http";
import { createApplication } from "./app/app.js";
import { connectDB } from "./app/config/db.js";

async function main() {
  try {
    const server = createServer(createApplication());

    const PORT: number = 8000;

    server.listen(PORT, () => {
      connectDB();
      console.log(`Http server is running in PORT ${PORT}`);
    });
  } catch (error) {
    console.log(`Error Starting htpp server`);
  }
}

main();
