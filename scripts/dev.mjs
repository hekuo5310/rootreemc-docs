import { watchAndServe } from "../src/dev-server.mjs";

const port = Number(process.env.PORT || 4173);

watchAndServe(process.cwd(), { port }).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

