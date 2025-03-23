import {
  log,
  setup,
} from "xstate";

const src = setup({
  guards: {
    'is-docked?': ({context}) => {
      return context.nav.status == 'DOCKED';
    },
    'is-in-transit?': ({context}) => {
      return context.nav.status == 'IN_TRANSIT';
    },
    'is-in-orbit?': ({context}) => {
      return context.nav.status == 'IN_ORBIT';
    }
  }
});

export default src.createMachine({
  context: ({input}) => ({
    token: input.token,
    ...input.ship
  }),
  initial: 'init',
  states: {
    init: {
      entry: log('working out status'),
      always: [
        {guard:     'is-docked?', target:     'docked'},
        {guard: 'is-in-transit?', target: 'in-transit'},
        {guard:   'is-in-orbit?', target:   'in-orbit'},
      ],
    },
    docked: {
      entry: log('ship is docked')
    },
    'in-transit': {
      entry: log('ship is in transit')
    },
    'in-orbit': {
      entry: log('ship is in orbit')
    }
  }
});

