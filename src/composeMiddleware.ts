import { Middleware } from '@dwalter/spider-store'
import { List, flatten } from './utils'

export function composeMiddleware(
  ...middlewares: List<Middleware>
): Middleware {
  return (store, api) =>
    flatten<Middleware>(...middlewares).reduceRight(
      (acc, middleware) => Object.assign(acc, middleware(store, acc)),
      api,
    )
}
