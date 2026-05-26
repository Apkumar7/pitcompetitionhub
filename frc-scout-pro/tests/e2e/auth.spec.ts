import { test, expect } from '@playwright/test'

// ── Auth E2E Tests ─────────────────────────────────────────────────────────
// These tests verify the login/logout flow against the real Next.js app.
// They do NOT mock Supabase — they hit the actual auth endpoints.
//
// To run: npm run test:e2e
// Requires: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set,
//           and a running prod build (npm run build && npm run start) or dev server.
//
// Test credentials are expected in env: E2E_TEST_EMAIL / E2E_TEST_PASSWORD
// If not set, the login tests are skipped.
// ──────────────────────────────────────────────────────────────────────────

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''
const HAS_CREDS = TEST_EMAIL !== '' && TEST_PASSWORD !== ''

test.describe('Auth flow', () => {
  test('login page loads and has required fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Scout Pro/i)
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('notreal@example.com')
    await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword123')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Expect an error message to appear (Supabase returns invalid credentials)
    await expect(page.getByRole('alert').or(page.getByText(/invalid/i))).toBeVisible({ timeout: 8000 })
  })

  test('signup page loads with all required fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('textbox', { name: /team number/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible()
  })

  test.skip(!HAS_CREDS, 'Skipped: E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set')

  test('full login → dashboard → logout', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
    await page.getByRole('textbox', { name: /password/i }).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByText(/Scout Pro/i)).toBeVisible()

    // Logout via profile menu
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})

test.describe('Route protection', () => {
  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('unauthenticated user is redirected from teams to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/teams')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
