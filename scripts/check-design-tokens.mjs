/* global process, console */
// Confere as regras da identidade visual que dá para checar automaticamente.
// Roda junto com `pnpm lint`. As regras completas estão em docs/identidade-visual.md.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// O pnpm roda os scripts a partir da raiz do projeto.
const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const TOKENS = join(SRC, 'styles', 'tokens.css')

const cssRules = [
  { pattern: /#[0-9a-fA-F]{3,8}\b/, message: 'cor fixa: use uma variável de tokens.css' },
  { pattern: /\b(?:rgba?|hsla?)\(/, message: 'cor fixa: use uma variável de tokens.css' },
  { pattern: /font-family:(?!\s*(?:var\(|inherit))/, message: 'fonte fixa: use var(--font-brand) ou var(--font-body)' },
  { pattern: /@import\s+url\(/, message: 'fontes só entram por tokens.css' },
]

const codeRules = [
  { pattern: /(['"`])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\1/, message: 'cor fixa no código: use uma classe ou variável de tokens.css' },
  { pattern: /\b(?:rgba?|hsla?)\(/, message: 'cor fixa no código: use uma classe ou variável de tokens.css' },
  { pattern: /[←-⇿⌀-⏿─-➿\u{1F300}-\u{1FAFF}]/u, message: 'caractere usado como ícone: use um ícone do lucide-react' },
]

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

const problems = []

for (const file of files(SRC)) {
  const isCss = file.endsWith('.css')
  const isCode = /\.(ts|tsx)$/.test(file)
  if ((!isCss && !isCode) || file === TOKENS) continue

  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    // Comentários podem citar cores e caracteres (ex.: "era #66736e").
    const code = line.replace(/\/\*.*?\*\/|\/\/.*$/g, '')
    for (const { pattern, message } of isCss ? cssRules : codeRules) {
      if (pattern.test(code)) problems.push(`${relative(ROOT, file)}:${index + 1}  ${message}`)
    }
    const size = isCss && code.match(/font-size:\s*(\d+(?:\.\d+)?)px/)
    if (size && Number(size[1]) < 12) problems.push(`${relative(ROOT, file)}:${index + 1}  texto menor que 12px`)
  })
}

if (problems.length) {
  console.error(`Identidade visual: ${problems.length} problema(s). Veja docs/identidade-visual.md.\n`)
  console.error(problems.join('\n'))
  process.exitCode = 1
} else {
  console.log('Identidade visual: ok')
}
