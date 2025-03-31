import {
  writeFileSync
} from 'node:fs';

import {
  resolve,
} from 'node:path'

import {
  assign,
  createActor,
  enqueueActions,
  log,
  setup,
} from 'xstate';

import bootstrap from './bootstrap.js';
import shipActor from './ship.js';

const src = setup({
  actors: {
    bootstrap,
  },
  actions: {
    'register': assign(({event}, params) => {
      const {entity} = params;
      return {[entity]: event[entity]};
    }),

    'register-ships': enqueueActions(({enqueue, event, context}) => {
      enqueue.assign(() => {
        return {
          ships: event.ships
        }
      });

      for (let ship of event.ships) {
        enqueue.spawnChild(shipActor, {
          systemId: ship.symbol,
          input: {
            token: context.token,
            ship
          }
        });
      }
    })
  }
});

// 12
const machine = src.createMachine({
  context: ({input}) => ({
    token: input.token
  }),
  initial: 'bootstrap',
  states: {
    bootstrap: {
      invoke: {
        src: 'bootstrap',
        input: ({context}) => ({token: context.token}),
        onDone: {
          target: 'loop'
        }
      }
    },

    loop: {
      entry: ({context}) => {
        console.log('agent is alive');
        writeFileSync(resolve(import.meta.dirname, '..', 'context.json'), JSON.stringify(context, null, 2));
      },
      type: 'final'
    },
    stop: {
      type: 'final',
    },
    error: {
      type: 'final',
    }
  },
  on: {
    interrupt: {
      actions: log('restarting machine...'),
      target: '.stop',
    },
    'register.*': {
      actions: {
        type: 'register',
        params: ({event}) => ({
          entity: event.type.split('.')[1]
        })
      }
    },
    'register.ships': {
      actions: 'register-ships'
    },
  }
});

export default (token) => {
  return createActor(machine, {
    systemId: 'nostromo.ai',
    input: {
      token
    },
  });
};

