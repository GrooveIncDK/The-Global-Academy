import type { CollectionConfig } from 'payload'

// Static UN reference data — 17 rows, seeded once via src/seed/sdgs.ts rather
// than something editors create by hand. Kept as a real collection (rather
// than a Payload "Global") so researchers/jobs can hold a proper relationship
// to individual targets underneath each goal.
export const SDGGoals: CollectionConfig = {
  slug: 'sdg-goals',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['number', 'title'],
    description: 'Seed data — the 17 UN Sustainable Development Goals. See src/seed/sdgs.ts.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'number',
      type: 'number',
      required: true,
      unique: true,
      admin: {
        description: '1 through 17',
      },
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'e.g. "goal-04" — matches the country/goal filter values on the live site',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'colorHex',
      type: 'text',
      admin: {
        description: 'Official SDG color, used for the goal-dot badges',
      },
    },
  ],
}
