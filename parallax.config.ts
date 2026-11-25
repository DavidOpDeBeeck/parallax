import type { Config } from "parallax"
import { code } from "./examples/code/code.ts"
import { design } from "./examples/design/design.tsx"
import { openapi } from "./examples/openapi/openapi.ts"
import { screens } from "./examples/screens/screens.ts"

export default { extensions: [design(), code(), openapi(), screens()] } satisfies Config
