import {randomInt} from 'node:crypto';
import {once} from 'node:events';

// Windows can allocate a low port which Fetch refuses before connecting.
export async function listenLoopback(server) {
  for (let attempt = 1; ; attempt++) {
    server.listen(randomInt(49152, 65536), '127.0.0.1');
    try {
      await once(server, 'listening');
      return server.address().port;
    } catch (error) {
      if (attempt >= 20 || !['EACCES','EADDRINUSE'].includes(error.code)) throw error;
    }
  }
}
