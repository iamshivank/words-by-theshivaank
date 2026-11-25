// Runs the API and the frontend together: `npm run dev` from the repo root.
// No dependencies; works in PowerShell, cmd, Git Bash, macOS and Linux.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const windows = process.platform === 'win32';
const JAVA_VERSION = '25';

const hasJava = (home) => !!home && existsSync(join(home, 'bin', windows ? 'java.exe' : 'java'));

// The Maven wrapper needs JAVA_HOME. Installers often don't set it, so look in the usual places.
function findJavaHome() {
  if (hasJava(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  if (process.platform === 'darwin') {
    try {
      return execFileSync('/usr/libexec/java_home', ['-v', JAVA_VERSION], { encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  }
  const parents = windows
    ? ['Eclipse Adoptium', 'Java', 'Microsoft', 'Zulu', 'Amazon Corretto'].map((d) =>
        join(process.env.ProgramFiles ?? 'C:\\Program Files', d),
      )
    : ['/usr/lib/jvm'];
  const candidates = parents
    .filter(existsSync)
    .flatMap((parent) => readdirSync(parent).map((name) => ({ name, home: join(parent, name) })))
    .filter(({ name, home }) => new RegExp(`(^|\\D)${JAVA_VERSION}(\\D|$)`).test(name) && hasJava(home))
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  return candidates[0]?.home ?? null;
}

const javaHome = findJavaHome();
if (!javaHome) {
  console.error(
    `JDK ${JAVA_VERSION} not found. Install it (Windows: winget install EclipseAdoptium.Temurin.${JAVA_VERSION}.JDK)` +
      ' or set JAVA_HOME to its folder, then try again.',
  );
  process.exit(1);
}
if (javaHome !== process.env.JAVA_HOME) console.log(`Using JAVA_HOME=${javaHome}`);
const local = process.argv.includes('--local');
// Local mode uses its own port, so it can run while a normal backend is up.
const apiPort = local ? '8081' : (process.env.PORT ?? '8080');
const env = { ...process.env, JAVA_HOME: javaHome, PORT: apiPort, API_PORT: apiPort };

const processes = [
  {
    name: 'api',
    color: '\x1b[38;5;208m',
    // Explicit .\ because cmd.exe may not search the current folder (NoDefaultCurrentDirectoryInExePath).
    cmd: windows ? '.\\mvnw.cmd' : './mvnw',
    // --local: a throwaway embedded Postgres instead of Neon (see LocalDevServer).
    args: local ? ['-q', 'test-compile', 'exec:java@local'] : ['-q', 'spring-boot:run'],
    cwd: `${root}backend`,
  },
  { name: 'web', color: '\x1b[38;5;250m', cmd: 'npm', args: ['run', 'dev'], cwd: `${root}frontend` },
];

const children = processes.map(({ name, color, cmd, args, cwd }) => {
  // Windows needs a shell to run .cmd files; passing one command string (args here are fixed,
  // never user input) avoids Node's DEP0190 warning about unescaped args with shell: true.
  const child = windows
    ? spawn([cmd, ...args].join(' '), { cwd, shell: true, env })
    : spawn(cmd, args, { cwd, env });
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
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // On Windows, kill() only stops the cmd.exe wrapper and leaves java/vite running; kill the tree.
    if (windows) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill();
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
