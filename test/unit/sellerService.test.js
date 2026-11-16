// test/unit/sellerService.test.js
const { unknownFallback } = require('../../src/services/sellerService');

describe('Seller Verification Fallback & Safety Guarantees', () => {
  it('should return safe UNKNOWN fallback when external service is unreachable', () => {
    const fallback = unknownFallback(42, 'Service timeout');

    expect(fallback.sellerId).toBe(42);
    expect(fallback.evidenceStatus).toBe('UNKNOWN');
    expect(fallback.verificationStatus).toBe('UNVERIFIED');
    expect(fallback.score).toBeNull();
    expect(fallback.evidenceHash).toBeNull();
  });

  it('must never default missing or failed evidence to AUTHENTIC', () => {
    const fallback = unknownFallback(99);
    expect(fallback.verificationStatus).not.toBe('AUTHENTIC');
    expect(fallback.evidenceStatus).not.toBe('VERIFIED');
  });
});

