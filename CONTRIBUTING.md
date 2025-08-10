# Contributing to Enhanced Session Checker

Thank you for your interest in contributing! This document provides guidelines for contributing to the Enhanced Session Checker project.

## 🚀 Getting Started

### Prerequisites
- Node.js 14.0.0 or higher
- npm package manager
- Basic understanding of JavaScript and browser automation

### Development Setup
```bash
git clone https://github.com/hekticxox/checkcookie
cd checkcookie
npm install
npm test  # Run the test suite
```

## 🛠️ Development Guidelines

### Code Style
- Use camelCase for variables and functions
- Use PascalCase for classes (e.g., `SessionLogger`)
- Include JSDoc comments for functions
- Use meaningful variable names
- Keep functions focused and single-purpose

### Project Structure
```
├── session_checker_improved.js  # Main enhanced version
├── session_checker.js          # Original version for comparison
├── cli.js                      # Command-line interface
├── test_logging.js             # SessionLogger testing
├── config.json                 # Configuration settings
└── docs/                       # Documentation files
```

## 🎯 Areas for Contribution

### High Priority
- **Performance Optimization** - Faster cookie processing and injection
- **Detection Algorithms** - Improve session detection accuracy
- **Error Handling** - Better recovery from network/browser issues
- **Memory Management** - Reduce resource usage for large datasets

### Medium Priority
- **Browser Compatibility** - Support for different browser types
- **Export Formats** - Additional output formats (CSV, XML)
- **Configuration** - More granular control options
- **Documentation** - Examples and usage guides

### New Features
- **Machine Learning** - ML-based session detection
- **Web Dashboard** - Browser-based UI
- **API Integration** - RESTful API endpoints
- **Real-time Monitoring** - Live session health tracking

## 📋 Pull Request Process

1. **Fork the Repository**
   ```bash
   git fork https://github.com/hekticxox/checkcookie
   git clone https://github.com/hekticxox/checkcookie
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the coding guidelines
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   npm test
   node session_checker_improved.js  # Manual testing
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Provide clear description of changes
   - Reference any related issues
   - Include test results

## 🧪 Testing Guidelines

### Running Tests
```bash
npm test                    # Run all tests
node test_logging.js       # Test SessionLogger specifically
DEBUG=* npm test           # Run with debug output
```

### Testing Checklist
- [ ] All existing tests pass
- [ ] New functionality has tests
- [ ] Manual testing with sample cookies
- [ ] Performance impact assessed
- [ ] Documentation updated

### Test Data
- Use only test/sample cookie data
- Never commit real authentication cookies
- Create mock data for comprehensive testing

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Test with latest version
3. Reproduce the issue

### Bug Report Template
```markdown
**Bug Description**
Brief description of the issue

**Steps to Reproduce**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**
What should happen

**Actual Behavior** 
What actually happens

**Environment**
- OS: [e.g., Windows 10, macOS, Ubuntu]
- Node.js version: [e.g., 18.0.0]
- Browser: [e.g., Chrome 120]

**Additional Context**
Any other relevant information
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Clear description of the requested feature

**Use Case**
Why this feature would be useful

**Proposed Implementation**
If you have ideas on how to implement it

**Alternatives Considered**
Other solutions you've considered
```

## 📝 Documentation

### Documentation Standards
- Clear, concise explanations
- Include code examples
- Update README.md for major changes
- Maintain CHANGELOG.md

### Documentation Areas
- API documentation
- Usage examples
- Configuration guides
- Troubleshooting guides

## 🔒 Security

### Security Guidelines
- Never commit credentials or sensitive data
- Use secure coding practices
- Report security issues privately
- Follow responsible disclosure

### Reporting Security Issues
Email security issues to: [your-email@domain.com]
Do not create public issues for security vulnerabilities.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment
- Professional communication

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks
- Publishing private information
- Other unprofessional conduct

## 📞 Getting Help

- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Documentation**: Check README.md and docs/
- **Examples**: See examples/ directory

Thank you for contributing to Enhanced Session Checker! 🎉
