import {
  sendTo,
  setup
} from "xstate";

import {
  get_agent,
  get_ships,
} from './api.js';

const src = setup({
  actors: {
    'load-agent': get_agent,
    'load-ships': get_ships,
  },
  actions: {
    'record-agent': sendTo(
      ({system}) => system.get('nostromo.ai'),
      ({event}) => ({type: 'register.agent', agent: event.output})
    ),
    'register-ships': sendTo(
      ({system}) => system.get('nostromo.ai'),
      ({event}) => ({type: 'register.ships', ships: event.output})
    )
  }
});

export default src.createMachine({
  context: ({input}) => ({token: input.token}),
  initial: 'load-agent',
  states: {
    'load-agent': {
      invoke: {
        src: 'load-agent',
        input: ({context}) => ({token: context.token}),
        onDone: {
          target: 'load-ships',
          actions: 'record-agent',
        }
      }
    },
    'load-ships': {
      invoke: {
        src: 'load-ships',
        input: ({context}) => ({token: context.token}),
        onDone: {
          target: 'done',
          actions: 'register-ships'
        }
      }
    },
    done: {
      type: 'final'
    }
  }
});

