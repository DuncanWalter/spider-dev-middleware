import { Reducer, Middleware, Action } from '@dwalter/spider-store'
import { injectState, aggregateState, flatten } from './utils'

export const devToolsMiddleware: Middleware = (store, { dispatch }) => {
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

    return {
      dispatch(actions) {
        const actionList = flatten(actions as Action)
        dispatch(actions)
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
      },
    }
  } else {
    return {}
  }
}
