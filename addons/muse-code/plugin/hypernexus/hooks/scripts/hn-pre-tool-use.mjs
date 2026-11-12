import { run } from './hn-hook-lib.mjs';
process.argv[2] = 'pre-tool-use';
await run();
process.exit(0);
