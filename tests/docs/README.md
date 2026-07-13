# AquaSync Enterprise Test Suite — Documentation Index

## Overview

This directory contains comprehensive documentation for the AquaSync enterprise testing ecosystem. All documents follow a consistent format with purpose, architecture, commands, examples, expected outputs, common failures, and solutions.

## Document Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Complete testing guide for all engineers | All engineers |
| [HOW_TO_RUN_TESTS.md](./HOW_TO_RUN_TESTS.md) | Quick reference for running tests | All engineers |
| [TEST_MATRIX.md](./TEST_MATRIX.md) | Complete test coverage mapping | QA, Engineering Leads |
| [API_TESTS.md](./API_TESTS.md) | API test details and patterns | Backend Engineers |
| [LOAD_TESTING.md](./LOAD_TESTING.md) | Load/stress/soak/spike test guide | Performance Engineers |
| [SECURITY_TESTING.md](./SECURITY_TESTING.md) | Security test patterns and OWASP coverage | Security Engineers |
| [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) | Performance test framework & results | Performance Engineers |
| [CHAOS_TESTING.md](./CHAOS_TESTING.md) | Chaos engineering test guide | SRE, DevOps |
| [CI_CD.md](./CI_CD.md) | CI/CD pipeline documentation | DevOps, Platform |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions | All engineers |
| [NEW_DEVELOPER_GUIDE.md](./NEW_DEVELOPER_GUIDE.md) | Onboarding guide for new engineers | New engineers |

## Quick Navigation

### For New Engineers
Start with [NEW_DEVELOPER_GUIDE.md](./NEW_DEVELOPER_GUIDE.md) → [HOW_TO_RUN_TESTS.md](./HOW_TO_RUN_TESTS.md) → [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### For QA Engineers
Start with [TEST_MATRIX.md](./TEST_MATRIX.md) → [API_TESTS.md](./API_TESTS.md) → [SECURITY_TESTING.md](./SECURITY_TESTING.md)

### For Performance Engineers
Start with [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) → [LOAD_TESTING.md](./LOAD_TESTING.md) → [CHAOS_TESTING.md](./CHAOS_TESTING.md)

### For DevOps / Platform
Start with [CI_CD.md](./CI_CD.md) → [CHAOS_TESTING.md](./CHAOS_TESTING.md) → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Folder Structure

```
docs/testing/
├── README.md                 # This file
├── TESTING_GUIDE.md          # Complete testing guide
├── HOW_TO_RUN_TESTS.md       # Quick reference
├── TEST_MATRIX.md            # Coverage matrix
├── API_TESTS.md              # API test documentation
├── LOAD_TESTING.md           # Load test documentation
├── SECURITY_TESTING.md       # Security test documentation
├── PERFORMANCE_TESTING.md    # Performance test documentation
├── CHAOS_TESTING.md          # Chaos engineering documentation
├── CI_CD.md                  # CI/CD pipeline documentation
├── TROUBLESHOOTING.md        # Troubleshooting guide
└── NEW_DEVELOPER_GUIDE.md    # Onboarding guide
```

## Contributing

When adding new tests:
1. Update the TEST_MATRIX.md to reflect new coverage
2. Add appropriate README in the test folder
3. Follow the header template (see API_TESTS.md)
4. Run the full test suite before submitting PR
