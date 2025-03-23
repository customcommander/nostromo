import http from 'node:http';
import {readFileSync} from 'node:fs';

import getAgent from './main.js';

const agent = getAgent(readFileSync('.token', {encoding: 'utf-8'}));

// The signal `SIGUSR2` is sent by nodemon to notify a restart.
// We want to intercept this signal so we can gracefully restart the agent.
// In this case we must kill the process ourselves before nodemon can restart it.
process.on('SIGUSR2', () => {
  agent.subscribe({
    complete() {
      process.kill(process.pid, 'SIGTERM');
    }
  });

  agent.send({type: 'interrupt'}); 
});

const server = http.createServer((_, res) => {

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    'connection': 'keep-alive'
  });

  agent.start();
});

server.listen(8000);

