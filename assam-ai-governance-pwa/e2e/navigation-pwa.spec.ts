import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test('should_display_header_with_app_title_when_any_page_loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Assam AI Governance' })).toBeVisible();
  });

  test('should_show_online_status_indicator_when_page_loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header__status')).toContainText('Online');
  });

  test('should_show_language_indicator_when_page_loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header__lang')).toContainText('EN');
  });

  test('should_have_sidebar_with_nav_links_when_desktop', async ({ page, isMobile }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    if (isMobile) {
      await page.getByRole('button', { name: /toggle navigation/i }).click();
    }
    await expect(nav.getByText('Dashboard')).toBeVisible();
    await expect(nav.getByText('Property Registration')).toBeVisible();
    await expect(nav.getByText('Cost Auditing')).toBeVisible();
  });

  test('should_highlight_active_nav_link_when_on_page', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      await page.getByRole('button', { name: /toggle navigation/i }).click();
    }
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    const dashboardLink = nav.getByRole('link').filter({ hasText: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/sidebar__link--active/);
  });

  test('should_navigate_between_sections_when_sidebar_links_clicked', async ({ page, isMobile }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: /main navigation/i });

    // On mobile, need to open hamburger menu first
    const openMenu = async () => {
      if (isMobile) {
        await page.getByRole('button', { name: /toggle navigation/i }).click();
        await expect(nav).toHaveClass(/sidebar--open/);
      }
    };

    // Go to Property Registration
    await openMenu();
    await nav.getByRole('link').filter({ hasText: 'Property Registration' }).click();
    await expect(page).toHaveURL('/property');
    await expect(page.getByRole('heading', { name: 'Property Registration' })).toBeVisible();

    // Go to Cost Auditing
    await openMenu();
    await nav.getByRole('link').filter({ hasText: 'Cost Auditing' }).click();
    await expect(page).toHaveURL('/auditing');
    await expect(page.getByRole('heading', { name: 'Infrastructure Cost Auditing' })).toBeVisible();

    // Go back to Dashboard
    await openMenu();
    await nav.getByRole('link').filter({ hasText: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Governance Dashboard' })).toBeVisible();
  });

  test('should_show_sidebar_footer_with_gov_info_when_rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar__footer')).toContainText('Government of Assam');
    await expect(page.locator('.sidebar__version')).toContainText('PWA Demo v1.0');
  });

  test('should_redirect_unknown_routes_to_dashboard_when_navigated', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Governance Dashboard' })).toBeVisible();
  });

  test('should_show_not_found_for_invalid_application_id_when_navigated', async ({ page }) => {
    await page.goto('/property/invalid-id');
    await expect(page.getByText('Application Not Found')).toBeVisible();
  });

  test('should_show_not_found_for_invalid_estimate_id_when_navigated', async ({ page }) => {
    await page.goto('/auditing/invalid-id');
    await expect(page.getByText('Estimate Not Found')).toBeVisible();
  });
});

test.describe('Responsive / Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should_show_hamburger_menu_when_mobile_viewport', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.getByRole('button', { name: /toggle navigation/i });
    await expect(menuBtn).toBeVisible();
  });

  test('should_open_sidebar_when_hamburger_clicked', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.getByRole('button', { name: /toggle navigation/i });
    await menuBtn.click();

    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toHaveClass(/sidebar--open/);
  });

  test('should_close_sidebar_when_link_clicked_on_mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /toggle navigation/i }).click();

    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toHaveClass(/sidebar--open/);

    await nav.getByRole('link').filter({ hasText: 'Property Registration' }).click();
    await expect(page).toHaveURL('/property');
    await expect(nav).not.toHaveClass(/sidebar--open/);
  });

  test('should_close_sidebar_when_overlay_clicked_on_mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /toggle navigation/i }).click();

    await page.locator('.sidebar-overlay').click();

    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).not.toHaveClass(/sidebar--open/);
  });

  test('should_navigate_between_pages_on_mobile_when_menu_used', async ({ page }) => {
    await page.goto('/');

    // Open menu and navigate
    await page.getByRole('button', { name: /toggle navigation/i }).click();
    await page.getByRole('navigation').getByRole('link').filter({ hasText: 'Cost Auditing' }).click();
    await expect(page).toHaveURL('/auditing');
    await expect(page.getByRole('heading', { name: 'Infrastructure Cost Auditing' })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should_have_proper_landmark_roles_when_page_loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should_have_aria_labels_on_tables_when_rendered', async ({ page }) => {
    await page.goto('/property');
    const table = page.getByRole('table', { name: /property registration applications/i });
    await expect(table).toBeVisible();
  });

  test('should_have_scope_on_table_headers_when_rendered', async ({ page }) => {
    await page.goto('/property');
    const headers = page.locator('th[scope="col"]');
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should_have_associated_labels_for_form_inputs_when_rendered', async ({ page }) => {
    await page.goto('/property/new');
    await expect(page.getByLabel('Property Type *')).toBeVisible();
    await expect(page.getByLabel('District *')).toBeVisible();
    await expect(page.getByLabel('Full Address *')).toBeVisible();
  });

  test('should_have_aria_labels_on_stat_cards_when_dashboard_loads', async ({ page }) => {
    await page.goto('/');
    const statGroups = page.locator('[role="group"][aria-label]');
    const count = await statGroups.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should_have_proper_heading_hierarchy_when_page_renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const h2s = page.locator('h2');
    expect(await h2s.count()).toBeGreaterThan(0);
  });
});

test.describe('PWA Features', () => {
  test('should_have_valid_html_meta_tags_when_page_loads', async ({ page }) => {
    await page.goto('/');
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#1a5632');
  });

  test('should_have_viewport_meta_tag_when_page_loads', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should_serve_web_manifest_when_pwa_configured', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);
    const manifest = await response?.json();
    expect(manifest.name).toBe('Assam AI Governance');
    expect(manifest.short_name).toBe('AssamGov');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1a5632');
  });

  test('should_serve_service_worker_when_pwa_configured', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);
  });

  test('should_have_page_title_when_loaded', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Assam AI Governance');
  });
});
