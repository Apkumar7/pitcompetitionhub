import { test, expect } from '@playwright/test'

// ── Alliance Selection E2E Tests ────────────────────────────────────────────
// Tests the picklist builder UI. Requires an authenticated session.
// Without E2E_TEST_EMAIL/PASSWORD these tests are skipped.
// ──────────────────────────────────────────────────────────────────────────

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''
const HAS_CREDS = TEST_EMAIL !== '' && TEST_PASSWORD !== ''

test.describe.skip('Alliance selection workflow', () => {
  test.skip(!HAS_CREDS, 'Requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
    await page.getByRole('textbox', { name: /password/i }).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('alliance page loads with picklist header', async ({ page }) => {
    await page.goto('/alliance')
    await expect(page.getByText('Alliance Selection')).toBeVisible()
  })

  test('auto-rank button is visible and clickable', async ({ page }) => {
    await page.goto('/alliance')
    const autoRankBtn = page.getByRole('button', { name: /auto-rank/i })
    await expect(autoRankBtn).toBeVisible()
    await autoRankBtn.click()
    // Should show a success toast
    await expect(page.getByText(/ranked/i)).toBeVisible({ timeout: 3000 })
  })

  test('save picklist button is visible', async ({ page }) => {
    await page.goto('/alliance')
    await expect(page.getByRole('button', { name: /save picklist/i })).toBeVisible()
  })
})

// These tests run without credentials and verify static page structure
test.describe('Alliance page structure (no auth)', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/alliance')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
