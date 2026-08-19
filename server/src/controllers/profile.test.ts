describe("Profile Statistics & Rating Calculations", () => {
  const calculateRating = (wins: number, losses: number): number => {
    return Math.max(1000, 1000 + wins * 25 - losses * 10);
  };

  const calculateWinRate = (wins: number, totalMatches: number): number => {
    if (totalMatches === 0) return 0;
    return Math.round((wins / totalMatches) * 100);
  };

  test("should calculate dynamic user rating accurately", () => {
    expect(calculateRating(0, 0)).toBe(1000);
    expect(calculateRating(10, 2)).toBe(1230); // 1000 + 250 - 20
    expect(calculateRating(0, 50)).toBe(1000); // Floor rating at 1000
  });

  test("should calculate win rate percentage rounded to integer", () => {
    expect(calculateWinRate(0, 0)).toBe(0);
    expect(calculateWinRate(2, 3)).toBe(67);
    expect(calculateWinRate(10, 10)).toBe(100);
  });
});
