import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
};

const commands = [
  ['corepack', ['pnpm', '--filter', '@retail-agent/shared', 'build']],
  ['corepack', ['pnpm', '--filter', '@retail-agent/api', 'db:generate']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
