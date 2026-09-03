import type { CollectionConfig } from 'payload'

// The live site's single "Gallery" page (theglobalacademy.ac/gallery/) is a
// simple WordPress page with a heading, then a series of workshop/event
// write-ups, each followed by a WP gallery-block photo grid. There's no
// custom post type behind it — this collection is the structured equivalent,
// one document per event, grouped for display by the free-text `category`
// field (matches the page's "2030 SDGs simulation workshops" section title).
export const GalleryEvents: CollectionConfig = {
  slug: 'gallery-events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'sortOrder'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Used as a stable id/anchor for this event on the gallery page' },
    },
    {
      name: 'category',
      type: 'text',
      admin: { description: 'Section heading this event is grouped under, e.g. "2030 SDGs simulation workshops"' },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'photos',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        {
          name: 'sourceUrl',
          type: 'text',
          admin: { readOnly: true, description: 'Original image URL from WordPress — see Researchers.photoSourceUrl' },
        },
        { name: 'caption', type: 'text', admin: { description: 'Used as the image alt text' } },
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
