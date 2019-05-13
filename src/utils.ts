import { utils, Reducer, RawStore } from '@dwalter/spider-store'

export interface List<T> extends Array<T | T[]> {}

function innerFlatten<T>(args: T | List<T>, result: T[]): T[] {
  if (Array.isArray(args)) {
    for (let arg of args) {
      innerFlatten(arg, result)
    }
  } else {
    result.push(args)
  }
  return result
}

interface Flatten {
  <T>(...args: List<T>): T[]
  <T>(args: T | List<T>): T[]
}

export const flatten: Flatten = <T>(...args: List<T>): T[] => {
  return innerFlatten(args, [])
}

export function injectState(
  store: RawStore,
  state: { [props: string]: unknown },
) {
  const marks = new utils.SliceSet()
  store.slices.forEach((slice: any, reducer: Reducer<any>) => {
    slice.injectState(state[reducer.name], marks)
  })
  utils.propagateSlices(marks)
}

export function aggregateState(store: RawStore) {
  const state: { [props: string]: unknown } = {}
  store.slices.forEach((slice: any, reducer: Reducer<any>) => {
    if (state.hasOwnProperty(reducer.name)) {
      console.warn('TODO:')
    }
    state[reducer.name] = store.resolve(slice)
  })
  return state
}
