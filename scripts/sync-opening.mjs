// Copies shared/project-specifics.md into every skill, before its first `## ` section.
// Plugins install separately, so each skill carries its own copy; --check fails on any drift.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const HEADING = '## Project specifics first'
const block = readFileSync('shared/project-specifics.md', 'utf8').trim()
const isCheck = process.argv.includes('--check')

const skillFiles = readdirSync('plugins').flatMap((plugin) =>
  readdirSync(join('plugins', plugin, 'skills')).map((skill) =>
    join('plugins', plugin, 'skills', skill, 'SKILL.md')
  )
)

function withBlock(content) {
  const start = content.indexOf(`\n${HEADING}\n`)
  if (start !== -1) {
    const next = content.indexOf('\n## ', start + HEADING.length + 2)
    const end = next === -1 ? content.length : next
    return `${content.slice(0, start)}\n${block}\n${content.slice(end)}`
  }
  const firstSection = content.indexOf('\n## ')
  return `${content.slice(0, firstSection)}\n${block}\n${content.slice(firstSection)}`
}

const drifted = skillFiles.filter((file) => {
  const content = readFileSync(file, 'utf8')
  const updated = withBlock(content)
  if (updated !== content && !isCheck) writeFileSync(file, updated)
  return updated !== content
})

if (isCheck && drifted.length > 0) {
  console.error(`Opening section missing or out of date in:\n${drifted.join('\n')}`)
  console.error('Run `pnpm sync:opening`.')
  process.exit(1)
}
console.log(
  isCheck
    ? `Opening section current in ${skillFiles.length} skills.`
    : `Updated ${drifted.length} of ${skillFiles.length} skills.`
)
