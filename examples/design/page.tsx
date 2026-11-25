/** @jsxImportSource preact */
import type { ComponentChildren } from "preact"
import { render } from "preact-render-to-string"
import { styleCss } from "./style.ts"

export function renderPage(css: string, body: ComponentChildren): string {
  return render(
    <>
      <style dangerouslySetInnerHTML={{ __html: `${styleCss}${css}` }} />
      {body}
    </>,
  )
}
