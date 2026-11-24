// Runs the API and the frontend together: `npm run dev` from the repo root.
// No dependencies; works in PowerShell, cmd, Git Bash, macOS and Linux.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const windows = process.platform === 'win32';

const processes = [
  {
    name: 'api',
    color: '\x1b[38;5;208m',
    cmd: windows ? 'mvnw.cmd' : './mvnw',
    args: ['-q', 'spring-boot:run'],
    cwd: `${root}backend`,
  },
  { name: 'web', color: '\x1b[38;5;250m', cmd: 'npm', args: ['run', 'dev'], cwd: `${root}frontend` },
];

const children = processes.map(({ name, color, cmd, args, cwd }) => {
  const child = spawn(cmd, args, { cwd, shell: windows, env: process.env });
  const prefix = `${color}${name.padEnd(3)}\x1b[0m │ `;
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line) out.write(prefix + line + '\n');
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    process.stdout.write(`${prefix}exited with code ${code}\n`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
