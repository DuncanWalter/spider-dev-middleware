import {
  Store,
  Action,
  ActionList,
  Reducer,
  utils,
  Middleware,
} from '@dwalter/spider-store'

const { SliceSet, propagateSlices } = utils

interface List<T> extends Array<T | T[]> {}

function flatten<T>(args: T | List<T>): T[] {
  if (Array.isArray(args)) {
    return args.map(flatten).reduce((a, l) => a.concat(l), [])
  } else {
    return [args]
  }
}

function injectState(store: Store, state: { [props: string]: unknown }) {
  const marks = new SliceSet()
  store.slices.forEach((slice: any, reducer: Reducer<any>) => {
    slice.injectState(state[reducer.name], marks)
  })
  propagateSlices(marks)
}

function aggregateState(store: Store) {
  const state: { [props: string]: unknown } = {}
  store.slices.forEach((slice: any, reducer: Reducer<any>) => {
    if (state.hasOwnProperty(reducer.name)) {
      console.warn('TODO:')
    }
    state[reducer.name] = store.resolve(slice)
  })
  return state
}

// TODO: hotkey to clear state
const sessionWare: Middleware = store => next => {
  if (sessionStorage) {
    try {
      let state: { [name: string]: unknown } = {}

      const wrapReducer = store.wrapReducer
      store.wrapReducer = function(reducer) {
        if (!store.slices.has(reducer)) {
          if (state.hasOwnProperty(reducer.name)) {
            const slice = wrapReducer(reducer)
            const marks = new SliceSet()
            slice.injectState(state[reducer.name], marks)
            propagateSlices(marks)
            return slice
          }
        }
        return wrapReducer(reducer)
      }

      const serializedState = sessionStorage.getItem('@@store-state')
      if (serializedState != null) {
        state = JSON.parse(serializedState)
        // just in case - probably doing nothing as the store
        // does not yet have any slices
        injectState(store, state)
      }

      return (actions: Action | ActionList) => {
        next(actions)

        Object.assign(state, aggregateState(store))

        try {
          sessionStorage.setItem('@@store-state', JSON.stringify(state))
        } catch (error) {
          console.warn('TODO: same warning as below?')
        }
      }
    } catch (error) {
      console.warn('TODO: spider-dev-middleware encountered an error')
    }
  }
  return next
}

const withDevTools: Middleware = store => next => {
  const devTools = window && (window as any).__REDUX_DEVTOOLS_EXTENSION__
  if (devTools) {
    // console.log(Object.keys(devTools))

    const { init, send, subscribe } = devTools.connect({
      // features: { skip: false },
    })

    // TODO: needs to read state in here
    init({})

    const reducerNames = new Map<Reducer<any>, string>()

    subscribe((message: any) => {
      if (
        message.type === 'DISPATCH' &&
        message.payload.type === 'JUMP_TO_ACTION'
      ) {
        const newState = JSON.parse(message.state)

        injectState(store, newState)
      }
    })

    return (actions: Action | ActionList) => {
      const actionList = flatten<Action>(actions as Action)
      next(actions)
      if (actionList.length === 1) {
        send(actionList[0], aggregateState(store))
      } else {
        send(
          {
            type: actionList.map(action => action.type).join(', '),
            actionList,
          },
          aggregateState(store),
        )
      }
    }
  } else {
    return next
  }
}

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
 * Middleware that prevents state mutation. For use in dev mode.
 */
const freezer: Middleware = store => next => actions => {
  next(actions)
  const reducers: { [name: string]: Reducer<unknown> } = {}
  flatten(flatten(actions).map(action => (action as Action).reducers)).forEach(
    reducer => (reducers[reducer.name] = reducer),
  )
  for (let name of Object.keys(reducers)) {
    deepFreeze(store.resolve(reducers[name]))
  }
}

function isNameCrushed() {
  return isNameCrushed.name !== 'isNameCrushed'
}

if (isNameCrushed()) {
  console.warn('using dev middlware in minified code.')
}

function composeMiddleware(...middlewares: Middleware[]): Middleware {
  return store => next =>
    middlewares
      .map(middleware => middleware(store))
      .reduceRight((acc, middleware) => middleware(acc), next)
}

const devMiddleware = composeMiddleware(sessionWare, withDevTools, freezer)
