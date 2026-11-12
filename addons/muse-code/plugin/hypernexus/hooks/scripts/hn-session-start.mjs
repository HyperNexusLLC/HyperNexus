import { run } from './hn-hook-lib.mjs';
process.argv[2] = 'session-start';
await run();
process.exit(0);
