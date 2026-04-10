import { buildSite } from "../src/build-site.mjs";

async function run() {
  const result = await buildSite(process.cwd());
  console.log(`Build complete: ${result.pageCount} pages -> ${result.outDir}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

