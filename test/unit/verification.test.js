// test/unit/verification.test.js
const {
  checkProvenance,
  checkLocation,
} = require('../../src/services/verificationService');

describe('Verification Orchestration Logic', () => {
  describe('checkProvenance', () => {
    it('should flag suspicious if unit moved past REGISTERED with zero custody events', () => {
      const timeline = [];
      const unit = { current_status: 'IN_TRANSIT' };

      const result = checkProvenance(timeline, unit);
      expect(result.issue).toBe(true);
      expect(result.reason).toContain('has no recorded custody events');
    });

    it('should flag suspicious if marked as SOLD with insufficient custody timeline', () => {
      const timeline = [{ event_type: 'SOLD' }];
      const unit = { is_sold: true, current_status: 'SOLD' };

      const result = checkProvenance(timeline, unit);
      expect(result.issue).toBe(true);
      expect(result.reason).toContain('without preceding custody transfer events');
    });

    it('should pass if unit is REGISTERED with clean initial state', () => {
      const timeline = [];
      const unit = { current_status: 'REGISTERED', is_sold: false };

      const result = checkProvenance(timeline, unit);
      expect(result.issue).toBe(false);
    });
  });

  describe('checkLocation', () => {
    it('should flag suspicious on location discrepancy between unit and last event', () => {
      const timeline = [
        { location: 'Warehouse A', to_location: 'Warehouse A' },
      ];
      const unit = { current_location: 'Retail Store B' };

      const result = checkLocation(timeline, unit);
      expect(result.issue).toBe(true);
      expect(result.reason).toContain('Location discrepancy');
    });

    it('should pass when locations match', () => {
      const timeline = [
        { location: 'Retail Store B', to_location: 'Retail Store B' },
      ];
      const unit = { current_location: 'Retail Store B' };

      const result = checkLocation(timeline, unit);
      expect(result.issue).toBe(false);
    });
  });
});

