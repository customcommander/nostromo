import {
  assign,
  createActor,
  createMachine,
  enqueueActions,
  log,
  setup,
} from "xstate";

import loader from './loader.js';
import bootstrap from './bootstrap.js';
import shipActor from './ship.js';

const src = setup({
  actors: {
    bootstrap,
  },
  actions: {
    'register-agent': assign(({event}) => {
      const {agent} = event;
      return agent;
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
          target: 'bar'
        }
      }
    },
    bar: {
      entry: ({context}) => console.log('this is bar!', context),
      type: 'final'
    },
    stop: {
      type: 'final',
      entry: () => console.log('stopped!')
    },
    error: {
      type: 'final',
      entry: log('error. quit.')
    }
  },
  on: {
    interrupt: {
      actions: () => console.log('got interrupt...'),
      target: '.stop'
    },
    'register.agent': {
      actions: 'register-agent'
    },
    'register.ships': {
      actions: 'register-ships'
    }
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

