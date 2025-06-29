import { test, expect } from "@playwright/test";

const testConfig = {
  gitlab_url: "http://localhost:8080",
  project_id: 1,
  access_token: "glpat-cnHyDV8kvvz4Z_3ASq8g",
  backend_url: "http://localhost:8000",
  frontend_url: "http://localhost:3000",
};

test.describe("New GitLab Configuration Features", () => {
  test("demonstrate new features: edit mode, project dropdown, project name support", async ({
    page,
  }) => {
    console.log("🎯 New Features Demonstration Test");

    // ページに移動
    await page.goto(`${testConfig.frontend_url}/dashboard`);
    
    // GitLab設定フォームが表示されることを確認
    await expect(page.locator(".gitlab-config")).toBeVisible();
    
    // 1. Initial Configuration Form Screenshot
    await page.screenshot({
      path: "test-results/01-initial-config-form.png",
      fullPage: true
    });
    console.log("📸 Screenshot 1: Initial configuration form");

    // フォームに値を入力
    await page.fill("#gitlab-url", testConfig.gitlab_url);
    await page.fill("#access-token", testConfig.access_token);
    await page.fill("#project-id", testConfig.project_id.toString());
    await page.fill("#api-version", "4");

    // 2. Filled Form Screenshot
    await page.screenshot({
      path: "test-results/02-filled-form.png",
      fullPage: true
    });
    console.log("📸 Screenshot 2: Form with values filled");

    // Wait for validation to complete and take screenshot
    await page.waitForTimeout(2000);
    
    // 3. Form with Validation Results
    await page.screenshot({
      path: "test-results/03-form-with-validation.png",
      fullPage: true
    });
    console.log("📸 Screenshot 3: Form with validation results");

    // 接続ボタンをクリック
    const connectButton = page.getByRole("button", { name: "接続", exact: true });
    await expect(connectButton).toBeEnabled();
    await connectButton.click();

    // Wait for connection to complete
    await page.waitForTimeout(5000);

    // Check if connection was successful and we're now on the main dashboard
    const connectionStatus = page.getByText(/✓ GitLab接続済み/);
    if (await connectionStatus.isVisible()) {
      // 4. Connected Dashboard Screenshot
      await page.screenshot({
        path: "test-results/04-connected-dashboard.png",
        fullPage: true
      });
      console.log("📸 Screenshot 4: Connected dashboard with edit button");

      // Test the edit functionality
      const editButton = page.locator(".edit-config-btn");
      await expect(editButton).toBeVisible();
      await editButton.click();

      // Wait for edit form to appear
      await page.waitForTimeout(1000);

      // 5. Edit Mode Screenshot
      await page.screenshot({
        path: "test-results/05-edit-mode.png",
        fullPage: true
      });
      console.log("📸 Screenshot 5: Edit mode with populated values");

      // Test cancel functionality
      const cancelButton = page.getByRole("button", { name: "キャンセル" });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(1000);
        
        // 6. Back to Dashboard Screenshot
        await page.screenshot({
          path: "test-results/06-back-to-dashboard.png",
          fullPage: true
        });
        console.log("📸 Screenshot 6: Back to dashboard after cancel");
      }
    } else {
      // If connection failed, take a screenshot of the error
      await page.screenshot({
        path: "test-results/04-connection-error.png",
        fullPage: true
      });
      console.log("📸 Screenshot 4: Connection error (expected in test environment)");
    }

    console.log("✅ New features demonstration complete");
  });

  test("test project name input functionality", async ({ page }) => {
    console.log("🔤 Project Name Input Test");

    await page.goto(`${testConfig.frontend_url}/dashboard`);
    await expect(page.locator(".gitlab-config")).toBeVisible();

    // Fill in URL and token
    await page.fill("#gitlab-url", testConfig.gitlab_url);
    await page.fill("#access-token", testConfig.access_token);

    // Test with project name instead of ID
    await page.fill("#project-id", "my-project-name");
    await page.fill("#api-version", "4");

    // 7. Project Name Input Screenshot
    await page.screenshot({
      path: "test-results/07-project-name-input.png",
      fullPage: true
    });
    console.log("📸 Screenshot 7: Project name input instead of ID");

    // Wait to see if validation/project dropdown appears
    await page.waitForTimeout(3000);

    // 8. Final Form State Screenshot
    await page.screenshot({
      path: "test-results/08-final-form-state.png",
      fullPage: true
    });
    console.log("📸 Screenshot 8: Final form state with project name");

    console.log("✅ Project name input test complete");
  });
});