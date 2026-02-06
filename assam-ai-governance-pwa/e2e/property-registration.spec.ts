import { test, expect } from '@playwright/test';

test.describe('Property Registration - Application List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/property');
  });

  test('should_render_page_heading_when_navigating_to_property', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Property Registration' })).toBeVisible();
    await expect(page.getByText('Digital property registration applications for Assam state')).toBeVisible();
  });

  test('should_display_applications_table_when_page_loads', async ({ page }) => {
    const table = page.getByRole('table', { name: /property registration applications/i });
    await expect(table).toBeVisible();
  });

  test('should_show_all_table_headers_when_table_renders', async ({ page }) => {
    for (const header of ['Application #', 'Property', 'District', 'Buyer', 'Status', 'Submitted', 'Action']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('should_display_three_applications_when_mock_data_loaded', async ({ page }) => {
    await expect(page.getByText('ASM-PR-2026-00142')).toBeVisible();
    await expect(page.getByText('ASM-PR-2026-00143')).toBeVisible();
    await expect(page.getByText('ASM-PR-2026-00144')).toBeVisible();
  });

  test('should_show_property_addresses_when_applications_loaded', async ({ page }) => {
    await expect(page.getByText('302, Lakshmi Apartments, GS Road')).toBeVisible();
    await expect(page.getByText('1B, Navagraha Heights, Zoo Road')).toBeVisible();
    await expect(page.getByText('204, Brahmaputra Residency, Chandmari')).toBeVisible();
  });

  test('should_display_summary_counts_when_page_renders', async ({ page }) => {
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.locator('.pr-list__summary-count').first()).toBeVisible();
  });

  test('should_show_new_application_button_when_page_renders', async ({ page }) => {
    const btn = page.getByRole('link', { name: /New Application/i });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/property/new');
  });

  test('should_navigate_to_detail_when_view_button_clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'View' }).first().click();
    await expect(page).toHaveURL(/\/property\/reg-/);
  });
});

test.describe('Property Registration - Application Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/property/reg-001');
  });

  test('should_display_application_number_when_detail_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ASM-PR-2026-00142' })).toBeVisible();
  });

  test('should_show_property_address_when_detail_renders', async ({ page }) => {
    // Address appears in the header subtitle
    await expect(page.locator('.pr-detail__address')).toContainText('302, Lakshmi Apartments, GS Road');
  });

  test('should_display_progress_tracker_when_detail_loads', async ({ page }) => {
    await expect(page.locator('.pr-detail__progress')).toBeVisible();
    await expect(page.locator('.progress-step').first()).toBeVisible();
  });

  test('should_show_property_details_section_when_detail_renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Property Details' })).toBeVisible();
    await expect(page.getByText('1,250 sq ft')).toBeVisible();
  });

  test('should_display_buyer_and_seller_info_when_detail_loads', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.getByText('Buyer & Seller') });
    await expect(section).toBeVisible();
    await expect(section.getByText('Pranjal Sharma')).toBeVisible();
    await expect(section.getByText('Bhaskar Deka')).toBeVisible();
  });

  test('should_show_government_fees_when_detail_renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Government Fees' })).toBeVisible();
    await expect(page.getByText('₹45,000')).toBeVisible();
    await expect(page.getByText('₹270,000')).toBeVisible();
  });

  test('should_display_document_verification_table_when_detail_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI Document Verification' })).toBeVisible();
    const docTable = page.getByRole('table', { name: /document verification/i });
    await expect(docTable).toBeVisible();
    await expect(docTable.getByText('sale_deed_lakshmi_apt.pdf')).toBeVisible();
  });

  test('should_show_confidence_scores_when_documents_loaded', async ({ page }) => {
    const docTable = page.getByRole('table', { name: /document verification/i });
    await expect(docTable.getByText('97%')).toBeVisible();
    await expect(docTable.getByText('94%')).toBeVisible();
    await expect(docTable.getByText('99%')).toBeVisible();
  });

  test('should_display_ocr_extracted_data_when_present', async ({ page }) => {
    await expect(page.getByText('OCR Extracted Data')).toBeVisible();
    await expect(page.locator('.ocr-data').first()).toBeVisible();
  });

  test('should_show_status_timeline_when_detail_renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Status History' })).toBeVisible();
    await expect(page.getByText('All documents verified by AI with high confidence')).toBeVisible();
  });

  test('should_have_breadcrumb_navigation_when_detail_loads', async ({ page }) => {
    const breadcrumb = page.locator('.pr-detail__breadcrumb a').first();
    await expect(breadcrumb).toBeVisible();
    await breadcrumb.click();
    await expect(page).toHaveURL('/property');
  });
});

