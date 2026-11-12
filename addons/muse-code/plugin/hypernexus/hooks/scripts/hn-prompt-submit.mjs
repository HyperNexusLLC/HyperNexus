import { run } from './hn-hook-lib.mjs';
process.argv[2] = 'prompt-submit';
await run();
process.exit(0);
