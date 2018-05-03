import { getContext, enhanceError } from '../utils'
import { defaultOptions } from '../options'

const isRegExp = input =>
  Object.prototype.toString.call(input) === '[object RegExp]'

const expandSearchExpr = expr => {
  if (isRegExp(expr)) return { text: null, regexp: expr.toString() }
  if (typeof expr === 'string') return { text: expr, regexp: null }
  return { text: null, regexp: null }
}

async function toMatchElement(
  instance,
  selector,
  { text: searchExpr, ...options } = {},
) {
  options = defaultOptions(options)

  const { page, handle } = await getContext(instance, () => document)

  const { text, regexp } = expandSearchExpr(searchExpr)

  const getElement = (handle, selector, text, regexp) => {
    const elements = handle.querySelectorAll(selector)
    if (regexp !== null) {
      const [, pattern, flags] = regexp.match(/\/(.*)\/(.*)?/)
      return [...elements].find(({ textContent }) =>
        textContent
          .replace(/\s+/g, ' ')
          .trim()
          .match(new RegExp(pattern, flags)),
      )
    }
    if (text !== null) {
      return [...elements].find(({ textContent }) =>
        textContent
          .replace(/\s+/g, ' ')
          .trim()
          .includes(text),
      )
    }
    return elements[0]
  }

  try {
    await page.waitForFunction(
      getElement,
      options,
      handle,
      selector,
      text,
      regexp,
    )
  } catch (error) {
    throw enhanceError(
      error,
      `Element ${selector}${
        text !== null || regexp !== null ? ` (text: "${text || regexp}") ` : ' '
      }not found`,
    )
  }

  const jsHandle = await page.evaluateHandle(
    getElement,
    handle,
    selector,
    text,
    regexp,
  )
  return jsHandle.asElement()
}

export default toMatchElement
