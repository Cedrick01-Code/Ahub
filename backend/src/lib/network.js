import { Agent } from 'undici';

export const ipv4Dispatcher = new Agent({ connect: { family: 4, timeout: 60000 } });

export const ipv4Fetch = (input, options = {}) => fetch(input, {
  ...options,
  dispatcher: ipv4Dispatcher,
});
