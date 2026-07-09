import { createServer } from "node:http";
import { createApplication } from "./app/app.js";
import { connectDB } from "./app/config/db.js";
import { startBookingExpiryJob } from "./app/services/bookingExpiry.job.js";

async function main() {
  try {
    await connectDB();

    const server = createServer(createApplication());

    const PORT: number = Number(process.env.PORT) || 8000;

    server.listen(PORT, () => {
      startBookingExpiryJob();
      console.log(`Http server is running on PORT ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting http server", error);
    process.exit(1);
  }
}

main();
