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

// Source: ACF "sector" field on job_listing — an academic-subject facet, distinct from the
// job_listing_category taxonomy (which is actually used for SDG goal tagging — see sdgGoals below).
const SECTORS = [
  'Agriculture And Veterinary Sciences',
  'Art And Design',
  'Arts And Humanities',
  'Biology',
  'Business And Management',
  'Chemistry',
  'Clinical',
  'Computer Science',
  'Economics And Finance',
  'Education',
  'Engineering',
  'Food Sciences',
  'Geography And Environmental Sciences',
  'Health And Medical',
  'Law',
  'Marine Sciences',
  'Materials Sciences',
  'Mathematics',
  'Physics',
  'Social Sciences',
  'Sports Sciences',
  'Statistics',
].map((label) => ({ label, value: label.toLowerCase().replace(/\s+/g, '_') }))

// Source: ACF "academic_staff__faculty_roles" — free multi-select of role labels
const FACULTY_ROLES = [
  'Research Assistant',
  'Research Associate/Fellow',
  'Postdoc',
  'Lecturer',
  'Senior Lecturer',
  'Associate/Assistant Professor',
  'Professor',
  'Head Of School/Dept/Research Centre',
  'Engineer',
  'Phd Studentship',
].map((label) => ({ label, value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_') }))

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
          name: 'employerType',
          type: 'text',
          admin: {
            width: '50%',
            description: 'ACF "employer_type" — almost always "Universities" in the source data',
          },
        },
        {
          name: 'employerPage',
          type: 'text',
          admin: { width: '50%', description: 'Link to the employer\'s institution/profile page' },
        },
      ],
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
      name: 'academicStaffFacultyRoles',
      type: 'select',
      hasMany: true,
      options: FACULTY_ROLES,
      admin: { description: 'ACF "academic_staff__faculty_roles"' },
    },
    {
      name: 'sector',
      type: 'select',
      hasMany: true,
      options: SECTORS,
      admin: { description: 'Academic subject area(s) — ACF "sector"' },
    },
    {
      name: 'sdgGoals',
      type: 'relationship',
      relationTo: 'sdg-goals',
      hasMany: true,
      admin: {
        description:
          'From the job_listing_category taxonomy, which on this site is used for SDG goal tagging ' +
          '("Goal 01 No Poverty", etc.), not a generic job category',
      },
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
      name: 'jobReference',
      type: 'text',
      admin: { description: 'Employer\'s own internal reference/req ID for the vacancy' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'salaryText',
          type: 'text',
          admin: { width: '40%', description: 'WP Job Manager "_job_salary" — free text, e.g. "39,105 - 46,485"' },
        },
        {
          name: 'salaryCurrency',
          type: 'text',
          admin: { width: '30%', description: 'e.g. "UKP", "AUD", "USD" — legacy codes, not always ISO 4217' },
        },
        {
          name: 'salaryUnit',
          type: 'text',
          admin: { width: '30%', description: 'e.g. "YEAR"' },
        },
      ],
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'WP Job Manager "_job_expires"' },
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
