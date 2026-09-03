import type { CollectionConfig } from 'payload'

// Editable copies of the mostly-static pages (About, Contact) — optional; skip
// this collection if you'd rather hardcode those in the frontend.
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richText' },
  ],
}
