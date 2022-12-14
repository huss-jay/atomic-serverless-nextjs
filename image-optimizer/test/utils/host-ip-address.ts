import { networkInterfaces } from 'os';

/**
 * Utility to find the local ip address
 * @see: https://stackoverflow.com/a/8440736/831465
 */
export function getLocalIpAddressFromHost(): string | undefined {
  const nets = networkInterfaces();
  const results: Record<string, Array<string>> = {}; // or just '{}', an empty object

  for (const name of Object.keys(nets)) {
    const netsByName = nets[name];

    if (netsByName !== undefined) {
      for (const net of netsByName) {
        // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          if (!results[name]) {
            results[name] = [];
          }

          results[name].push(net.address);
        }
      }
    }
  }

  // Get the first address we find
  for (const [, addresses] of Object.entries(results)) {
    for (const address of addresses) {
      return address;
    }
  }
}
