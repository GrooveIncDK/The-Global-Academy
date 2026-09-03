/** Minimal, lossy round-trip between a Lexical richText value and plain text —
 * good enough for a simple dashboard textarea. Paragraphs become blank-line-
 * separated text; anything beyond plain paragraphs (bold, links, lists) is
 * flattened away. Full-fidelity editing still happens in /admin. */

type LexicalTextNode = { type: 'text'; text: string }
type LexicalParagraph = { type: 'paragraph'; children: LexicalTextNode[] }
type LexicalDoc = { root: { type: 'root'; children: LexicalParagraph[] } } | null | undefined

export function lexicalToPlainText(value: LexicalDoc): string {
  if (!value?.root?.children) return ''
  return value.root.children
    .map((node) =>
      (node.children || [])
        .map((child) => ('text' in child ? child.text : ''))
        .join(''),
    )
    .join('\n\n')
}

export function plainTextToLexical(text: string) {
  const paragraphs = (text || '')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\r/g, '').trim())
    .filter(Boolean)

  const children =
    paragraphs.length > 0
      ? paragraphs.map((t) => ({
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', version: 1, text: t, format: 0, detail: 0, mode: 'normal', style: '' }],
          direction: 'ltr' as const,
          format: '',
          indent: 0,
        }))
      : [{ type: 'paragraph', version: 1, children: [], direction: 'ltr' as const, format: '', indent: 0 }]

  return {
    root: {
      type: 'root',
      version: 1,
      children,
      direction: 'ltr' as const,
      format: '',
      indent: 0,
    },
  }
}
