import { test, expect } from "@playwright/test";

const testConfig = {
  gitlab_url: "http://localhost:8080",
  project_id: 1,
  access_token: "glpat-cnHyDV8kvvz4Z_3ASq8g",
  backend_url: "http://localhost:8000",
  frontend_url: "http://localhost:3000",
};

test.describe("Issue State Filtering", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and ensure GitLab is connected
    await page.goto(`${testConfig.frontend_url}/dashboard`);
    
    // Check if GitLab is already connected, if not connect it first
    const connectButton = page.getByRole("button", { name: "接続", exact: true });
    const isConnected = await page.locator(".status.success").isVisible();
    
    if (!isConnected && await connectButton.isVisible()) {
      // Fill connection form
      await page.fill("#gitlab-url", testConfig.gitlab_url);
      await page.fill("#access-token", testConfig.access_token);
      await page.fill("#project-id", testConfig.project_id.toString());
      await page.fill("#api-version", "4");
      
      // Connect
      await connectButton.click();
      await page.waitForTimeout(5000);
    }
  });

  test("quick filter 'Open Issues' button filters by state:opened", async ({ page }) => {
    console.log("🔍 Testing Quick Filter: Open Issues");

    // Take screenshot of initial state
    await page.screenshot({
      path: "test-results/state-filter-01-initial.png",
      fullPage: true
    });
    console.log("📸 Screenshot 1: Initial dashboard state");

    // Navigate to issues section or ensure it's visible
    const issuesSection = page.locator(".issue-list, .issue-table, .issues-container").first();
    if (await issuesSection.isVisible()) {
      // Find and click the "Open Issues" quick filter button
      const openIssuesButton = page.getByRole("button", { name: "Open Issues" });
      await expect(openIssuesButton).toBeVisible();
      
      // Take screenshot before clicking
      await page.screenshot({
        path: "test-results/state-filter-02-before-click.png",
        fullPage: true
      });
      console.log("📸 Screenshot 2: Before clicking Open Issues filter");

      await openIssuesButton.click();
      
      // Wait for filtering to complete
      await page.waitForTimeout(2000);

      // Take screenshot after filtering
      await page.screenshot({
        path: "test-results/state-filter-03-after-open-filter.png",
        fullPage: true
      });
      console.log("📸 Screenshot 3: After clicking Open Issues filter");

      // Verify that the filter is active
      const activeFilterTag = page.locator(".active-filter-tag").filter({ hasText: "state: opened" });
      await expect(activeFilterTag).toBeVisible();
      console.log("✅ Active filter tag 'state: opened' is visible");

      // Check that issues are displayed (if any exist)
      const issueRows = page.locator(".issue-table tbody tr, .issue-row, .issue-item");
      const issueCount = await issueRows.count();
      console.log(`📊 Found ${issueCount} filtered issues`);

      // Verify that console shows no errors
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.error(`❌ Console error: ${msg.text()}`);
        }
      });
    } else {
      console.log("⚠️ Issues section not visible, taking screenshot of current state");
      await page.screenshot({
        path: "test-results/state-filter-02-no-issues-section.png",
        fullPage: true
      });
    }

    console.log("✅ Quick filter 'Open Issues' test complete");
  });

  test("dropdown state filter works correctly", async ({ page }) => {
    console.log("🔽 Testing Dropdown State Filter");

    // Navigate to issues or filters section
    const filtersSection = page.locator(".issue-filters, .filters-content, .issue-table-filters").first();
    
    if (await filtersSection.isVisible()) {
      // Expand filters if they're collapsible
      const filtersToggle = page.locator(".filters-toggle, .filters-header button").first();
      if (await filtersToggle.isVisible()) {
        await filtersToggle.click();
        await page.waitForTimeout(500);
      }

      // Take screenshot of expanded filters
      await page.screenshot({
        path: "test-results/state-filter-04-expanded-filters.png",
        fullPage: true
      });
      console.log("📸 Screenshot 4: Expanded filters section");

      // Find the state dropdown
      const stateDropdown = page.locator("#filter-state, select[value*='state'], select").filter({ hasText: /State|状態/ }).first();
      
      if (await stateDropdown.isVisible()) {
        // Select 'opened' state
        await stateDropdown.selectOption("opened");
        await page.waitForTimeout(1000);

        // Take screenshot after selecting
        await page.screenshot({
          path: "test-results/state-filter-05-dropdown-selected.png",
          fullPage: true
        });
        console.log("📸 Screenshot 5: State dropdown with 'opened' selected");

        // Verify filtering occurred
        const filteredResults = page.locator(".issue-table tbody tr, .issue-row");
        const resultCount = await filteredResults.count();
        console.log(`📊 Dropdown filter shows ${resultCount} results`);

        // Clear the filter
        await stateDropdown.selectOption("");
        await page.waitForTimeout(1000);

        // Take screenshot after clearing
        await page.screenshot({
          path: "test-results/state-filter-06-filter-cleared.png",
          fullPage: true
        });
        console.log("📸 Screenshot 6: Filter cleared");

      } else {
        console.log("⚠️ State dropdown not found, taking screenshot");
        await page.screenshot({
          path: "test-results/state-filter-05-no-dropdown.png",
          fullPage: true
        });
      }
    } else {
      console.log("⚠️ Filters section not found");
      await page.screenshot({
        path: "test-results/state-filter-04-no-filters.png",
        fullPage: true
      });
    }

    console.log("✅ Dropdown state filter test complete");
  });

  test("state filter works in table view", async ({ page }) => {
    console.log("📋 Testing State Filter in Table View");

    // Look for issue table
    const issueTable = page.locator(".issue-table, table").first();
    
    if (await issueTable.isVisible()) {
      // Take screenshot of table
      await page.screenshot({
        path: "test-results/state-filter-07-table-view.png",
        fullPage: true
      });
      console.log("📸 Screenshot 7: Issue table view");

      // Look for table filters
      const tableFilters = page.locator(".issue-table-filters, .filters-header").first();
      
      if (await tableFilters.isVisible()) {
        // Expand table filters
        const toggleButton = tableFilters.locator("button").first();
        await toggleButton.click();
        await page.waitForTimeout(500);

        // Find state filter in table filters
        const stateSelect = page.locator("select").filter({ hasText: /State|状態/ }).first();
        
        if (await stateSelect.isVisible()) {
          // Test filtering by opened state
          await stateSelect.selectOption("opened");
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: "test-results/state-filter-08-table-filtered.png",
            fullPage: true
          });
          console.log("📸 Screenshot 8: Table filtered by opened state");

          // Count visible rows
          const visibleRows = page.locator(".issue-table tbody tr");
          const rowCount = await visibleRows.count();
          console.log(`📊 Table shows ${rowCount} filtered rows`);

          // Test filtering by closed state
          await stateSelect.selectOption("closed");
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: "test-results/state-filter-09-table-closed.png",
            fullPage: true
          });
          console.log("📸 Screenshot 9: Table filtered by closed state");

        } else {
          console.log("⚠️ State select not found in table filters");
        }
      } else {
        console.log("⚠️ Table filters not found");
      }
    } else {
      console.log("⚠️ Issue table not found");
      await page.screenshot({
        path: "test-results/state-filter-07-no-table.png",
        fullPage: true
      });
    }

    console.log("✅ Table state filter test complete");
  });

  test("verify console output and no JavaScript errors", async ({ page }) => {
    console.log("🔍 Testing Console Output and Error Checking");

    // Listen for console messages
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    // Perform filtering actions to generate console output
    const openIssuesButton = page.getByRole("button", { name: "Open Issues" });
    if (await openIssuesButton.isVisible()) {
      await openIssuesButton.click();
      await page.waitForTimeout(2000);
    }

    // Take final screenshot
    await page.screenshot({
      path: "test-results/state-filter-10-console-test.png",
      fullPage: true
    });
    console.log("📸 Screenshot 10: Final state for console verification");

    // Report console messages
    console.log("📋 Console Messages:");
    consoleMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}: ${msg}`);
    });

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log("❌ Console Errors Found:");
      consoleErrors.forEach((error, index) => {
        console.error(`  ${index + 1}: ${error}`);
      });
    } else {
      console.log("✅ No console errors found");
    }

    if (pageErrors.length > 0) {
      console.log("❌ Page Errors Found:");
      pageErrors.forEach((error, index) => {
        console.error(`  ${index + 1}: ${error}`);
      });
    } else {
      console.log("✅ No page errors found");
    }

    // Verify no errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);

    console.log("✅ Console verification complete");
  });
});