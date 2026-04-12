import { spawn } from 'node:child_process';

const [, , target = 'dev', ...rawArgs] = process.argv;

const filteredArgs = [];
for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];

  if (arg === '-w' || arg === '--workspace' || arg === '--workspaces') {
    const next = rawArgs[i + 1];
    if (next && !next.startsWith('-')) i += 1;
    continue;
  }

  if (arg === 'frontend') continue;

  filteredArgs.push(arg);
}

const commandMap = {
  dev: ['node_modules/vite/bin/vite.js'],
  build: ['node_modules/vite/bin/vite.js', 'build'],
  'build:dev': ['node_modules/vite/bin/vite.js', 'build', '--mode', 'development'],
  preview: ['node_modules/vite/bin/vite.js', 'preview'],
  lint: ['node_modules/eslint/bin/eslint.js', '.'],
  test: ['node_modules/vitest/vitest.mjs', 'run'],
};

const command = commandMap[target];
if (!command) {
  console.error(`Unknown frontend command: ${target}`);
  process.exit(1);
}

const child = spawn(process.execPath, command.concat(filteredArgs), {
  cwd: new URL('../frontend/', import.meta.url),
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
