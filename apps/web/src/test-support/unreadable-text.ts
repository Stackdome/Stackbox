const TRANSPARENT = /^transparent$|rgba\(0, 0, 0, 0\)|\/ 0\)$/

function groundOf(element: Element): string {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const background = getComputedStyle(node).backgroundColor
    if (!TRANSPARENT.test(background)) return background
  }
  return getComputedStyle(document.body).backgroundColor
}

function hasOwnText(element: Element): boolean {
  return [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
}

export function findUnreadableText(root: ParentNode = document.body): Element[] {
  return [...root.querySelectorAll('*')].filter((element) => {
    const style = getComputedStyle(element)
    const visible = element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.opacity !== '0'
    return visible && hasOwnText(element) && style.color === groundOf(element)
  })
}
