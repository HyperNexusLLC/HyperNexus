import { run } from './hn-hook-lib.mjs';
process.argv[2] = 'session-stop';
await run();
process.exit(0);
