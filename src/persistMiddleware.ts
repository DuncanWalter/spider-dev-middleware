import { Middleware, utils } from '@dwalter/spider-store'
import { injectState, aggregateState } from './utils'

// TODO: hotkey to clear state
export const persistMiddleware: Middleware = (
  store,
  { dispatch, wrapReducer },
) => {
  if (sessionStorage) {
    try {
      let state: { [name: string]: unknown } = {}

      const serializedState = sessionStorage.getItem('@@store-state')
      if (serializedState != null) {
        state = JSON.parse(serializedState)
        // just in case - probably doing nothing as the store
        // does not yet have any slices
        injectState(store, state)
      }

      return {
        dispatch(actions) {
          dispatch(actions)

          Object.assign(state, aggregateState(store))

          try {
            sessionStorage.setItem('@@store-state', JSON.stringify(state))
          } catch (error) {
            console.warn('TODO: same warning as below?')
          }
        },
        wrapReducer(reducer) {
          if (!store.slices.has(reducer)) {
            if (state.hasOwnProperty(reducer.name)) {
              const slice = wrapReducer(reducer)
              const marks = new utils.SliceSet()
              slice.injectState(state[reducer.name] as any, marks)
              utils.propagateSlices(marks)
              return slice
            }
          }
          return wrapReducer(reducer)
        },
      }
    } catch (error) {
      console.warn('TODO: spider-dev-middleware encountered an error')
    }
  }
  return {}
}
