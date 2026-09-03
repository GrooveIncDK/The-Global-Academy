import type { CollectionConfig } from 'payload'

import { createJobCheckoutEndpoint } from '../endpoints/createJobCheckout'

const JOB_TYPES = [
  { label: 'Fixed Term', value: 'fixed_term' },
  { label: 'Freelance', value: 'freelance' },
  { label: 'Full Time', value: 'full_time' },
  { label: 'Internship', value: 'internship' },
  { label: 'Part Time', value: 'part_time' },
  { label: 'Permanent', value: 'permanent' },
  { label: 'Temporary', value: 'temporary' },
]

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'companyName', 'isRemote', 'paymentStatus', 'isPublished'],
  },
  endpoints: [createJobCheckoutEndpoint],
  access: {
    // Only paid + approved listings are public — matches "There are currently
    // no vacancies" showing on the live site whenever the queue is empty.
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return { isPublished: { equals: true } }
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { employer: { equals: req.user.id } }
      return false
    },
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'employer',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'title',
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
      name: 'companyName',
      type: 'text',
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'location',
          type: 'text',
          admin: { width: '50%' },
        },
        {
          name: 'isRemote',
          type: 'checkbox',
          label: 'Remote position',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'jobTypes',
      type: 'select',
      hasMany: true,
      options: JOB_TYPES,
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'applicationUrl',
          type: 'text',
          admin: { width: '50%' },
        },
        {
          name: 'applicationEmail',
          type: 'email',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'expiresAt',
      type: 'date',
    },
    {
      name: 'sdgTargets',
      type: 'relationship',
      relationTo: 'sdg-targets',
      hasMany: true,
    },
    {
      name: 'priceTier',
      type: 'relationship',
      relationTo: 'pricing-tiers',
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      options: ['unpaid', 'pending', 'paid', 'refunded'],
      admin: { position: 'sidebar' },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Flip true once payment clears — see plugins/stripe.ts webhook handler',
      },
    },
  ],
}
