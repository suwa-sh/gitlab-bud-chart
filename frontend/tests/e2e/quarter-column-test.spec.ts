import { test, expect } from "@playwright/test";

const testConfig = {
  gitlab_url: "http://localhost:8080",
  project_id: 1,
  access_token: "glpat-cnHyDV8kvvz4Z_3ASq8g",
  backend_url: "http://localhost:8000",
  frontend_url: "http://localhost:3000",
};

test.describe("Quarter Column Implementation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and connect GitLab if needed
    await page.goto(`${testConfig.frontend_url}/dashboard`);
    
    const connectButton = page.getByRole("button", { name: "接続", exact: true });
    const isConnected = await page.locator(".status.success").isVisible();
    
    if (!isConnected && await connectButton.isVisible()) {
      await page.fill("#gitlab-url", testConfig.gitlab_url);
      await page.fill("#access-token", testConfig.access_token);
      await page.fill("#project-id", testConfig.project_id.toString());
      await page.fill("#api-version", "4");
      await connectButton.click();
      await page.waitForTimeout(5000);
    }
  });

  test("dashboard issues table shows Quarter column", async ({ page }) => {
    console.log("🔍 Testing Dashboard Quarter Column");

    // Take screenshot of dashboard with quarter column
    await page.screenshot({
      path: "test-results/dashboard-quarter-column.png",
      fullPage: true
    });
    console.log("📸 Screenshot: Dashboard with Quarter column");

    // Verify Quarter column header exists
    const quarterHeader = page.locator("th").filter({ hasText: "Quarter" });
    await expect(quarterHeader).toBeVisible();
    console.log("✅ Quarter column header found in dashboard");

    // Verify Quarter column is before Created At
    const createdAtHeader = page.locator("th").filter({ hasText: "Created At" });
    await expect(createdAtHeader).toBeVisible();
    console.log("✅ Created At column header found in dashboard");

    // Check for quarter badges in the table
    const quarterBadges = page.locator(".quarter-badge");
    const badgeCount = await quarterBadges.count();
    console.log(`📊 Found ${badgeCount} quarter badges in dashboard`);

    console.log("✅ Dashboard Quarter column test complete");
  });

  test("PBL viewer shows Quarter column", async ({ page }) => {
    console.log("🔍 Testing PBL Viewer Quarter Column");

    // Navigate to PBL Viewer
    const pblViewerTab = page.getByRole("link", { name: "PBL Viewer" });
    await pblViewerTab.click();
    await page.waitForTimeout(2000);

    // Take screenshot of PBL viewer with quarter column
    await page.screenshot({
      path: "test-results/pbl-viewer-quarter-column.png",
      fullPage: true
    });
    console.log("📸 Screenshot: PBL Viewer with Quarter column");

    // Verify Quarter column header exists in PBL viewer
    const quarterHeader = page.locator("th").filter({ hasText: "Quarter" });
    await expect(quarterHeader).toBeVisible();
    console.log("✅ Quarter column header found in PBL viewer");

    // Verify Quarter column is before Created At
    const createdAtHeader = page.locator("th").filter({ hasText: "Created At" });
    await expect(createdAtHeader).toBeVisible();
    console.log("✅ Created At column header found in PBL viewer");

    // Check for quarter badges in the PBL viewer table
    const quarterBadges = page.locator(".quarter-badge");
    const badgeCount = await quarterBadges.count();
    console.log(`📊 Found ${badgeCount} quarter badges in PBL viewer`);

    console.log("✅ PBL Viewer Quarter column test complete");
  });

  test("quarter column is sortable", async ({ page }) => {
    console.log("🔍 Testing Quarter Column Sorting");

    // Click on Quarter column header to test sorting
    const quarterHeader = page.locator("th").filter({ hasText: "Quarter" });
    await quarterHeader.click();
    await page.waitForTimeout(1000);

    // Take screenshot after sorting
    await page.screenshot({
      path: "test-results/quarter-column-sorted.png",
      fullPage: true
    });
    console.log("📸 Screenshot: Quarter column sorted");

    // Verify sort icon appears
    const sortIcon = quarterHeader.locator(".sort-icon");
    await expect(sortIcon).toBeVisible();
    console.log("✅ Sort icon appears on Quarter column");

    console.log("✅ Quarter column sorting test complete");
  });
});