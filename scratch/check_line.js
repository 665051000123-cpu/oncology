
const fs = require("fs");
const lines = fs.readFileSync("client/src/App.jsx", "utf-8").split("\n");
const line = lines[3928]; // 0-indexed
console.log("LINE 3929:", line);
console.log("DOES IT HAVE BACKSLASH d?", line.includes("\\d"));

