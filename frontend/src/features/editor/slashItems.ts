import type { Editor } from '@tiptap/react';

export type SlashItem = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  run: (editor: Editor) => void;
};

/** The image item has no command: the editor opens a file picker for it (id 'image'). */
export const SLASH_ITEMS: SlashItem[] = buildItems();

function buildItems(): SlashItem[] {
  return [
    {
      id: 'h2',
      label: 'Heading',
      hint: '##',
      keywords: 'heading title h2',
      run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      label: 'Subheading',
      hint: '###',
      keywords: 'subheading h3',
      run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
    },
    {
      id: 'quote',
      label: 'Pull quote',
      hint: '>',
      keywords: 'quote blockquote pull',
      run: (e) => e.chain().focus().setBlockquote().run(),
    },
    {
      id: 'ul',
      label: 'List',
      hint: '-',
      keywords: 'bullet list unordered',
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ol',
      label: 'Numbered list',
      hint: '1.',
      keywords: 'numbered ordered list',
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'code',
      label: 'Code',
      hint: '```',
      keywords: 'code block',
      run: (e) => e.chain().focus().setCodeBlock().run(),
    },
    {
      id: 'hr',
      label: 'Divider',
      hint: '---',
      keywords: 'divider rule separator hr',
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    {
      id: 'mark',
      label: 'Highlight',
      hint: '==',
      keywords: 'highlight mark',
      run: (e) => e.chain().focus().toggleHighlight().run(),
    },
    {
      id: 'image',
      label: 'Image',
      hint: 'upload',
      keywords: 'image picture photo upload',
      run: () => undefined,
    },
    {
      id: 'p',
      label: 'Text',
      hint: '',
      keywords: 'text paragraph plain',
      run: (e) => e.chain().focus().setParagraph().run(),
    },
  ];
}

export function filterSlash(items: SlashItem[], query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return items;
  return items.filter((i) => i.label.toLowerCase().includes(q) || i.keywords.includes(q));
}
