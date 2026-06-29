import { Client } from "ssh2";
import * as net from "net";
import { sshConfig } from "./config.js";

interface Tunnel {
  server: net.Server;
  localPort: number;
}

let sshClient: Client | null = null;
let connected = false;
const tunnels = new Map<string, Tunnel>();

function tunnelKey(remoteHost: string, remotePort: number): string {
  return `${remoteHost}:${remotePort}`;
}

function connectSSH(): Promise<Client> {
  return new Promise((resolve, reject) => {
    if (!sshConfig) {
      reject(
        new Error(
          "SSH config not set. Provide SSH_HOST, SSH_USERNAME, SSH_PASSWORD env vars."
        )
      );
      return;
    }

    const client = new Client();

    client.on("error", (err) => {
      connected = false;
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    client.on("ready", () => {
      connected = true;
      resolve(client);
    });

    client.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      password: sshConfig.password,
    });
  });
}

async function ensureSSHClient(): Promise<Client> {
  if (sshClient && connected) return sshClient;

  // Cleanup stale client
  if (sshClient) {
    try {
      sshClient.end();
    } catch {
      // ignore cleanup errors
    }
    sshClient = null;
  }

  sshClient = await connectSSH();
  return sshClient;
}

export async function ensureTunnel(
  remoteHost: string,
  remotePort: number
): Promise<number> {
  const key = tunnelKey(remoteHost, remotePort);

  // Reuse existing tunnel
  const existing = tunnels.get(key);
  if (existing) return existing.localPort;

  const client = await ensureSSHClient();

  return new Promise((resolve, reject) => {
    const server = net.createServer((sock) => {
      client.forwardOut(
        "127.0.0.1",
        sock.remotePort ?? 0,
        remoteHost,
        remotePort,
        (err, stream) => {
          if (err) {
            sock.end();
            return;
          }
          sock.pipe(stream).pipe(sock);
        }
      );
    });

    server.on("error", reject);

    // port: 0 = OS picks available port
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to get local port"));
        return;
      }
      const localPort = addr.port;
      tunnels.set(key, { server, localPort });
      resolve(localPort);
    });
  });
}

export async function shutdownTunnels(): Promise<void> {
  for (const [, tunnel] of tunnels) {
    tunnel.server.close();
  }
  tunnels.clear();

  if (sshClient) {
    sshClient.end();
    sshClient = null;
    connected = false;
  }
}
