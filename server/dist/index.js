"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_1 = require("./app/app");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const server = (0, node_http_1.createServer)((0, app_1.createApplication)());
            const PORT = 8000;
            server.listen(PORT, () => {
                console.log(`Http server is running in PORT ${PORT}`);
            });
        }
        catch (error) {
            console.log(`Error Starting htpp server`);
        }
    });
}
main();
