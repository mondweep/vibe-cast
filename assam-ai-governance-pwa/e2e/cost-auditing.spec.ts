import { test, expect } from '@playwright/test';

test.describe('Cost Auditing - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auditing');
  });

  test('should_render_heading_when_navigating_to_auditing', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Infrastructure Cost Auditing' })).toBeVisible();
    await expect(page.getByText('AI-powered estimate validation for Assam PWD road projects')).toBeVisible();
  });

  test('should_display_summary_cards_when_page_loads', async ({ page }) => {
    await expect(page.locator('.ca-summary-card').filter({ hasText: 'Total Estimates' })).toBeVisible();
    await expect(page.locator('.ca-summary-card').filter({ hasText: 'Green (Auto-Approved)' })).toBeVisible();
    await expect(page.locator('.ca-summary-card').filter({ hasText: 'Yellow (Review)' })).toBeVisible();
    await expect(page.locator('.ca-summary-card').filter({ hasText: 'Red (Investigation)' })).toBeVisible();
    await expect(page.locator('.ca-summary-card').filter({ hasText: 'Potential Savings' })).toBeVisible();
  });

  test('should_show_risk_legend_when_page_renders', async ({ page }) => {
    await expect(page.getByText('Risk Level Thresholds')).toBeVisible();
    await expect(page.getByText('< 1.2x baseline')).toBeVisible();
    await expect(page.getByText('1.2x - 1.5x baseline')).toBeVisible();
    await expect(page.getByText('> 1.5x baseline')).toBeVisible();
  });

  test('should_display_estimates_table_when_data_loaded', async ({ page }) => {
    const table = page.getByRole('table', { name: /cost estimates for review/i });
    await expect(table).toBeVisible();
  });

  test('should_show_all_project_names_when_estimates_loaded', async ({ page }) => {
    await expect(page.getByText('NH-37 Jorhat-Golaghat Road Widening')).toBeVisible();
    await expect(page.getByText('Silchar Municipal Road Resurfacing')).toBeVisible();
    await expect(page.getByText('Tezpur-Bhalukpong Highway Extension')).toBeVisible();
  });

  test('should_display_cost_ratios_when_estimates_loaded', async ({ page }) => {
    const table = page.getByRole('table', { name: /cost estimates for review/i });
    await expect(table.getByText('1.78x')).toBeVisible();
    await expect(table.getByText('1.14x')).toBeVisible();
    await expect(table.getByText('1.27x')).toBeVisible();
  });

  test('should_show_engineer_names_when_estimates_loaded', async ({ page }) => {
    await expect(page.getByText('Er. Ramesh Choudhury')).toBeVisible();
    await expect(page.getByText('Er. Lakshmi Das')).toBeVisible();
    await expect(page.getByText('Er. Manoj Barua')).toBeVisible();
  });

  test('should_filter_by_risk_level_when_filter_changed', async ({ page }) => {
    const filter = page.getByLabel(/filter by risk/i);
    await expect(filter).toBeVisible();

    // Filter to Red only
    await filter.selectOption('red');
    await expect(page.getByText('NH-37 Jorhat-Golaghat Road Widening')).toBeVisible();
    await expect(page.getByText('Silchar Municipal Road Resurfacing')).not.toBeVisible();
    await expect(page.getByText('Tezpur-Bhalukpong Highway Extension')).not.toBeVisible();

    // Filter to Green only
    await filter.selectOption('green');
    await expect(page.getByText('Silchar Municipal Road Resurfacing')).toBeVisible();
    await expect(page.getByText('NH-37 Jorhat-Golaghat Road Widening')).not.toBeVisible();

    // Reset to all
    await filter.selectOption('all');
    await expect(page.getByText('NH-37 Jorhat-Golaghat Road Widening')).toBeVisible();
    await expect(page.getByText('Silchar Municipal Road Resurfacing')).toBeVisible();
    await expect(page.getByText('Tezpur-Bhalukpong Highway Extension')).toBeVisible();
  });

  test('should_display_historical_projects_section_when_page_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Historical Cost Reference (Baseline Data)' })).toBeVisible();
    const histTable = page.getByRole('table', { name: /historical road project costs/i });
    await expect(histTable).toBeVisible();
  });

  test('should_navigate_to_detail_when_details_clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'Details' }).first().click();
    await expect(page).toHaveURL(/\/auditing\/est-/);
  });

  test('should_show_submit_estimate_button_when_page_renders', async ({ page }) => {
    const btn = page.getByRole('link', { name: /Submit Estimate/i });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/auditing/new');
  });
});

