import type { CollectionConfig } from 'payload'

export const ResearchGroups: CollectionConfig = {
  slug: 'research-groups',
  admin: {
    useAsTitle: 'name',
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
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'focus',
      type: 'richText',
      admin: { description: 'ACF "research_group_focus" — the group\'s mission/overview copy' },
    },
    {
      // Real source data: only one fully-fledged research_groups CPT entry exists ("Low Harm
      // Hedonism"), and it owns the relationship — its "researchers" ACF field is a repeater of
      // researcher post IDs. Individual researcher profiles additionally carry their own free-text
      // group name/URL (see Researchers.researchGroupName) for groups that never got a full page.
      name: 'researchers',
      type: 'relationship',
      relationTo: 'researchers',
      hasMany: true,
    },
    {
      name: 'mainCountry',
      type: 'text',
      admin: { description: 'ISO 3166-1 alpha-2, e.g. "AU"' },
    },
    {
      name: 'sdgGoals',
      type: 'relationship',
      relationTo: 'sdg-goals',
      hasMany: true,
      admin: { description: 'ACF "goals" repeater on the group' },
    },
    {
      name: 'currentResearch',
      type: 'array',
      admin: { description: 'ACF "current_research" repeater' },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        {
          name: 'sdgGoals',
          type: 'relationship',
          relationTo: 'sdg-goals',
          hasMany: true,
        },
        {
          name: 'videos',
          type: 'array',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'url', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'video',
      type: 'text',
      admin: { description: 'ACF "research_group_video" — a single overview video for the group' },
    },
    {
      name: 'universityLogo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'universityLogoSourceUrl',
      type: 'text',
      admin: { readOnly: true, description: 'Original URL from WordPress — see Researchers.photoSourceUrl' },
    },
    {
      name: 'groupPhoto',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'groupPhotoSourceUrl',
      type: 'text',
      admin: { readOnly: true, description: 'Original URL from WordPress — see Researchers.photoSourceUrl' },
    },
    {
      name: 'groupMap',
      type: 'text',
      admin: { description: 'ACF Google Map field, raw value — rarely populated, kept as plain text (see Researchers.location)' },
    },
    {
      type: 'collapsible',
      label: 'Social links',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'facebook', type: 'text', admin: { width: '33%' } },
            { name: 'twitter', type: 'text', admin: { width: '33%' } },
            { name: 'linkedin', type: 'text', admin: { width: '34%' } },
          ],
        },
        { name: 'wikipedia', type: 'text' },
      ],
    },
  ],
}
