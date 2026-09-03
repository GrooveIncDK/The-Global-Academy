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
      name: 'motto',
      type: 'text',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'logoSourceUrl',
      type: 'text',
      admin: { readOnly: true, description: 'Original logo URL from WordPress — see Researchers.photoSourceUrl' },
    },
    {
      name: 'location',
      type: 'text',
      admin: { description: 'City/country as free text — source is a plain ACF text field, not a map' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'websiteUrl',
          type: 'text',
          admin: { width: '50%', description: 'ACF "url" — the institution\'s own homepage' },
        },
        {
          name: 'listingsUrl',
          type: 'text',
          admin: { width: '50%', description: 'Link to this institution\'s jobs/listings on the source site' },
        },
      ],
    },
    {
      name: 'rootUrl',
      type: 'text',
    },
    {
      name: 'awards',
      type: 'textarea',
    },
    {
      name: 'rankings',
      type: 'textarea',
    },
    {
      name: 'keyFacts',
      type: 'richText',
      admin: { description: 'ACF "key_facts"' },
    },
    {
      name: 'mainText',
      type: 'richText',
      admin: { description: 'ACF "institution_main_text" — the institution\'s profile-page body copy' },
    },
    {
      name: 'searchShortcode',
      type: 'text',
      admin: {
        description:
          'Legacy WP shortcode embedded on the institution page ("search_shortcode") — kept for reference ' +
          'only, has no equivalent in the headless frontend',
      },
    },
    {
      name: 'jobListingCurrency',
      type: 'text',
      admin: { description: 'Currency used when this institution posts paid job listings, e.g. "GBP"' },
    },
  ],
}