test.describe('Cost Auditing - Estimate Detail (Red Risk)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auditing/est-001');
  });

  test('should_display_project_name_when_detail_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'NH-37 Jorhat-Golaghat Road Widening' })).toBeVisible();
  });

  test('should_show_red_risk_badge_when_high_risk_estimate', async ({ page }) => {
    await expect(page.getByText('Red Risk')).toBeVisible();
  });

  test('should_display_ai_analysis_alert_when_detail_loads', async ({ page }) => {
    await expect(page.getByText('AI Analysis Result')).toBeVisible();
    await expect(page.locator('.ca-alert')).toContainText('28/100');
    await expect(page.locator('.ca-alert')).toContainText('significantly above the adjusted baseline');
  });

  test('should_show_cost_comparison_when_detail_renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Cost Comparison' })).toBeVisible();
    // Use scoped locator for the cost comparison section
    const section = page.locator('section').filter({ has: page.getByText('Cost Comparison') });
    await expect(section.getByText('1.78x')).toBeVisible();
    await expect(section.getByText(/78% above baseline/)).toBeVisible();
  });

  test('should_display_material_breakdown_table_when_detail_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Material Cost Breakdown' })).toBeVisible();
    await expect(page.getByText('Asphalt (Grade A)')).toBeVisible();
    await expect(page.getByText('Concrete (M40)')).toBeVisible();
    await expect(page.getByText('Steel reinforcement').first()).toBeVisible();
  });

  test('should_show_material_variance_when_breakdown_loaded', async ({ page }) => {
    const matTable = page.locator('section').filter({ has: page.getByText('Material Cost Breakdown') });
    await expect(matTable.getByText('+18.4%')).toBeVisible();
    await expect(matTable.getByText('+37.1%')).toBeVisible();
    await expect(matTable.getByText('+6.9%')).toBeVisible();
  });

  test('should_display_suspicious_line_items_when_present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Suspicious Line Items' })).toBeVisible();
    await expect(page.getByText('Concrete unit price 37.1% above market rate')).toBeVisible();
  });

  test('should_show_similar_historical_projects_when_loaded', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Similar Historical Projects' })).toBeVisible();
    const section = page.locator('section').filter({ has: page.getByText('Similar Historical Projects') });
    await expect(section.getByText('NH-37 Nagaon Bypass')).toBeVisible();
  });

  test('should_display_engineer_justification_when_provided', async ({ page }) => {
    await expect(page.getByRole('heading', { name: "Engineer's Justification" })).toBeVisible();
    await expect(page.getByText(/Kaziranga buffer zone/)).toBeVisible();
  });

  test('should_show_audit_trail_when_detail_renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Audit Trail' })).toBeVisible();
    await expect(page.getByText('AI Analysis Complete')).toBeVisible();
    await expect(page.getByText('Escalated to Executive Review')).toBeVisible();
    await expect(page.getByText('Investigation Initiated')).toBeVisible();
  });

  test('should_have_breadcrumb_navigation_when_detail_loads', async ({ page }) => {
    const breadcrumb = page.locator('.ca-detail__breadcrumb a').first();
    await expect(breadcrumb).toBeVisible();
    await breadcrumb.click();
    await expect(page).toHaveURL('/auditing');
  });
});

test.describe('Cost Auditing - Estimate Detail (Yellow Risk with Approval)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auditing/est-003');
  });

  test('should_show_approval_action_buttons_when_under_review', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Approval Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve Estimate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request More Information' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject & Flag for Investigation' })).toBeVisible();
  });

  test('should_display_yellow_risk_analysis_when_moderate_risk', async ({ page }) => {
    await expect(page.getByText('AI Analysis Result')).toBeVisible();
    await expect(page.locator('.ca-alert')).toContainText('62/100');
    await expect(page.locator('.ca-alert')).toContainText('moderately above baseline');
  });
});

test.describe('Cost Auditing - New Estimate Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auditing/new');
  });

  test('should_show_form_heading_when_page_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Submit Cost Estimate' })).toBeVisible();
  });

  test('should_display_project_detail_fields_when_form_renders', async ({ page }) => {
    await expect(page.getByLabel('Project Name *')).toBeVisible();
    await expect(page.getByLabel('Project Type *')).toBeVisible();
    await expect(page.getByLabel('District *')).toBeVisible();
    await expect(page.getByLabel('Location Details *')).toBeVisible();
    await expect(page.getByLabel('Length (km) *')).toBeVisible();
    await expect(page.getByLabel('Width (m) *')).toBeVisible();
  });

  test('should_show_material_entry_fields_when_form_renders', async ({ page }) => {
    await expect(page.getByText('Material Breakdown')).toBeVisible();
    await expect(page.locator('#mat-name-0')).toBeVisible();
    await expect(page.locator('#mat-qty-0')).toBeVisible();
    await expect(page.locator('#mat-price-0')).toBeVisible();
  });

  test('should_add_material_row_when_add_button_clicked', async ({ page }) => {
    const materialInputs = page.locator('[id^="mat-name-"]');
    await expect(materialInputs).toHaveCount(1);

    await page.getByRole('button', { name: '+ Add Material' }).click();
    await expect(materialInputs).toHaveCount(2);
  });

  test('should_calculate_total_cost_when_materials_filled', async ({ page }) => {
    await page.locator('#mat-name-0').fill('Asphalt');
    await page.locator('#mat-qty-0').fill('1000');
    await page.locator('#mat-price-0').fill('4000');

    // Total should update - check the total section
    await expect(page.locator('.ca-new__total')).toContainText('4,000,000');
  });

  test('should_show_justification_textarea_when_form_renders', async ({ page }) => {
    await expect(page.getByLabel(/Explain any factors/)).toBeVisible();
  });

  test('should_submit_and_show_success_when_form_completed', async ({ page }) => {
    await page.getByLabel('Project Name *').fill('Test Road Project');
    await page.getByLabel('Project Type *').selectOption('2-lane-asphalt');
    await page.getByLabel('District *').selectOption('Nagaon');
    await page.getByLabel('Location Details *').fill('NH-36, Km 5 to Km 15');
    await page.getByLabel('Length (km) *').fill('10');

    await page.locator('#mat-name-0').fill('Asphalt Grade B');
    await page.locator('#mat-qty-0').fill('500');
    await page.locator('#mat-price-0').fill('3800');

    await page.getByRole('button', { name: 'Submit for AI Analysis' }).click();

    await expect(page.getByText('Estimate Submitted for AI Analysis')).toBeVisible();
    await expect(page.getByText('Test Road Project')).toBeVisible();
  });
});
