import { test, expect } from '@playwright/test';

test.describe('Governance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should_render_dashboard_heading_when_page_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Governance Dashboard' })).toBeVisible();
  });

  test('should_display_property_registration_stats_when_dashboard_loads', async ({ page }) => {
    await expect(page.getByText('Total Applications')).toBeVisible();
    await expect(page.getByText('Remote Adoption')).toBeVisible();
    // Use locator scoped to stat cards to avoid matching trends heading
    await expect(page.locator('.stat-card').filter({ hasText: 'Avg Processing' })).toBeVisible();
    await expect(page.getByText('AI Verification Accuracy')).toBeVisible();
  });

  test('should_display_cost_auditing_stats_when_dashboard_loads', async ({ page }) => {
    // Scope to the cost auditing section to avoid matching sidebar/other sections
    const section = page.locator('section').filter({ has: page.getByText('Infrastructure Cost Auditing') });
    await expect(section.getByText('Total Estimates')).toBeVisible();
    await expect(section.getByText('Flagged Estimates')).toBeVisible();
    await expect(section.getByText('Savings This Month')).toBeVisible();
    await expect(section.getByText('Fraud Detection Rate')).toBeVisible();
  });

  test('should_show_stat_values_when_data_loaded', async ({ page }) => {
    await expect(page.getByText('1,247')).toBeVisible();
    await expect(page.locator('.stat-card').filter({ hasText: '78%' })).toBeVisible();
    await expect(page.getByText('6.2 days')).toBeVisible();
    await expect(page.getByText('96.3%')).toBeVisible();
  });

  test('should_display_cost_auditing_values_when_data_loaded', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.getByText('Infrastructure Cost Auditing') });
    await expect(section.locator('.stat-card').filter({ hasText: '342' })).toBeVisible();
    await expect(section.locator('.stat-card').filter({ hasText: '47' })).toBeVisible();
    await expect(section.locator('.stat-card').filter({ hasText: '8.4 Cr' })).toBeVisible();
    await expect(section.locator('.stat-card').filter({ hasText: '83%' })).toBeVisible();
  });

  test('should_render_6_month_trends_section_when_page_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '6-Month Trends' })).toBeVisible();
    await expect(page.getByText('Digital Registrations Growth')).toBeVisible();
    await expect(page.getByText('Cumulative Savings (₹ Crore)')).toBeVisible();
  });

  test('should_render_trend_bars_when_chart_data_present', async ({ page }) => {
    const monthLabels = page.getByText('Jan', { exact: true });
    await expect(monthLabels.first()).toBeVisible();
  });

  test('should_show_quick_actions_when_dashboard_renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Property Registration/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Submit Cost Estimate/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Review Flagged Estimates/ })).toBeVisible();
  });

  test('should_navigate_to_property_new_when_quick_action_clicked', async ({ page }) => {
    await page.getByRole('link', { name: /New Property Registration/ }).click();
    await expect(page).toHaveURL('/property/new');
    await expect(page.getByRole('heading', { name: 'New Property Registration' })).toBeVisible();
  });

  test('should_navigate_to_auditing_when_quick_action_clicked', async ({ page }) => {
    await page.getByRole('link', { name: /Submit Cost Estimate/ }).click();
    await expect(page).toHaveURL('/auditing/new');
  });

  test('should_navigate_to_property_list_when_view_all_clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'View All Applications' }).click();
    await expect(page).toHaveURL('/property');
  });

  test('should_navigate_to_auditing_list_when_view_all_clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'View All Estimates' }).click();
    await expect(page).toHaveURL('/auditing');
  });
});
