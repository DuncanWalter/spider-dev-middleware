import { composeMiddleware } from './composeMiddleware'
import { persistMiddleware } from './persistMiddleware'
import { devToolsMiddleware } from './devToolsMiddleware'
import { freezerMiddleware } from './freezerMiddleware'

function isNameCrushed() {
  return isNameCrushed.name !== 'isNameCrushed'
}

if (isNameCrushed()) {
  console.warn('using dev middleware in minified code.')
}

export { composeMiddleware }

export const createDevMiddleware = () =>
  composeMiddleware(persistMiddleware, devToolsMiddleware, freezerMiddleware)
