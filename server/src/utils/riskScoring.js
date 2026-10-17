export const EVENT_WEIGHTS = {
  NO_FACE: 10,
  MULTIPLE_FACES: 15,
  HEAD_TURN: 5,
  PHONE_DETECTED: 15,
  TAB_HIDDEN: 10,
  CAMERA_UNAVAILABLE: 0, // Technical notice, not student misconduct
};

export const getRiskLevel = (score) => {
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
};

/**
 * Calculates risk score, risk level, and explainable breakdown from a list of proctor events.
 * Events marked as FALSE_ALARM are excluded from risk score calculation.
 * 
 * @param {Array} events - List of ProctorEvent objects
 * @returns {{ riskScore: number, riskLevel: string, breakdown: Array<{ type: string, count: number, points: number, weight: number }> }}
 */
export const calculateRiskScore = (events = []) => {
  const breakdownMap = {};

  let totalScore = 0;

  for (const event of events) {
    // If the teacher has reviewed and marked as FALSE_ALARM, ignore in score
    if (event.reviewStatus === 'FALSE_ALARM') {
      continue;
    }

    const type = event.type;
    const weight = EVENT_WEIGHTS[type] || 0;

    if (!breakdownMap[type]) {
      breakdownMap[type] = {
        type,
        count: 0,
        weight,
        points: 0,
      };
    }

    breakdownMap[type].count += 1;
    breakdownMap[type].points += weight;
    totalScore += weight;
  }

  // Cap risk score at 100
  const cappedScore = Math.min(100, Math.max(0, totalScore));
  const riskLevel = getRiskLevel(cappedScore);
  const breakdown = Object.values(breakdownMap);

  return {
    riskScore: cappedScore,
    riskLevel,
    breakdown,
  };
};
