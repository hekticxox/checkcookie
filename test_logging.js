/**
 * Test script to demonstrate the enhanced logging capabilities
 */

// Extract the SessionLogger class for testing
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
    
    console.log(`  📊 TIMING [+${elapsed}ms]: ${event}`, data.summary ? `- ${data.summary}` : '');
  }

  logCookieInjection(cookies, batchInfo = {}) {
    const maskedCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: this.maskValue(cookie.value),
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

  getTiming(event) {
    const eventData = this.events.find(e => e.event === event);
    return eventData ? eventData.elapsed : null;
  }

  exportLogs() {
    return {
      summary: this.generateSummary(),
      events: this.events,
      sessionData: this.sessionData
    };
  }
}

// Test the logging system
console.log("🧪 Testing Enhanced Session Logger\n");

const logger = new SessionLogger('example.com');

// Simulate a session flow
logger.logEvent('SESSION_START', { summary: 'Starting session test', targetUrl: 'https://example.com/dashboard' });

// Simulate cookie injection
const mockCookies = [
  { name: 'sessionid', value: 'abc123def456ghi789', domain: 'example.com', path: '/', secure: true, httpOnly: false },
  { name: 'auth_token', value: 'xyz789uvw456rst123', domain: 'example.com', path: '/', secure: true, httpOnly: true },
  { name: 'user_prefs', value: 'theme=dark;lang=en', domain: 'example.com', path: '/', secure: false, httpOnly: false }
];

logger.logCookieInjection(mockCookies, { batchNumber: 1, totalBatches: 1, injectionTime: 45 });

// Simulate HTTP requests
setTimeout(() => {
  const requestId = logger.logHttpRequest('https://example.com/dashboard', 'GET');
  
  setTimeout(() => {
    logger.logHttpResponse(requestId, 200, { 
      'content-type': 'text/html', 
      'set-cookie': ['new_session=updated123; Path=/; Secure'] 
    }, '<html><body>Welcome to your dashboard!</body></html>');
    
    // Final session status
    setTimeout(() => {
      logger.logSessionStatus('VALID_SESSION', 95, { 
        domainSpecific: true, 
        userContent: true, 
        noLoginKeywords: true 
      });
      
      // Show summary
      const summary = logger.generateSummary();
      console.log('\n📊 Session Summary:');
      console.log(`   Domain: ${summary.domain}`);
      console.log(`   Total Time: ${summary.totalTime}ms`);
      console.log(`   Cookies Injected: ${summary.cookieStats.totalInjected}`);
      console.log(`   Session Cookies: ${summary.cookieStats.sessionCookies}`);
      console.log(`   Auth Cookies: ${summary.cookieStats.authCookies}`);
      console.log(`   HTTP Requests: ${summary.httpStats.requests}`);
      console.log(`   Session Status: ${summary.sessionResult.status}`);
      console.log(`   Confidence: ${summary.sessionResult.confidence}%`);
      
      console.log('\n📄 Full Log Export:');
      console.log(JSON.stringify(logger.exportLogs(), null, 2));
      
    }, 100);
  }, 200);
}, 150);
