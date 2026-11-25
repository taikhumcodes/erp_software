import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { logger } from './logger.js';

let proxyServer: net.Server | null = null;
let proxyPort = 5433;

export async function ensureDbProxy(): Promise<string> {
  const originalUrl = process.env['DATABASE_URL'];
  if (!originalUrl) return '';

  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return originalUrl;
  }

  // If already pointing to localhost/127.0.0.1, no proxy needed
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return originalUrl;
  }

  const targetHost = parsed.hostname;
  const targetPort = Number(parsed.port || 5432);

  // If proxy already running, return cached proxy URL
  if (proxyServer) {
    parsed.hostname = '127.0.0.1';
    parsed.port = String(proxyPort);
    parsed.searchParams.set('sslmode', 'disable');
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  }

  // Resolve target IP using public DNS (8.8.8.8, 1.1.1.1) to bypass local router DNS blocks
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  let targetIp = '';
  try {
    const ips = await resolver.resolve4(targetHost);
    targetIp = ips[0];
  } catch {
    try {
      const cnameMatch = targetHost.match(/^[^.]+\.(.+)$/);
      const domainToResolve = cnameMatch ? cnameMatch[1] : targetHost;
      const ips = await resolver.resolve4(domainToResolve);
      targetIp = ips[0];
    } catch (resolveErr) {
      logger.warn({ err: resolveErr }, 'DNS resolution via public DNS failed, using fallback IP');
      targetIp = '13.251.213.89';
    }
  }

  if (!targetIp) {
    targetIp = '13.251.213.89';
  }

  logger.info({ targetHost, targetIp }, 'Initializing local database proxy');

  await new Promise<void>((resolve, reject) => {
    proxyServer = net.createServer((clientSocket) => {
      // Prevent unhandled error crashes on client socket disconnect
      clientSocket.on('error', (err) => {
        // Ignored or logged at debug — client dropped connection
      });

      clientSocket.once('data', (rawChunk) => {
        const firstChunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
        const isSslRequest =
          firstChunk.length === 8 &&
          firstChunk.readInt32BE(0) === 8 &&
          firstChunk.readInt32BE(4) === 80877103;

        if (isSslRequest) {
          clientSocket.write('N');
          clientSocket.once('data', (rawStartup) => {
            const startupChunk = Buffer.isBuffer(rawStartup) ? rawStartup : Buffer.from(rawStartup);
            handleStartup(startupChunk);
          });
        } else {
          handleStartup(firstChunk);
        }

        function handleStartup(startupData: Buffer) {
          clientSocket.pause();
          const queuedChunks: Buffer[] = [startupData];
          const onData = (c: Buffer) => queuedChunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
          clientSocket.on('data', onData);

          let activeTlsSocket: tls.TLSSocket | null = null;

          const remoteSocket = net.connect(targetPort, targetIp, () => {
            const sslReq = Buffer.from([0x00, 0x00, 0x00, 0x08, 0x04, 0xd2, 0x16, 0x2f]);
            remoteSocket.write(sslReq);

            remoteSocket.once('data', (resp) => {
              if (resp.toString() === 'S') {
                activeTlsSocket = tls.connect(
                  {
                    socket: remoteSocket,
                    servername: targetHost,
                    rejectUnauthorized: false,
                  },
                  () => {
                    clientSocket.off('data', onData);
                    for (const chunk of queuedChunks) {
                      activeTlsSocket?.write(chunk);
                    }
                    clientSocket.pipe(activeTlsSocket!);
                    activeTlsSocket!.pipe(clientSocket);
                    clientSocket.resume();
                  },
                );

                activeTlsSocket.on('error', (_err) => {
                  clientSocket.destroy();
                });

                clientSocket.on('close', () => {
                  activeTlsSocket?.destroy();
                });
              } else {
                clientSocket.destroy();
              }
            });
          });

          remoteSocket.on('error', (_err) => {
            clientSocket.destroy();
          });

          clientSocket.on('close', () => {
            remoteSocket.destroy();
          });
        }
      });
    });

    function tryListen(port: number) {
      proxyPort = port;
      proxyServer?.listen(proxyPort, '127.0.0.1', () => {
        logger.info({ port: proxyPort }, 'Database proxy listening on localhost');
        resolve();
      });
    }

    proxyServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        tryListen(proxyPort + 1);
      } else {
        reject(err);
      }
    });

    tryListen(proxyPort);
  });

  parsed.hostname = '127.0.0.1';
  parsed.port = String(proxyPort);
  parsed.searchParams.set('sslmode', 'disable');
  parsed.searchParams.delete('channel_binding');
  const proxiedUrl = parsed.toString();
  process.env['DATABASE_URL'] = proxiedUrl;
  return proxiedUrl;
}
