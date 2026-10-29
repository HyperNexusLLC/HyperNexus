import { run } from './hn-hook-lib.mjs';
process.argv[2] = 'post-tool-use';
await run();
process.exit(0);
