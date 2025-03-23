import { fromPromise } from "xstate";

// TODO: automatically paginate
async function get(endpoint, token) {
  const url = `https://api.spacetraders.io/v2${endpoint}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(response.status);
  }

  const body = await response.json();
  return Array.isArray(body.data) ? body.data : [body.data];
}

function as_actor(endpoint, cb) {
  return fromPromise(async ({input}) => {
    const response = await get(endpoint, input.token);
    return cb(response);
  });
}

export const get_agent = as_actor('/my/agent', ([agent]) => ({
  agent: agent.symbol,
  headquarters: agent.headquarters,
  credits: agent.credits
}));

export const get_contracts = as_actor('/my/contracts', ([contract]) => ({
  id: contract.id,
  accepted: contract.accepted,
  acceptBefore: contract.deadlineToAccept,
  deadline: contract.terms.deadline,
  terms: contract.terms.deliver.map(d => ({
    deliver: d.tradeSymbol,
    to: d.destinationSymbol,
    fulfilled: d.unitsFulfilled,
    required: d.unitsRequired
  }))
}));

export const get_ships = as_actor('/my/ships', data => data);

