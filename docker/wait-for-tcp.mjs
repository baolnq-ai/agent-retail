import net from 'node:net';

const [host = '127.0.0.1', rawPort = '80', label = `${host}:${rawPort}`] = process.argv.slice(2);
const port = Number.parseInt(rawPort, 10);
const timeoutMs = Number.parseInt(process.env.WAIT_TIMEOUT_MS ?? '90000', 10);
const startedAt = Date.now();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid TCP port: ${rawPort}`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function tryConnect() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(2000);
    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('timeout'));
    });
    socket.once('error', reject);
  });
}

while (Date.now() - startedAt < timeoutMs) {
  try {
    await tryConnect();
    console.log(`${label} is ready at ${host}:${port}`);
    process.exit(0);
  } catch {
    await sleep(1000);
  }
}

console.error(`${label} is not ready after ${timeoutMs}ms at ${host}:${port}`);
process.exit(1);
