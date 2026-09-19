const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2] === "dev" ? "dev" : "build";
const directories = mode === "dev" ? [".next-dev"] : [".next"];
for (const directoryName of directories) {
  const nextDirectory = path.join(process.cwd(), directoryName);
  if (fs.existsSync(nextDirectory)) {
    fs.rmSync(nextDirectory, { recursive: true, force: true });
    console.log(`Cleaned Next.js build cache: ${directoryName}`);
  }
}
