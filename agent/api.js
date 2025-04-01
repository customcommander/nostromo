import { fromPromise } from "xstate";

function pause() {
  return new Promise(resolve => {
    setTimeout(() => resolve(true), 500);
  });
}

async function _get(endpoint, token, page, limit) {
  const pagination = page && limit ? `?page=${page}&limit=${limit}` : '';
  const url = `https://api.spacetraders.io/v2${endpoint}${pagination}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  return body;
}

async function _paginate(endpoint, token) {
  let data = [];
  let page;
  let limit;
  let total;
  let more = true;

  while (more) {
    const body = await _get(endpoint, token, page, limit);

    data = data.concat(body.data);
    
    if (!body.meta) {
      break;
    }

    page  ??= body.meta.page;
    limit ??= body.meta.limit;
    total ??= body.meta.total;

    more = page * limit < total;

    if (more) {
      page++;
      await pause();
    }
  }

  return data;
}

export function as_actor(fn) {
  return fromPromise(async ({input}) => {
    const {token, ...params} = input;
    const response = await fn(token, params);
    return response;
  });
}

// '/foo/:x/:y' + {x: 'bar', y: 'baz'} -> '/foo/bar/baz'
function resolve(endpoint, params) {
  const entries = Object.entries(params);
  return entries.reduce((str, [k, v]) => str.replace(`:${k}`, v), endpoint);
}


function unwrap(xs) {
  return xs[0];
}

function identity(x) {
  return x;
}

function get(endpoint, cb = identity) {
  return async function (token, params) {
    const resolved = resolve(endpoint, params);
    const response = await _paginate(resolved, token);
    return cb(response);
  };
}

export const get_agent     = get('/my/agent', unwrap);
export const get_contracts = get('/my/contracts', unwrap);
export const get_ships     = get('/my/ships');
export const get_system    = get('/systems/:system/waypoints');

