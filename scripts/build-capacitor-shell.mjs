import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const clientDir = resolve(process.cwd(), "dist/client");

const html = `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unloop</title>
</head>
<body>
<div id="root"></div>
<script type="module" src="./assets/index-D5uWH7Un.js"></script>
<link rel="stylesheet" href="./assets/styles-DkOrYrGP.css">
</body>
</html>`;

writeFileSync(
  resolve(clientDir, "index.html"),
  html,
  "utf8"
);

console.log("index.html created.");