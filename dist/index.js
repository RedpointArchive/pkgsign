#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Path = require("path");
const clime_1 = require("clime");
let cli = new clime_1.CLI('pkgsign', Path.join(__dirname, 'commands'));
let shim = new clime_1.Shim(cli);
shim.execute(process.argv);
//# sourceMappingURL=index.js.map