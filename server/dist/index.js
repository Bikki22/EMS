"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_js_1 = require("./app/app.js");
const db_js_1 = require("./app/config/db.js");
async function main() {
    try {
        const server = (0, node_http_1.createServer)((0, app_js_1.createApplication)());
        const PORT = 8000;
        server.listen(PORT, () => {
            (0, db_js_1.connectDB)();
            console.log(`Http server is running in PORT ${PORT}`);
        });
    }
    catch (error) {
        console.log(`Error Starting htpp server`);
    }
}
main();
//# sourceMappingURL=index.js.map