import { Middleware, Reducer, Action } from '@dwalter/spider-store'
import { flatten } from './utils'

function deepFreeze(subject: unknown, entities = new Set<unknown>()) {
  if (entities.has(subject)) {
    console.warn(
      'TODO: data is not serializable because references to objects are not flattened.',
    )
  }

  if (Array.isArray(subject)) {
    entities.add(subject)
    if (Object.isFrozen(subject)) return
    Object.freeze(subject)
    subject.forEach(element => deepFreeze(element, entities))
  } else if (typeof subject === 'object' && subject instanceof Object) {
    entities.add(subject)
    if (Object.isFrozen(subject)) return
    Object.freeze(subject)
    for (let key of Object.keys(subject)) {
      deepFreeze((subject as Record<string, unknown>)[key], entities)
    }
  } else if (typeof subject === 'function') {
    console.warn(
      'TODO: state should be serializable using only JSON.parse. Functions and Symbols do not meet this standard',
    )
  }
}

/**
 * Middleware that prevents state mutation.
 */
export const freezerMiddleware: Middleware = (store, { dispatch }) => ({
  dispatch(actions) {
    dispatch(actions)
    const reducers: { [name: string]: Reducer<unknown> } = {}
    flatten<Reducer<any>>(
      flatten(actions).map(action => (action as Action).reducers),
    ).forEach(reducer => (reducers[reducer.name] = reducer))
    for (let name of Object.keys(reducers)) {
      deepFreeze(store.resolve(reducers[name]))
    }
  },
})
