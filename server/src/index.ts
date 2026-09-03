import { createServer } from "node:http";
import { createApplication } from "./app/app.js";
import { connectDB } from "./app/config/db.js";
import { startBookingExpiryJob } from "./app/services/bookingExpiry.job.js";
import { env } from "./app/config/env.js";

async function main() {
  try {
    const server = createServer(createApplication());

    const PORT: number = env.PORT;

    server.listen(PORT, () => {
      connectDB();
      startBookingExpiryJob();
      console.log(`Http server is running on PORT ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting http server", error);
    process.exit(1);
  }
}

main();
