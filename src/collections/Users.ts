import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  auth: true,
  access: {
    // Public self-registration (POST /api/users) — the frontend's /register
    // page relies on this being open.
    create: () => true,
    // Logged-in users can only see their own account; admins see everyone.
    // (This is separate from the auth check itself — payload.auth() always
    // works regardless of collection read access.)
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    // Users can only edit their own account; admins can edit any.
    update: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    // Email + password added by default via auth: true — this is what backs
    // the live site's /register, /log-in/, and /reset-password/ flows.
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'researcher',
      options: ['admin', 'researcher', 'employer'],
      access: {
        // Only admins can set or change roles — a self-registering researcher
        // can't promote themselves to admin, at creation or afterwards. When
        // this returns false Payload silently falls back to defaultValue
        // ('researcher') rather than erroring, so public registration still
        // works — it just can never carry a role of its own choosing.
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
  ],
  versions: false,
}
