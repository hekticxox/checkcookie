# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ Yes            |
| 1.x.x   | ❌ No             |

## Reporting a Vulnerability

We take security vulnerabilities seriously. Please follow responsible disclosure practices.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please:

1. **Email**: Send details to [security@yourproject.com] (replace with actual email)
2. **Subject**: Include "[SECURITY]" in the subject line
3. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if you have one)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Regular Updates**: Every 5 business days until resolved
- **Resolution Timeline**: Critical issues within 30 days, others within 90 days

### Security Best Practices

When using Enhanced Session Checker:

#### For Users
- **Never commit real credentials** to version control
- **Use test/sample data** for development
- **Regularly update dependencies** (`npm audit`)
- **Run in isolated environments** for production testing
- **Sanitize logs** before sharing

#### For Developers
- **Input validation** on all user-provided data
- **Secure cookie handling** - no persistence of sensitive data
- **Browser isolation** - each domain gets fresh context
- **Memory cleanup** - clear sensitive data after use
- **Audit logging** - track all security-relevant events

### Vulnerability Categories

We're particularly interested in reports about:

#### High Priority
- **Code Injection** - Command injection, path traversal
- **Data Exposure** - Credential leaks, session hijacking
- **Browser Security** - XSS, CSP bypass, origin confusion
- **Dependency Vulnerabilities** - Known CVEs in dependencies

#### Medium Priority
- **Denial of Service** - Resource exhaustion, crash bugs
- **Information Disclosure** - Verbose error messages, timing attacks
- **Access Control** - Privilege escalation, unauthorized access

#### Lower Priority (but still welcome)
- **Configuration Issues** - Insecure defaults
- **Documentation Gaps** - Missing security guidance
- **Best Practice Violations** - Code quality improvements

### Security Features

Enhanced Session Checker includes several security measures:

- **Input Sanitization** - All file paths and domains are validated
- **Browser Isolation** - Each test runs in a clean browser context
- **Memory Management** - Sensitive data is cleared after use
- **Audit Logging** - All actions are logged with timestamps
- **Safe Defaults** - Conservative timeout and retry settings

### Hall of Fame

We appreciate security researchers who help keep our project secure:

<!-- Add contributors who report valid security issues -->
- *Your name could be here!*

### Legal

This security policy is subject to our [Code of Conduct](CODE_OF_CONDUCT.md) and [License](LICENSE).

Security researchers who follow this policy will not be pursued legally for their research.

---

*Last updated: [Current Date]*
