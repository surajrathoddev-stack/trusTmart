// test/unit/hash.test.js
const { computeUnitHash } = require('../../src/utils/hash');

describe('SHA-256 Unit Fingerprinting & Tamper Detection', () => {
  it('should compute deterministic hashes regardless of object key order', () => {
    const payloadA = {
      productId: '101',
      productName: 'EcoSmart Sensor',
      serialNumber: 'SN-998822',
      batchNumber: 'BATCH-ALPHA',
    };

    const payloadB = {
      batchNumber: 'BATCH-ALPHA',
      serialNumber: 'SN-998822',
      productId: '101',
      productName: 'EcoSmart Sensor',
    };

    const hashA = computeUnitHash(payloadA);
    const hashB = computeUnitHash(payloadB);

    expect(hashA).toBeDefined();
    expect(hashA.length).toBe(64);
    expect(hashA).toBe(hashB);
  });

  it('should flag tampering: any single field change alters the resulting hash', () => {
    const original = {
      productId: '101',
      productName: 'EcoSmart Sensor',
      serialNumber: 'SN-998822',
      batchNumber: 'BATCH-ALPHA',
    };

    const tampered = {
      ...original,
      batchNumber: 'BATCH-TAMPERED',
    };

    const originalHash = computeUnitHash(original);
    const tamperedHash = computeUnitHash(tampered);

    expect(originalHash).not.toBe(tamperedHash);
  });
});