test.describe('Property Registration - New Application Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/property/new');
  });

  test('should_show_form_heading_when_page_loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'New Property Registration' })).toBeVisible();
  });

  test('should_display_step_indicators_when_form_renders', async ({ page }) => {
    const steps = page.locator('.pr-new__step');
    await expect(steps).toHaveCount(3);
    await expect(steps.first()).toContainText('Property Details');
  });

  test('should_show_step_1_fields_when_form_starts', async ({ page }) => {
    await expect(page.getByLabel('Property Type *')).toBeVisible();
    await expect(page.getByLabel('District *')).toBeVisible();
    await expect(page.getByLabel('Full Address *')).toBeVisible();
    await expect(page.getByLabel('Area (sq ft) *')).toBeVisible();
    await expect(page.getByLabel('Property Value (₹) *')).toBeVisible();
  });

  test('should_fill_property_details_and_advance_when_next_clicked', async ({ page }) => {
    await page.getByLabel('Property Type *').selectOption('flat');
    await page.getByLabel('District *').selectOption('Kamrup Metropolitan');
    await page.getByLabel('Full Address *').fill('101, Test Apartment, GS Road');
    await page.getByLabel('Area (sq ft) *').fill('1000');
    await page.getByLabel('Property Value (₹) *').fill('3500000');

    await page.getByRole('button', { name: /Next: Buyer/i }).click();

    // Step 2 should now be visible
    await expect(page.locator('#buyer-name')).toBeVisible();
  });

  test('should_complete_full_form_flow_when_all_steps_filled', async ({ page }) => {
    // Step 1
    await page.getByLabel('Property Type *').selectOption('flat');
    await page.getByLabel('District *').selectOption('Jorhat');
    await page.getByLabel('Full Address *').fill('42, River View, AT Road');
    await page.getByLabel('Area (sq ft) *').fill('900');
    await page.getByLabel('Property Value (₹) *').fill('2800000');
    await page.getByRole('button', { name: /Next: Buyer/i }).click();

    // Step 2 - Buyer
    await page.locator('#buyer-name').fill('Test Buyer');
    await page.locator('#buyer-aadhaar').fill('1234');
    await page.locator('#buyer-phone').fill('+91-9876543210');
    await page.locator('#buyer-email').fill('buyer@test.com');

    // Step 2 - Seller
    await page.locator('#seller-name').fill('Test Seller');
    await page.locator('#seller-aadhaar').fill('5678');
    await page.locator('#seller-phone').fill('+91-9876543211');
    await page.locator('#seller-email').fill('seller@test.com');

    await page.getByRole('button', { name: /Next: Documents/i }).click();

    // Step 3 - Documents & Review
    await expect(page.getByText('Required Documents')).toBeVisible();
    await expect(page.getByText('Sale Deed')).toBeVisible();
    await expect(page.getByText('Tax Receipt')).toBeVisible();

    // Review summary should show entered data
    await expect(page.getByText('42, River View, AT Road')).toBeVisible();
  });

  test('should_show_success_screen_when_form_submitted', async ({ page }) => {
    // Step 1
    await page.getByLabel('Property Type *').selectOption('flat');
    await page.getByLabel('District *').selectOption('Kamrup Metropolitan');
    await page.getByLabel('Full Address *').fill('Test Address');
    await page.getByLabel('Area (sq ft) *').fill('800');
    await page.getByLabel('Property Value (₹) *').fill('2000000');
    await page.getByRole('button', { name: /Next: Buyer/i }).click();

    // Step 2
    await page.locator('#buyer-name').fill('Buyer');
    await page.locator('#seller-name').fill('Seller');
    await page.getByRole('button', { name: /Next: Documents/i }).click();

    // Step 3 - Submit
    await page.getByRole('button', { name: 'Submit Application' }).click();

    // Success screen
    await expect(page.getByText('Application Submitted Successfully!')).toBeVisible();
    await expect(page.getByText('ASM-PR-2026-00145')).toBeVisible();
  });

  test('should_navigate_back_between_steps_when_back_clicked', async ({ page }) => {
    // Go to step 2
    await page.getByRole('button', { name: /Next: Buyer/i }).click();
    await expect(page.locator('#buyer-name')).toBeVisible();

    // Go back to step 1
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByLabel('Full Address *')).toBeVisible();
  });
});
