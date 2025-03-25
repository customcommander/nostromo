import {
  writeFileSync
} from 'node:fs';

import {
  assign,
  createActor,
  createMachine,
  enqueueActions,
  log,
  setup,
} from "xstate";

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
      for (let ship of event.ships) {
        enqueue.assign(({context: ctx}) => {
          const {ships = []} = ctx;
          return {
            ships: ships.concat({
              symbol: ship.symbol,
              status: ship.nav.status,
              location: ship.nav.waypointSymbol
            })
          }
        });
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
        writeFileSync('../context.json', JSON.stringify(context, null, 2));
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

