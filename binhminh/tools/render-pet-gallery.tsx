// Renders every pet species in every mood to a static HTML gallery for visual review.
// Usage (from the repo root):
//   pnpm exec esbuild binhminh/tools/render-pet-gallery.tsx --bundle --platform=node \
//     --format=cjs --jsx=automatic --outfile=<tmp>/gallery.cjs
//   node <tmp>/gallery.cjs <out.html>
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { PetSprite } from '../../src/renderer/src/components/binhminh-corner/PetSprite'
import { PET_SPECIES } from '../../src/renderer/src/components/binhminh-corner/pet-species'
import type { PetMood } from '../../src/renderer/src/components/binhminh-corner/corner-logic'

const moods: PetMood[] = ['idle', 'work', 'alert', 'happy', 'worried', 'tired', 'sleep']
const css = readFileSync(join(process.cwd(), 'src/renderer/src/assets/binhminh-corner.css'), 'utf8')
const rows = PET_SPECIES.map(
  (species) =>
    `<tr><th>${species.label}</th>${moods
      .map(
        (mood) =>
          `<td>${renderToStaticMarkup(
            <PetSprite species={species} mood={mood} speed={1} petted={false} paused size={96} />
          )}</td>`
      )
      .join('')}</tr>`
).join('')
const html = `<!doctype html><meta charset="utf-8"><style>
:root{--muted-foreground:#9a9aa3}
body{background:#141416;color:#ddd;font:13px system-ui;margin:12px}
td,th{padding:4px 6px;text-align:center}
${css}
</style><table><tr><th></th>${moods.map((m) => `<th>${m}</th>`).join('')}</tr>${rows}</table>`
writeFileSync(process.argv[2]!, html)
