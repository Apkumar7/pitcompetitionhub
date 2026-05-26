import { describe, it, expect } from 'vitest'
import type { UserRole } from '@/types/database.types'

// Permission matrix for FRC Scout Pro.
// These rules are enforced server-side via RLS; this test suite documents
// and verifies the intended permission model in pure logic form.

type Permission =
  | 'view_scouting'
  | 'edit_scouting'
  | 'view_analytics'
  | 'edit_picklist'
  | 'admin_panel'
  | 'delete_entries'
  | 'manage_users'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['view_scouting', 'edit_scouting', 'view_analytics', 'edit_picklist', 'admin_panel', 'delete_entries', 'manage_users'],
  lead: ['view_scouting', 'edit_scouting', 'view_analytics', 'edit_picklist'],
  scout: ['view_scouting', 'edit_scouting'],
  viewer: ['view_scouting'],
}

function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

describe('Permission matrix — admin', () => {
  it('admin can access admin panel', () => expect(can('admin', 'admin_panel')).toBe(true))
  it('admin can manage users', () => expect(can('admin', 'manage_users')).toBe(true))
  it('admin can delete entries', () => expect(can('admin', 'delete_entries')).toBe(true))
  it('admin can view and edit scouting', () => {
    expect(can('admin', 'view_scouting')).toBe(true)
    expect(can('admin', 'edit_scouting')).toBe(true)
  })
})

describe('Permission matrix — lead', () => {
  it('lead can edit picklist', () => expect(can('lead', 'edit_picklist')).toBe(true))
  it('lead can view analytics', () => expect(can('lead', 'view_analytics')).toBe(true))
  it('lead cannot access admin panel', () => expect(can('lead', 'admin_panel')).toBe(false))
  it('lead cannot manage users', () => expect(can('lead', 'manage_users')).toBe(false))
  it('lead cannot delete entries', () => expect(can('lead', 'delete_entries')).toBe(false))
})

describe('Permission matrix — scout', () => {
  it('scout can view and edit scouting', () => {
    expect(can('scout', 'view_scouting')).toBe(true)
    expect(can('scout', 'edit_scouting')).toBe(true)
  })
  it('scout cannot edit picklist', () => expect(can('scout', 'edit_picklist')).toBe(false))
  it('scout cannot access analytics', () => expect(can('scout', 'view_analytics')).toBe(false))
  it('scout cannot access admin panel', () => expect(can('scout', 'admin_panel')).toBe(false))
})

describe('Permission matrix — viewer', () => {
  it('viewer can view scouting', () => expect(can('viewer', 'view_scouting')).toBe(true))
  it('viewer cannot edit scouting', () => expect(can('viewer', 'edit_scouting')).toBe(false))
  it('viewer cannot view analytics', () => expect(can('viewer', 'view_analytics')).toBe(false))
  it('viewer is fully read-only', () => {
    const writePerms: Permission[] = ['edit_scouting', 'edit_picklist', 'admin_panel', 'delete_entries', 'manage_users']
    writePerms.forEach(p => expect(can('viewer', p)).toBe(false))
  })
})

describe('Role hierarchy', () => {
  it('admin has all permissions that lead has', () => {
    ROLE_PERMISSIONS.lead.forEach(p => {
      expect(can('admin', p)).toBe(true)
    })
  })

  it('lead has all permissions that scout has', () => {
    ROLE_PERMISSIONS.scout.forEach(p => {
      expect(can('lead', p)).toBe(true)
    })
  })

  it('scout has all permissions that viewer has', () => {
    ROLE_PERMISSIONS.viewer.forEach(p => {
      expect(can('scout', p)).toBe(true)
    })
  })
})
