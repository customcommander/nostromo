import {
  assign,
  log,
  fromPromise,
  sendTo,
  setup
} from "xstate";

import {
  as_actor,
  get_agent,
  get_contracts,
  get_ships,
  get_system,
} from './api.js';

const src = setup({
  actors: {
    'agent-loader': as_actor(get_agent),

    'contracts-loader': as_actor(get_contracts),

    'ships-loader': as_actor(get_ships),

    'systems-loader': fromPromise(async ({input}) => {
      const {token, systems} = input;
      const response = {};
      for await (const system of systems) {
        response[system] = await get_system(token, {system});
      }
      console.log('wat');
      return response;
    })
  },
  actions: {
    'register': sendTo(
      ({system}) => system.get('nostromo.ai'),
      ({event}, params) => {
        const {entity} = params;
        return {type: `register.${entity}`, [entity]: event.output};
      }
    ),
    'record-systems': assign(({context}, params) => {
      const waypoints = params.waypoints.map(w => {
        const [a, b] = w.split('-');
        return `${a}-${b}`;
      });
      return {
        systems: [...new Set(context.systems.concat(waypoints))]
      };
    })
  }
});

export default src.createMachine({
  context: ({input}) => ({
    token: input.token,
    systems: []
  }),
  initial: 'load-agent',
  states: {
    'load-agent': {
      invoke: {
        src: 'agent-loader',
        input: ({context}) => ({token: context.token}),
        onDone: {
          target: 'load-contracts',
          actions: [
            {
              type: 'register',
              params: {
                entity: 'agent'
              }
            },
            {
              type: 'record-systems',
              params: ({event}) => ({
                waypoints: [event.output.headquarters]
              })
            }
          ]
        }
      }
    },
    'load-contracts': {
      invoke: {
        src: `contracts-loader`,
        input: ({context}) => ({token: context.token}),
        onDone: {
          target: 'load-ships',
          actions: {
            type: 'register',
            params: {
              entity: 'contracts'
            }
          }
        }
      }
    },
    'load-ships': {
      invoke: {
        src: `ships-loader`,
        input: ({context}) => ({token: context.token}),
        onDone: {
          target: 'load-systems',
          actions: [
            {
              type: 'register',
              params: {
                entity: 'ships'
              }
            },
            {
              type: 'record-systems',
              params: ({event}) => ({
                waypoints: event.output.map(ship => ship.nav.waypointSymbol)
              })
            }
          ],
        }
      }
    },
    'load-systems': {
      invoke: {
        src: 'systems-loader',
        input: ({context}) => ({
          token: context.token,
          systems: context.systems
        }),
        onDone: {
          target: 'done',
          actions: {
            type: 'register',
            params: {
              entity: 'systems'
            }
          }
        }
      }
    },
    done: {
      type: 'final'
    }
  }
});

