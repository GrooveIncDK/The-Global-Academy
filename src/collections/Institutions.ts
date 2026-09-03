import type { CollectionConfig } from 'payload'

export const Institutions: CollectionConfig = {
  slug: 'institutions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'websiteUrl'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Used in researcher profile URLs, e.g. /humboldt-universitity-zu-berlin/ms-xiaoxiao-qian/',
      },
    },
    {
      name: 'websiteUrl',
      type: 'text',
    },
  ],
}
