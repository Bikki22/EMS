"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_js_1 = require("./app/app.js");
const db_js_1 = require("./app/config/db.js");
const bookingExpiry_job_js_1 = require("./app/services/bookingExpiry.job.js");
const env_js_1 = require("./app/config/env.js");
async function main() {
    try {
        const server = (0, node_http_1.createServer)((0, app_js_1.createApplication)());
        const PORT = env_js_1.env.PORT;
        server.listen(PORT, () => {
            (0, db_js_1.connectDB)();
            (0, bookingExpiry_job_js_1.startBookingExpiryJob)();
            console.log(`Http server is running on PORT ${PORT}`);
        });
    }
    catch (error) {
        console.error("Error starting http server", error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map