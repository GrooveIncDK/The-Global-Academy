import type { CollectionConfig } from 'payload'

export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  admin: {
    useAsTitle: 'fullName',
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'fullName', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    { name: 'bio', type: 'richText' },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'platform',
              type: 'select',
              options: ['twitter', 'linkedin', 'facebook', 'youtube', 'mastodon', 'bluesky'],
              admin: { width: '40%' },
            },
            {
              name: 'url',
              type: 'text',
              admin: { width: '60%' },
            },
          ],
        },
      ],
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
