import type { CollectionConfig } from 'payload'

export const Researchers: CollectionConfig = {
  slug: 'researchers',
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'institution', 'countryCode', 'isPublished'],
  },
  access: {
    // Public researcher directory — matches the live site's open /researchers/ listing.
    read: ({ req }) => {
      if (req.user) return true // logged-in users (incl. the owning researcher) see unpublished drafts too
      return { isPublished: { equals: true } }
    },
    // Researchers can only edit their own profile; admins can edit any.
    update: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { user: { equals: req.user.id } }
      return false
    },
    create: ({ req }) => Boolean(req.user),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'The account that owns/can edit this profile (self-registration flow)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'e.g. "ms-xiaoxiao-qian" — combined with institution slug for the profile URL',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: { description: '"Ms", "Dr", "Prof", etc.', width: '30%' },
        },
        {
          name: 'fullName',
          type: 'text',
          required: true,
          admin: { width: '70%' },
        },
      ],
    },
    {
      name: 'position',
      type: 'text',
      admin: {
        description: 'e.g. "Educational Scientist"',
      },
    },
    {
      name: 'institution',
      type: 'relationship',
      relationTo: 'institutions',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'countryCode',
      type: 'text',
      admin: {
        description: 'ISO 3166-1 alpha-2, e.g. "CN" — feeds the country filter on the directory',
      },
    },
    {
      name: 'languages',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'researchFocus',
      type: 'richText',
    },
    {
      name: 'researchGroups',
      type: 'relationship',
      relationTo: 'research-groups',
      hasMany: true,
    },
    {
      name: 'sdgTargets',
      type: 'relationship',
      relationTo: 'sdg-targets',
      hasMany: true,
      admin: {
        description: 'Which UN SDG targets this researcher\'s work maps to — feeds the goal filter and badges',
      },
    },
    {
      name: 'projects',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Unpublish instead of delete to preserve edit history',
      },
    },
  ],
}
