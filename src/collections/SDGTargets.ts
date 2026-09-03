import type { CollectionConfig } from 'payload'

export const SDGTargets: CollectionConfig = {
  slug: 'sdg-targets',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['code', 'title', 'goal'],
    description: 'Seed data — full UN target list. See src/seed/sdgs.ts.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'e.g. "4.1" or "4.A" — targets run past the numbered ones into lettered sub-targets',
      },
    },
    {
      name: 'goal',
      type: 'relationship',
      relationTo: 'sdg-goals',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Full UN target text',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
}
