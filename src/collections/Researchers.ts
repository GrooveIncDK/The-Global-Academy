import type { CollectionConfig } from 'payload'

const SOCIAL_ROW = (name: string, label: string) => ({
  name,
  type: 'text' as const,
  admin: { description: label },
})

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
          admin: { description: '"Ms", "Dr", "Prof", etc.', width: '20%' },
        },
        {
          name: 'firstNames',
          type: 'text',
          admin: { width: '30%' },
        },
        {
          name: 'lastName',
          type: 'text',
          admin: { width: '30%' },
        },
        {
          name: 'abbreviations',
          type: 'text',
          admin: {
            description: 'Post-nominal letters, e.g. "PhD FHEA" — free text in the source, quality varies',
            width: '20%',
          },
        },
      ],
    },
    {
      name: 'fullName',
      type: 'text',
      required: true,
      admin: { description: 'Display name used across the directory and as the admin title' },
    },
    {
      name: 'position',
      type: 'text',
      admin: {
        description: 'e.g. "Educational Scientist"',
      },
    },
    {
      name: 'additionalJobTitles',
      type: 'array',
      admin: { description: 'ACF repeater "additional_job_title" — extra roles beyond the primary position' },
      fields: [{ name: 'title', type: 'text' }],
    },
    {
      name: 'institution',
      type: 'relationship',
      relationTo: 'institutions',
    },
    {
      name: 'currentPlaceOfWork',
      type: 'text',
      admin: { description: 'Free-text current employer, used when it differs from the linked institution' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'photoSourceUrl',
      type: 'text',
      admin: {
        readOnly: true,
        description:
          'Original image URL from the WordPress export — filled in by the data migration, left for a ' +
          'later image-import pass to download and attach as the real "photo" upload. Safe to ignore ' +
          'once photo is set.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'countryCode',
          type: 'text',
          admin: {
            description: 'ISO 3166-1 alpha-2, e.g. "CN" — feeds the country filter on the directory',
            width: '34%',
          },
        },
        {
          name: 'additionalCountry1',
          type: 'text',
          admin: {
            description: 'ISO alpha-2 where available — source data has some non-conforming legacy values',
            width: '33%',
          },
        },
        {
          name: 'additionalCountry2',
          type: 'text',
          admin: { width: '33%' },
        },
      ],
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
      type: 'collapsible',
      label: 'Research group (free text)',
      admin: {
        description:
          'The source site captures a research-group name/URL directly on the profile, independent of ' +
          'the structured Research Groups collection (only one group there has a full page). A profile ' +
          'can ALSO be linked from the Research Groups side via that collection\'s "researchers" field.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'researchGroupName', type: 'text', admin: { width: '50%' } },
            { name: 'researchGroupUrl', type: 'text', admin: { width: '50%' } },
          ],
        },
        {
          name: 'additionalResearchGroups',
          type: 'array',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text', admin: { width: '50%' } },
                { name: 'url', type: 'text', admin: { width: '50%' } },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'PhD supervision & citations',
      fields: [
        {
          name: 'citations',
          type: 'textarea',
          admin: { description: 'Free-text list of publications/citations' },
        },
        {
          name: 'phdsSupervised',
          type: 'number',
        },
        {
          type: 'row',
          fields: [
            { name: 'phdSupervisorName', type: 'text', admin: { width: '50%' } },
            {
              name: 'phdCompletionDate',
              type: 'text',
              admin: {
                width: '50%',
                description:
                  'Free text in the source, not a real date — mostly a bare year ("2024") or the ' +
                  'literal status "phd-completed"',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Professional organisations',
      fields: [
        { name: 'professionalOrganisation', type: 'text' },
        {
          name: 'additionalOrganisations',
          type: 'array',
          fields: [{ name: 'name', type: 'text' }],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Social & web links',
      fields: [
        {
          type: 'row',
          fields: [SOCIAL_ROW('facebook', 'Facebook'), SOCIAL_ROW('twitter', 'Twitter/X')],
        },
        {
          type: 'row',
          fields: [SOCIAL_ROW('linkedin', 'LinkedIn'), SOCIAL_ROW('googleScholar', 'Google Scholar')],
        },
        {
          type: 'row',
          fields: [SOCIAL_ROW('researchGate', 'ResearchGate'), SOCIAL_ROW('mendeley', 'Mendeley')],
        },
        {
          type: 'row',
          fields: [SOCIAL_ROW('wikipedia', 'Wikipedia'), SOCIAL_ROW('bluesky', 'Bluesky')],
        },
        {
          type: 'row',
          fields: [SOCIAL_ROW('mastodon', 'Mastodon'), SOCIAL_ROW('threads', 'Threads')],
        },
        {
          name: 'otherSocialLinks',
          type: 'array',
          admin: { description: 'ACF "other_social_1" – "other_social_3"' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'label', type: 'text', admin: { width: '50%' } },
                { name: 'url', type: 'text', admin: { width: '50%' } },
              ],
            },
          ],
        },
        { name: 'videoUrl', type: 'text', admin: { description: 'YouTube/Vimeo profile video' } },
      ],
    },
    {
      name: 'location',
      type: 'text',
      admin: {
        description:
          'ACF Google Map field, raw value — populated on only 2 of ~700 profiles in the source data ' +
          'and both values look like attachment/post IDs rather than coordinates, so this is kept as ' +
          'plain text rather than a geo field until that\'s understood. Safe to ignore for most profiles.',
      },
    },
    {
      name: 'trailblazer',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: '"Trailblazer" spotlight flag — clean Yes/No field in the source (38 Yes / 681 No)',
      },
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
