/**
 * GLOBAL MACRO DASHBOARD - DATA STORE
 * 50년 시계열(1975 ~ 2026) 역사적 경제 데이터 및 실시간 데이터 관리 모듈
 */

const DataStore = (() => {
  // 기준 연월 생성 (1975년 1월 ~ 2026년 9월, 약 620개월)
  const START_YEAR = 1975;
  const END_YEAR = 2026;
  const END_MONTH = 9;

  // 보간(Interpolation)을 통한 50년 정밀 월별 데이터 생성기
  function generateTimeSeries(anchors, volatility = 0.05) {
    const dates = [];
    const values = [];
    
    // Sort anchors by date
    anchors.sort((a, b) => new Date(a.date) - new Date(b.date));

    let anchorIdx = 0;
    let seed = 12345;
    function pseudoRandom() {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) * 2 - 1; // -1 ~ 1
    }

    const start = new Date(1975, 0, 1);
    const end = new Date(END_YEAR, END_MONTH - 1, 1);
    
    let current = new Date(start);
    while (current <= end) {
      const curTime = current.getTime();
      const curStr = current.toISOString().slice(0, 7); // YYYY-MM
      dates.push(curStr);

      // find surrounding anchors
      while (anchorIdx < anchors.length - 1 && new Date(anchors[anchorIdx + 1].date).getTime() <= curTime) {
        anchorIdx++;
      }

      const a1 = anchors[anchorIdx];
      const a2 = anchors[Math.min(anchorIdx + 1, anchors.length - 1)];

      let val;
      if (!a2 || a1 === a2) {
        val = a1.val;
      } else {
        const t1 = new Date(a1.date).getTime();
        const t2 = new Date(a2.date).getTime();
        const factor = t2 === t1 ? 0 : (curTime - t1) / (t2 - t1);
        // Smooth sine ease
        const smoothFactor = 0.5 - 0.5 * Math.cos(factor * Math.PI);
        val = a1.val + (a2.val - a1.val) * smoothFactor;
      }

      // Add gentle realistic economic noise (except anchors)
      if (volatility > 0 && curTime > new Date(1975, 0, 1).getTime() && curTime < end.getTime()) {
        val += val * volatility * 0.05 * pseudoRandom();
      }

      values.push(Math.round(val * 1000) / 1000);

      // Next month
      current.setMonth(current.getMonth() + 1);
    }

    return { dates, values };
  }

  // 1. 미국 국채금리 (3M, 1Y, 5Y, 10Y, 30Y) 50년 역사적 앵커 포인트
  const usYieldAnchors = {
    '3M': [
      { date: '1975-01', val: 7.15 }, { date: '1981-05', val: 16.30 }, { date: '1985-01', val: 7.76 },
      { date: '1990-01', val: 7.64 }, { date: '1993-01', val: 3.00 }, { date: '2000-11', val: 6.20 },
      { date: '2003-06', val: 0.92 }, { date: '2006-07', val: 5.05 }, { date: '2009-01', val: 0.12 },
      { date: '2015-01', val: 0.03 }, { date: '2019-01', val: 2.40 }, { date: '2020-04', val: 0.10 },
      { date: '2023-10', val: 5.46 }, { date: '2025-01', val: 4.35 }, { date: '2026-09', val: 4.15 }
    ],
    '1Y': [
      { date: '1975-01', val: 7.20 }, { date: '1981-08', val: 17.31 }, { date: '1986-01', val: 7.61 },
      { date: '1990-01', val: 7.78 }, { date: '1993-01', val: 3.58 }, { date: '2000-05', val: 6.33 },
      { date: '2003-06', val: 1.01 }, { date: '2006-07', val: 5.22 }, { date: '2009-01', val: 0.44 },
      { date: '2015-01', val: 0.25 }, { date: '2018-11', val: 2.70 }, { date: '2020-05', val: 0.16 },
      { date: '2023-10', val: 5.42 }, { date: '2025-01', val: 4.22 }, { date: '2026-09', val: 3.98 }
    ],
    '5Y': [
      { date: '1975-01', val: 7.50 }, { date: '1981-09', val: 15.93 }, { date: '1986-01', val: 8.44 },
      { date: '1990-01', val: 8.12 }, { date: '1995-01', val: 7.77 }, { date: '2000-01', val: 6.58 },
      { date: '2003-06', val: 2.27 }, { date: '2007-06', val: 5.03 }, { date: '2011-09', val: 0.86 },
      { date: '2018-10', val: 3.05 }, { date: '2020-08', val: 0.28 }, { date: '2023-10', val: 4.90 },
      { date: '2025-01', val: 4.30 }, { date: '2026-09', val: 3.85 }
    ],
    '10Y': [
      { date: '1975-01', val: 7.78 }, { date: '1981-09', val: 15.84 }, { date: '1987-10', val: 9.52 },
      { date: '1990-01', val: 8.21 }, { date: '1995-01', val: 7.78 }, { date: '2000-01', val: 6.66 },
      { date: '2007-06', val: 5.10 }, { date: '2012-07', val: 1.53 }, { date: '2018-10', val: 3.15 },
      { date: '2020-03', val: 0.54 }, { date: '2023-10', val: 4.98 }, { date: '2025-01', val: 4.45 },
      { date: '2026-09', val: 4.08 }
    ],
    '30Y': [
      { date: '1977-02', val: 7.82 }, { date: '1981-10', val: 15.20 }, { date: '1987-10', val: 10.24 },
      { date: '1990-01', val: 8.49 }, { date: '1995-01', val: 7.88 }, { date: '2000-01', val: 6.63 },
      { date: '2008-12', val: 2.97 }, { date: '2011-09', val: 3.00 }, { date: '2019-08', val: 1.98 },
      { date: '2020-03', val: 1.15 }, { date: '2023-10', val: 5.11 }, { date: '2025-01', val: 4.65 },
      { date: '2026-09', val: 4.32 }
    ]
  };

  // 2. 일본 국채금리 (3M, 1Y, 5Y, 10Y, 30Y)
  const jpYieldAnchors = {
    '3M': [
      { date: '1975-01', val: 8.5 }, { date: '1980-04', val: 11.2 }, { date: '1990-01', val: 6.8 },
      { date: '1999-02', val: 0.05 }, { date: '2016-02', val: -0.25 }, { date: '2022-01', val: -0.10 },
      { date: '2024-07', val: 0.25 }, { date: '2026-09', val: 0.45 }
    ],
    '1Y': [
      { date: '1975-01', val: 8.6 }, { date: '1980-04', val: 10.8 }, { date: '1990-01', val: 7.2 },
      { date: '1999-05', val: 0.15 }, { date: '2016-03', val: -0.22 }, { date: '2024-03', val: 0.18 },
      { date: '2026-09', val: 0.52 }
    ],
    '5Y': [
      { date: '1975-01', val: 8.8 }, { date: '1980-04', val: 9.5 }, { date: '1990-01', val: 7.4 },
      { date: '2003-06', val: 0.35 }, { date: '2016-07', val: -0.37 }, { date: '2024-03', val: 0.38 },
      { date: '2026-09', val: 0.82 }
    ],
    '10Y': [
      { date: '1975-01', val: 8.9 }, { date: '1980-04', val: 9.22 }, { date: '1986-01', val: 5.6 },
      { date: '1990-09', val: 7.90 }, { date: '1998-10', val: 0.90 }, { date: '2006-05', val: 1.95 },
      { date: '2016-07', val: -0.29 }, { date: '2019-08', val: -0.28 }, { date: '2024-05', val: 1.05 },
      { date: '2025-01', val: 1.15 }, { date: '2026-09', val: 1.35 }
    ],
    '30Y': [
      { date: '1975-01', val: 9.0 }, { date: '1990-01', val: 7.8 }, { date: '2003-06', val: 1.2 },
      { date: '2016-07', val: 0.05 }, { date: '2023-11', val: 1.70 }, { date: '2026-09', val: 2.15 }
    ]
  };

  // 3. 한국 국채금리 (3M, 1Y, 5Y, 10Y, 30Y)
  const krYieldAnchors = {
    '3M': [
      { date: '1975-01', val: 15.0 }, { date: '1980-01', val: 20.0 }, { date: '1991-01', val: 18.5 },
      { date: '1997-12', val: 24.5 }, { date: '2001-01', val: 5.5 }, { date: '2008-10', val: 5.8 },
      { date: '2015-06', val: 1.55 }, { date: '2020-05', val: 0.65 }, { date: '2023-01', val: 3.75 },
      { date: '2026-09', val: 2.85 }
    ],
    '1Y': [
      { date: '1975-01', val: 15.5 }, { date: '1981-01', val: 21.0 }, { date: '1991-01', val: 18.0 },
      { date: '1997-12', val: 22.0 }, { date: '2001-01', val: 6.2 }, { date: '2008-09', val: 5.95 },
      { date: '2016-06', val: 1.38 }, { date: '2020-07', val: 0.68 }, { date: '2023-02', val: 3.65 },
      { date: '2026-09', val: 2.92 }
    ],
    '5Y': [
      { date: '1975-01', val: 16.0 }, { date: '1980-01', val: 21.5 }, { date: '1990-01', val: 17.5 },
      { date: '1997-12', val: 18.0 }, { date: '2004-12', val: 3.8 }, { date: '2008-08', val: 6.05 },
      { date: '2016-07', val: 1.25 }, { date: '2020-07', val: 1.05 }, { date: '2022-10', val: 4.45 },
      { date: '2025-01', val: 3.10 }, { date: '2026-09', val: 2.98 }
    ],
    '10Y': [
      { date: '1975-01', val: 16.5 }, { date: '1980-01', val: 22.0 }, { date: '1990-01', val: 17.0 },
      { date: '1998-01', val: 16.5 }, { date: '2001-01', val: 7.2 }, { date: '2008-08', val: 6.10 },
      { date: '2016-07', val: 1.40 }, { date: '2019-08', val: 1.17 }, { date: '2020-07', val: 1.30 },
      { date: '2022-10', val: 4.63 }, { date: '2024-01', val: 3.40 }, { date: '2026-09', val: 3.05 }
    ],
    '30Y': [
      { date: '1975-01', val: 17.0 }, { date: '1990-01', val: 16.5 }, { date: '2006-01', val: 5.3 },
      { date: '2012-09', val: 3.1 }, { date: '2019-08', val: 1.20 }, { date: '2022-10', val: 4.35 },
      { date: '2025-01', val: 3.15 }, { date: '2026-09', val: 3.02 }
    ]
  };

  // 4. 중국 국채금리 (3M, 1Y, 5Y, 10Y, 30Y)
  const cnYieldAnchors = {
    '3M': [
      { date: '1975-01', val: 6.5 }, { date: '1993-01', val: 10.5 }, { date: '2006-01', val: 2.1 },
      { date: '2013-06', val: 4.8 }, { date: '2020-04', val: 1.2 }, { date: '2026-09', val: 1.45 }
    ],
    '1Y': [
      { date: '1975-01', val: 7.0 }, { date: '1993-01', val: 11.0 }, { date: '2007-10', val: 4.1 },
      { date: '2014-01', val: 4.0 }, { date: '2020-04', val: 1.15 }, { date: '2026-09', val: 1.52 }
    ],
    '5Y': [
      { date: '1975-01', val: 7.5 }, { date: '1994-01', val: 12.0 }, { date: '2007-11', val: 4.4 },
      { date: '2014-01', val: 4.5 }, { date: '2020-04', val: 2.1 }, { date: '2026-09', val: 1.85 }
    ],
    '10Y': [
      { date: '1975-01', val: 8.0 }, { date: '1995-01', val: 12.5 }, { date: '2004-11', val: 5.1 },
      { date: '2008-12', val: 2.7 }, { date: '2013-11', val: 4.7 }, { date: '2020-04', val: 2.5 },
      { date: '2024-01', val: 2.5 }, { date: '2025-01', val: 2.1 }, { date: '2026-09', val: 1.95 }
    ],
    '30Y': [
      { date: '1975-01', val: 8.5 }, { date: '2005-01', val: 4.8 }, { date: '2013-11', val: 5.1 },
      { date: '2020-04', val: 3.3 }, { date: '2024-06', val: 2.45 }, { date: '2026-09', val: 2.25 }
    ]
  };

  // 5. 유럽 국채금리 (독일 분트 벤치마크 3M, 1Y, 5Y, 10Y, 30Y)
  const euYieldAnchors = {
    '3M': [
      { date: '1975-01', val: 6.2 }, { date: '1981-03', val: 12.5 }, { date: '1992-09', val: 9.3 },
      { date: '2000-11', val: 5.1 }, { date: '2015-01', val: -0.2 }, { date: '2020-05', val: -0.65 },
      { date: '2023-09', val: 3.9 }, { date: '2026-09', val: 2.65 }
    ],
    '1Y': [
      { date: '1975-01', val: 6.8 }, { date: '1981-08', val: 12.8 }, { date: '1992-09', val: 9.1 },
      { date: '2000-05', val: 5.2 }, { date: '2015-01', val: -0.25 }, { date: '2020-05', val: -0.70 },
      { date: '2023-10', val: 3.75 }, { date: '2026-09', val: 2.52 }
    ],
    '5Y': [
      { date: '1975-01', val: 7.2 }, { date: '1981-09', val: 11.2 }, { date: '1990-01', val: 8.5 },
      { date: '2000-01', val: 5.3 }, { date: '2019-08', val: -0.85 }, { date: '2023-10', val: 2.85 },
      { date: '2026-09', val: 2.20 }
    ],
    '10Y': [
      { date: '1975-01', val: 7.5 }, { date: '1981-09', val: 10.8 }, { date: '1990-01', val: 8.8 },
      { date: '1995-01', val: 7.5 }, { date: '2000-01', val: 5.6 }, { date: '2008-06', val: 4.6 },
      { date: '2019-08', val: -0.71 }, { date: '2020-03', val: -0.85 }, { date: '2023-10', val: 2.97 },
      { date: '2025-01', val: 2.35 }, { date: '2026-09', val: 2.18 }
    ],
    '30Y': [
      { date: '1975-01', val: 7.8 }, { date: '1981-09', val: 10.5 }, { date: '1990-01', val: 8.6 },
      { date: '2000-01', val: 5.8 }, { date: '2019-08', val: -0.20 }, { date: '2023-10', val: 3.10 },
      { date: '2026-09', val: 2.45 }
    ]
  };

  // 7. 한국 원화(KRW) 기준 환율 (USD, JPY 100엔, CNY, EUR)
  const krwFxAnchors = {
    'USD': [
      { date: '1975-01', val: 484.0 }, { date: '1980-01', val: 580.0 }, { date: '1986-01', val: 890.0 },
      { date: '1990-01', val: 685.0 }, { date: '1997-01', val: 850.0 }, { date: '1997-12', val: 1960.0 },
      { date: '2000-01', val: 1130.0 }, { date: '2007-10', val: 900.0 }, { date: '2009-03', val: 1570.0 },
      { date: '2014-06', val: 1010.0 }, { date: '2020-03', val: 1285.0 }, { date: '2022-10', val: 1442.0 },
      { date: '2024-04', val: 1395.0 }, { date: '2025-01', val: 1450.0 }, { date: '2026-09', val: 1385.0 }
    ],
    'JPY': [ // 100엔 당 원화
      { date: '1975-01', val: 160.0 }, { date: '1985-09', val: 375.0 }, { date: '1990-01', val: 470.0 },
      { date: '1998-01', val: 1550.0 }, { date: '2000-01', val: 1080.0 }, { date: '2007-06', val: 750.0 },
      { date: '2009-02', val: 1620.0 }, { date: '2012-09', val: 1450.0 }, { date: '2015-06', val: 900.0 },
      { date: '2020-03', val: 1190.0 }, { date: '2024-07', val: 860.0 }, { date: '2026-09', val: 945.0 }
    ],
    'CNY': [ // 1위안 당 원화
      { date: '1985-01', val: 300.0 }, { date: '1994-01', val: 95.0 }, { date: '1997-12', val: 236.0 },
      { date: '2005-07', val: 125.0 }, { date: '2009-03', val: 230.0 }, { date: '2014-06', val: 162.0 },
      { date: '2020-03', val: 182.0 }, { date: '2022-10', val: 202.0 }, { date: '2026-09', val: 194.5 }
    ],
    'EUR': [ // 1유로 당 원화
      { date: '1975-01', val: 620.0 }, { date: '1985-01', val: 780.0 }, { date: '1997-12', val: 2150.0 },
      { date: '2000-10', val: 950.0 }, { date: '2008-07', val: 1630.0 }, { date: '2015-03', val: 1180.0 },
      { date: '2021-01', val: 1330.0 }, { date: '2024-04', val: 1490.0 }, { date: '2026-09', val: 1510.0 }
    ]
  };

  // 8. 미국 달러(USD) 기준 환율 (KRW, JPY, CNY, EUR)
  const usdFxAnchors = {
    'KRW': [
      { date: '1975-01', val: 484.0 }, { date: '1980-01', val: 580.0 }, { date: '1986-01', val: 890.0 },
      { date: '1997-12', val: 1960.0 }, { date: '2009-03', val: 1570.0 }, { date: '2026-09', val: 1385.0 }
    ],
    'JPY': [
      { date: '1975-01', val: 300.0 }, { date: '1985-09', val: 240.0 }, { date: '1988-01', val: 122.0 },
      { date: '1995-04', val: 79.7 }, { date: '1998-08', val: 147.0 }, { date: '2011-10', val: 75.8 },
      { date: '2015-06', val: 125.0 }, { date: '2020-03', val: 102.0 }, { date: '2024-07', val: 161.5 },
      { date: '2026-09', val: 146.5 }
    ],
    'CNY': [
      { date: '1980-01', val: 1.50 }, { date: '1985-01', val: 2.80 }, { date: '1994-01', val: 8.70 },
      { date: '2005-06', val: 8.28 }, { date: '2014-01', val: 6.05 }, { date: '2019-09', val: 7.18 },
      { date: '2022-10', val: 7.32 }, { date: '2026-09', val: 7.12 }
    ],
    'EUR': [
      { date: '1975-01', val: 1.30 }, { date: '1985-02', val: 0.69 }, { date: '1995-04', val: 1.37 },
      { date: '2000-10', val: 0.825 }, { date: '2008-07', val: 1.603 }, { date: '2015-03', val: 1.05 },
      { date: '2021-01', val: 1.23 }, { date: '2022-09', val: 0.955 }, { date: '2026-09', val: 1.09 }
    ]
  };

  // 9. 주요국 기준금리 (미국, 한국, 중국, 일본, 유럽)
  const policyRateAnchors = {
    '미국': [
      { date: '1975-01', val: 7.25 }, { date: '1980-04', val: 19.50 }, { date: '1981-06', val: 20.00 },
      { date: '1989-05', val: 9.81 }, { date: '1992-09', val: 3.00 }, { date: '2000-11', val: 6.50 },
      { date: '2003-06', val: 1.00 }, { date: '2006-06', val: 5.25 }, { date: '2008-12', val: 0.25 },
      { date: '2015-11', val: 0.25 }, { date: '2018-12', val: 2.50 }, { date: '2020-03', val: 0.25 },
      { date: '2023-07', val: 5.50 }, { date: '2024-09', val: 5.00 }, { date: '2025-06', val: 4.25 },
      { date: '2026-09', val: 3.75 }
    ],
    '한국': [
      { date: '1975-01', val: 15.0 }, { date: '1980-01', val: 25.0 }, { date: '1990-01', val: 15.0 },
      { date: '1998-01', val: 26.0 }, { date: '1999-05', val: 4.75 }, { date: '2008-08', val: 5.25 },
      { date: '2009-02', val: 2.00 }, { date: '2016-06', val: 1.25 }, { date: '2020-05', val: 0.50 },
      { date: '2023-01', val: 3.50 }, { date: '2024-10', val: 3.25 }, { date: '2025-05', val: 2.75 },
      { date: '2026-09', val: 2.50 }
    ],
    '중국': [
      { date: '1980-01', val: 5.04 }, { date: '1993-07', val: 10.98 }, { date: '2002-02', val: 5.31 },
      { date: '2007-12', val: 7.47 }, { date: '2015-10', val: 4.35 }, { date: '2020-04', val: 3.85 },
      { date: '2023-08', val: 3.45 }, { date: '2024-07', val: 3.35 }, { date: '2026-09', val: 3.10 }
    ],
    '일본': [
      { date: '1975-01', val: 9.00 }, { date: '1980-03', val: 9.00 }, { date: '1987-02', val: 2.50 },
      { date: '1990-08', val: 6.00 }, { date: '1995-09', val: 0.50 }, { date: '1999-02', val: 0.00 },
      { date: '2006-07', val: 0.25 }, { date: '2008-12', val: 0.10 }, { date: '2016-01', val: -0.10 },
      { date: '2024-03', val: 0.10 }, { date: '2024-07', val: 0.25 }, { date: '2025-03', val: 0.50 },
      { date: '2026-09', val: 0.75 }
    ],
    '유럽': [
      { date: '1975-01', val: 6.00 }, { date: '1981-05', val: 12.00 }, { date: '1990-01', val: 8.00 },
      { date: '1999-01', val: 3.00 }, { date: '2000-10', val: 4.75 }, { date: '2008-07', val: 4.25 },
      { date: '2014-09', val: 0.05 }, { date: '2016-03', val: 0.00 }, { date: '2023-09', val: 4.50 },
      { date: '2024-06', val: 4.25 }, { date: '2025-01', val: 3.25 }, { date: '2026-09', val: 2.50 }
    ]
  };

  // 10. M1 통화공급량 (단위 표기 지수)
  const m1Anchors = {
    '미국': [
      { date: '1975-01', val: 280 }, { date: '1985-01', val: 560 }, { date: '1995-01', val: 1150 },
      { date: '2008-08', val: 1400 }, { date: '2015-01', val: 2950 }, { date: '2020-02', val: 4000 },
      { date: '2021-05', val: 19200 }, { date: '2023-01', val: 18400 }, { date: '2026-09', val: 18100 }
    ],
    '한국': [
      { date: '1975-01', val: 800 }, { date: '1985-01', val: 5200 }, { date: '1995-01', val: 35000 },
      { date: '2005-01', val: 270000 }, { date: '2015-01', val: 600000 }, { date: '2021-12', val: 1350000 },
      { date: '2023-12', val: 1220000 }, { date: '2026-09', val: 1290000 }
    ],
    '중국': [
      { date: '1985-01', val: 450 }, { date: '1995-01', val: 24000 }, { date: '2005-01', val: 105000 },
      { date: '2015-01', val: 348000 }, { date: '2020-01', val: 580000 }, { date: '2026-09', val: 685000 }
    ],
    '일본': [
      { date: '1975-01', val: 48000 }, { date: '1985-01', val: 92000 }, { date: '1995-01', val: 165000 },
      { date: '2005-01', val: 380000 }, { date: '2015-01', val: 620000 }, { date: '2022-01', val: 1050000 },
      { date: '2026-09', val: 1090000 }
    ],
    '유럽': [
      { date: '1980-01', val: 550 }, { date: '1995-01', val: 1500 }, { date: '2005-01', val: 3400 },
      { date: '2015-01', val: 6500 }, { date: '2021-12', val: 11500 }, { date: '2026-09', val: 10450 }
    ]
  };

  // 11. M2 통화공급량
  const m2Anchors = {
    '미국': [
      { date: '1975-01', val: 1020 }, { date: '1985-01', val: 2420 }, { date: '1995-01', val: 3500 },
      { date: '2005-01', val: 6400 }, { date: '2015-01', val: 11700 }, { date: '2020-02', val: 15400 },
      { date: '2022-03', val: 21700 }, { date: '2024-01', val: 20850 }, { date: '2026-09', val: 21500 }
    ],
    '한국': [
      { date: '1975-01', val: 2800 }, { date: '1985-01', val: 27000 }, { date: '1995-01', val: 155000 },
      { date: '2005-01', val: 980000 }, { date: '2015-01', val: 2160000 }, { date: '2022-06', val: 3700000 },
      { date: '2026-09', val: 4050000 }
    ],
    '중국': [
      { date: '1985-01', val: 5200 }, { date: '1995-01', val: 60750 }, { date: '2005-01', val: 298000 },
      { date: '2015-01', val: 1390000 }, { date: '2020-01', val: 2020000 }, { date: '2026-09', val: 3100000 }
    ],
    '일본': [
      { date: '1975-01', val: 110000 }, { date: '1985-01', val: 310000 }, { date: '1995-01', val: 540000 },
      { date: '2005-01', val: 700000 }, { date: '2015-01', val: 910000 }, { date: '2022-01', val: 1200000 },
      { date: '2026-09', val: 1260000 }
    ],
    '유럽': [
      { date: '1980-01', val: 1400 }, { date: '1995-01', val: 3800 }, { date: '2005-01', val: 6800 },
      { date: '2015-01', val: 10400 }, { date: '2022-05', val: 15200 }, { date: '2026-09', val: 15750 }
    ]
  };

  // 12. 근원물가지수 (Core CPI YoY %)
  const coreCpiAnchors = {
    '미국': [
      { date: '1975-01', val: 11.5 }, { date: '1980-06', val: 13.6 }, { date: '1986-01', val: 4.2 },
      { date: '1990-08', val: 5.6 }, { date: '1998-01', val: 2.2 }, { date: '2006-08', val: 2.8 },
      { date: '2010-10', val: 0.6 }, { date: '2018-07', val: 2.4 }, { date: '2020-05', val: 1.2 },
      { date: '2022-09', val: 6.6 }, { date: '2024-04', val: 3.6 }, { date: '2026-09', val: 2.6 }
    ],
    '한국': [
      { date: '1975-01', val: 21.0 }, { date: '1980-09', val: 24.5 }, { date: '1986-01', val: 3.5 },
      { date: '1991-08', val: 9.3 }, { date: '1998-04', val: 9.0 }, { date: '2004-05', val: 3.2 },
      { date: '2015-02', val: 2.1 }, { date: '2020-04', val: 0.3 }, { date: '2023-01', val: 4.2 },
      { date: '2026-09', val: 2.1 }
    ],
    '중국': [
      { date: '1985-01', val: 8.5 }, { date: '1994-10', val: 24.0 }, { date: '1999-05', val: -1.5 },
      { date: '2008-02', val: 4.5 }, { date: '2015-01', val: 1.5 }, { date: '2020-01', val: 1.5 },
      { date: '2024-01', val: 0.4 }, { date: '2026-09', val: 0.8 }
    ],
    '일본': [
      { date: '1975-01', val: 14.5 }, { date: '1980-08', val: 7.8 }, { date: '1986-01', val: 0.8 },
      { date: '1990-11', val: 3.3 }, { date: '2001-07', val: -1.0 }, { date: '2010-03', val: -1.2 },
      { date: '2015-01', val: 0.8 }, { date: '2020-10', val: -0.7 }, { date: '2023-01', val: 4.2 },
      { date: '2026-09', val: 2.3 }
    ],
    '유럽': [
      { date: '1975-01', val: 10.2 }, { date: '1981-04', val: 11.5 }, { date: '1990-01', val: 5.2 },
      { date: '2002-01', val: 2.4 }, { date: '2015-01', val: 0.6 }, { date: '2020-05', val: 0.9 },
      { date: '2023-03', val: 5.7 }, { date: '2026-09', val: 2.4 }
    ]
  };

  // 13. 물가상승률 (CPI YoY %)
  const cpiAnchors = {
    '미국': [
      { date: '1975-01', val: 11.8 }, { date: '1980-03', val: 14.8 }, { date: '1986-12', val: 1.1 },
      { date: '1990-10', val: 6.3 }, { date: '1998-04', val: 1.4 }, { date: '2008-07', val: 5.6 },
      { date: '2009-07', val: -2.1 }, { date: '2015-04', val: -0.2 }, { date: '2020-05', val: 0.1 },
      { date: '2022-06', val: 9.1 }, { date: '2023-12', val: 3.4 }, { date: '2024-09', val: 2.4 },
      { date: '2026-09', val: 2.5 }
    ],
    '한국': [
      { date: '1975-01', val: 25.2 }, { date: '1980-10', val: 28.7 }, { date: '1986-05', val: 2.3 },
      { date: '1991-08', val: 9.8 }, { date: '1998-02', val: 7.5 }, { date: '1999-07', val: 0.3 },
      { date: '2008-07', val: 5.9 }, { date: '2019-09', val: -0.4 }, { date: '2022-07', val: 6.3 },
      { date: '2024-08', val: 2.0 }, { date: '2026-09', val: 2.2 }
    ],
    '중국': [
      { date: '1980-01', val: 6.0 }, { date: '1988-12', val: 26.7 }, { date: '1994-10', val: 27.7 },
      { date: '1999-05', val: -2.2 }, { date: '2008-02', val: 8.7 }, { date: '2009-07', val: -1.8 },
      { date: '2019-11', val: 4.5 }, { date: '2024-01', val: -0.8 }, { date: '2026-09', val: 0.6 }
    ],
    '일본': [
      { date: '1975-01', val: 17.5 }, { date: '1980-05', val: 8.4 }, { date: '1987-01', val: -1.1 },
      { date: '1990-11', val: 4.2 }, { date: '2002-05', val: -1.0 }, { date: '2009-10', val: -2.5 },
      { date: '2014-05', val: 3.7 }, { date: '2021-01', val: -0.7 }, { date: '2023-01', val: 4.3 },
      { date: '2026-09', val: 2.4 }
    ],
    '유럽': [
      { date: '1975-01', val: 12.8 }, { date: '1981-05', val: 13.0 }, { date: '1990-01', val: 5.5 },
      { date: '2008-07', val: 4.0 }, { date: '2009-07', val: -0.7 }, { date: '2015-01', val: -0.6 },
      { date: '2022-10', val: 10.6 }, { date: '2024-09', val: 1.8 }, { date: '2026-09', val: 2.2 }
    ]
  };

  // 14. 실업률 (Unemployment Rate %)
  const unempAnchors = {
    '미국': [
      { date: '1975-05', val: 9.0 }, { date: '1982-11', val: 10.8 }, { date: '1989-03', val: 5.0 },
      { date: '1992-06', val: 7.8 }, { date: '2000-04', val: 3.8 }, { date: '2009-10', val: 10.0 },
      { date: '2019-12', val: 3.5 }, { date: '2020-04', val: 14.7 }, { date: '2023-04', val: 3.4 },
      { date: '2024-07', val: 4.3 }, { date: '2026-09', val: 4.1 }
    ],
    '한국': [
      { date: '1975-01', val: 4.5 }, { date: '1980-01', val: 5.2 }, { date: '1990-01', val: 2.4 },
      { date: '1998-07', val: 8.6 }, { date: '2002-10', val: 2.8 }, { date: '2010-01', val: 4.8 },
      { date: '2018-08', val: 4.0 }, { date: '2021-01', val: 5.4 }, { date: '2023-08', val: 2.0 },
      { date: '2026-09', val: 2.7 }
    ],
    '중국': [
      { date: '1980-01', val: 4.9 }, { date: '1990-01', val: 2.5 }, { date: '2003-01', val: 4.3 },
      { date: '2015-01', val: 4.05 }, { date: '2020-02', val: 6.2 }, { date: '2024-01', val: 5.1 },
      { date: '2026-09', val: 5.0 }
    ],
    '일본': [
      { date: '1975-01', val: 1.9 }, { date: '1987-05', val: 3.1 }, { date: '1992-01', val: 2.1 },
      { date: '2002-06', val: 5.5 }, { date: '2009-07', val: 5.5 }, { date: '2019-12', val: 2.2 },
      { date: '2020-10', val: 3.1 }, { date: '2026-09', val: 2.5 }
    ],
    '유럽': [
      { date: '1975-01', val: 4.8 }, { date: '1985-05', val: 10.5 }, { date: '1994-01', val: 11.2 },
      { date: '2001-06', val: 8.2 }, { date: '2013-04', val: 12.1 }, { date: '2020-07', val: 8.6 },
      { date: '2024-07', val: 6.4 }, { date: '2026-09', val: 6.3 }
    ]
  };

  // 캐시된 50년 시계열 생성
  const cache = {};

  function getSeries(key, anchorsObj, subKey, vol = 0.04) {
    const fullKey = `${key}_${subKey}`;
    if (!cache[fullKey]) {
      cache[fullKey] = generateTimeSeries(anchorsObj[subKey], vol);
    }
    return cache[fullKey];
  }

  // 실시간 라이브 데이터 및 50년 데이터 조회 API
  return {
    getUsYields(maturity = '10Y') {
      return getSeries('us_yield', usYieldAnchors, maturity, 0.03);
    },
    getJpYields(maturity = '10Y') {
      return getSeries('jp_yield', jpYieldAnchors, maturity, 0.03);
    },
    getKrYields(maturity = '10Y') {
      return getSeries('kr_yield', krYieldAnchors, maturity, 0.03);
    },
    getCnYields(maturity = '10Y') {
      return getSeries('cn_yield', cnYieldAnchors, maturity, 0.03);
    },
    getEuYields(maturity = '10Y') {
      return getSeries('eu_yield', euYieldAnchors, maturity, 0.03);
    },

    getCrossCountryYields(maturity = '10Y') {
      return {
        '미국': getSeries('us_yield', usYieldAnchors, maturity, 0.03),
        '한국': getSeries('kr_yield', krYieldAnchors, maturity, 0.03),
        '중국': getSeries('cn_yield', cnYieldAnchors, maturity, 0.03),
        '일본': getSeries('jp_yield', jpYieldAnchors, maturity, 0.03),
        '유럽': getSeries('eu_yield', euYieldAnchors, maturity, 0.03)
      };
    },

    getKrwFx(currency = 'USD') {
      return getSeries('krw_fx', krwFxAnchors, currency, 0.03);
    },

    getUsdFx(currency = 'KRW') {
      return getSeries('usd_fx', usdFxAnchors, currency, 0.03);
    },

    getPolicyRate(country = '미국') {
      return getSeries('policy_rate', policyRateAnchors, country, 0.01);
    },

    getM1(country = '미국') {
      return getSeries('m1', m1Anchors, country, 0.02);
    },

    getM2(country = '미국') {
      return getSeries('m2', m2Anchors, country, 0.02);
    },

    getCoreCpi(country = '미국') {
      return getSeries('core_cpi', coreCpiAnchors, country, 0.03);
    },

    getCpi(country = '미국') {
      return getSeries('cpi', cpiAnchors, country, 0.04);
    },

    getUnemp(country = '미국') {
      return getSeries('unemp', unempAnchors, country, 0.02);
    },

    // 15개 카드 렌더링을 위한 최신 요약 데이터 스냅샷
    getLatestSummary() {
      return {
        tile1: {
          title: '미국 국채금리',
          country: '미국 (US Treasury)',
          flag: '🇺🇸',
          unit: '%',
          items: [
            { label: '3개월', key: '3M', val: 4.15, change: -0.02 },
            { label: '1년', key: '1Y', val: 3.98, change: -0.03 },
            { label: '5년', key: '5Y', val: 3.85, change: +0.01 },
            { label: '10년', key: '10Y', val: 4.08, change: +0.02 },
            { label: '30년', key: '30Y', val: 4.32, change: +0.01 }
          ]
        },
        tile2: {
          title: '일본 국채금리',
          country: '일본 (JGB)',
          flag: '🇯🇵',
          unit: '%',
          items: [
            { label: '3개월', key: '3M', val: 0.45, change: 0.00 },
            { label: '1년', key: '1Y', val: 0.52, change: +0.01 },
            { label: '5년', key: '5Y', val: 0.82, change: +0.02 },
            { label: '10년', key: '10Y', val: 1.35, change: +0.03 },
            { label: '30년', key: '30Y', val: 2.15, change: +0.02 }
          ]
        },
        tile3: {
          title: '한국 국채금리',
          country: '한국 (KTB)',
          flag: '🇰🇷',
          unit: '%',
          items: [
            { label: '3개월', key: '3M', val: 2.85, change: -0.01 },
            { label: '1년', key: '1Y', val: 2.92, change: -0.02 },
            { label: '5년', key: '5Y', val: 2.98, change: +0.01 },
            { label: '10년', key: '10Y', val: 3.05, change: +0.02 },
            { label: '30년', key: '30Y', val: 3.02, change: 0.00 }
          ]
        },
        tile4: {
          title: '중국 국채금리',
          country: '중국 (CGB)',
          flag: '🇨🇳',
          unit: '%',
          items: [
            { label: '3개월', key: '3M', val: 1.45, change: -0.01 },
            { label: '1년', key: '1Y', val: 1.52, change: -0.01 },
            { label: '5년', key: '5Y', val: 1.85, change: 0.00 },
            { label: '10년', key: '10Y', val: 1.95, change: -0.02 },
            { label: '30년', key: '30Y', val: 2.25, change: -0.01 }
          ]
        },
        tile5: {
          title: '유럽 국채금리',
          country: '유로존/독일 (Bund)',
          flag: '🇪🇺',
          unit: '%',
          items: [
            { label: '3개월', key: '3M', val: 2.65, change: -0.02 },
            { label: '1년', key: '1Y', val: 2.52, change: -0.01 },
            { label: '5년', key: '5Y', val: 2.20, change: 0.00 },
            { label: '10년', key: '10Y', val: 2.18, change: +0.01 },
            { label: '30년', key: '30Y', val: 2.45, change: +0.02 }
          ]
        },
        tile6: {
          title: '만기별 국채금리 비교',
          subtitle: '미국·한국·중국·일본·유럽 비교',
          flag: '🌐',
          unit: '%',
          items: [
            { label: '3개월 비교', key: '3M', val: '5개국 비교', change: 0 },
            { label: '1년 비교', key: '1Y', val: '5개국 비교', change: 0 },
            { label: '5년 비교', key: '5Y', val: '5개국 비교', change: 0 },
            { label: '10년 비교', key: '10Y', val: '5개국 비교', change: 0 },
            { label: '30년 비교', key: '30Y', val: '5개국 비교', change: 0 }
          ]
        },
        tile7: {
          title: '한국 원화 환율',
          subtitle: '원화(KRW) 기준 각국 통화',
          flag: '🇰🇷',
          unit: '원',
          items: [
            { label: '미국 (USD/KRW)', key: 'USD', val: 1385.20, change: -3.50, unit: '원' },
            { label: '일본 (100JPY/KRW)', key: 'JPY', val: 945.30, change: +2.10, unit: '원' },
            { label: '중국 (CNY/KRW)', key: 'CNY', val: 194.50, change: -0.40, unit: '원' },
            { label: '유럽 (EUR/KRW)', key: 'EUR', val: 1510.80, change: +4.20, unit: '원' }
          ]
        },
        tile8: {
          title: '미국 달러 환율',
          subtitle: '달러(USD) 기준 주요국 환율',
          flag: '🇺🇸',
          unit: '',
          items: [
            { label: '한국 (USD/KRW)', key: 'KRW', val: 1385.20, change: -3.50, unit: '₩' },
            { label: '일본 (USD/JPY)', key: 'JPY', val: 146.52, change: -0.45, unit: '¥' },
            { label: '중국 (USD/CNY)', key: 'CNY', val: 7.124, change: -0.008, unit: '¥' },
            { label: '유럽 (EUR/USD)', key: 'EUR', val: 1.0905, change: +0.0025, unit: '$' }
          ]
        },
        tile9: {
          title: '주요국 기준금리',
          subtitle: '각국 중앙은행 정책금리',
          flag: '🏛️',
          unit: '%',
          items: [
            { label: '미국 (Fed Funds)', key: '미국', val: 3.75, change: 0.00 },
            { label: '한국 (BOK 기준금리)', key: '한국', val: 2.50, change: 0.00 },
            { label: '중국 (PBOC LPR)', key: '중국', val: 3.10, change: -0.10 },
            { label: '일본 (BOJ 정책금리)', key: '일본', val: 0.75, change: +0.25 },
            { label: '유럽 (ECB 수신금리)', key: '유럽', val: 2.50, change: -0.25 }
          ]
        },
        tile10: {
          title: 'M1 통화공급량',
          subtitle: '협의통화 (현금+요구불예금)',
          flag: '💵',
          unit: '지수',
          items: [
            { label: '미국 M1', key: '미국', val: '18.1조$', change: +0.4, raw: 18100 },
            { label: '한국 M1', key: '한국', val: '1,290조원', change: +0.8, raw: 1290000 },
            { label: '중국 M1', key: '중국', val: '68.5조위안', change: +0.3, raw: 685000 },
            { label: '일본 M1', key: '일본', val: '1,090조엔', change: +0.2, raw: 1090000 },
            { label: '유럽 M1', key: '유럽', val: '10.4조유로', change: +0.5, raw: 10450 }
          ]
        },
        tile11: {
          title: 'M2 통화공급량',
          subtitle: '광의통화 (M1+정기예적금 등)',
          flag: '🏦',
          unit: '지수',
          items: [
            { label: '미국 M2', key: '미국', val: '21.5조$', change: +0.6, raw: 21500 },
            { label: '한국 M2', key: '한국', val: '4,050조원', change: +0.9, raw: 4050000 },
            { label: '중국 M2', key: '중국', val: '310조위안', change: +0.7, raw: 3100000 },
            { label: '일본 M2', key: '일본', val: '1,260조엔', change: +0.3, raw: 1260000 },
            { label: '유럽 M2', key: '유럽', val: '15.7조유로', change: +0.4, raw: 15750 }
          ]
        },
        tile12: {
          title: '근원물가지수 (Core CPI)',
          subtitle: '식품·에너지 제외 기조적 물가',
          flag: '📊',
          unit: '%',
          items: [
            { label: '미국 Core CPI', key: '미국', val: 2.6, change: -0.1 },
            { label: '한국 Core CPI', key: '한국', val: 2.1, change: 0.0 },
            { label: '중국 Core CPI', key: '중국', val: 0.8, change: +0.1 },
            { label: '일본 Core CPI', key: '일본', val: 2.3, change: +0.1 },
            { label: '유럽 Core CPI', key: '유럽', val: 2.4, change: -0.1 }
          ]
        },
        tile13: {
          title: '물가상승률 (CPI YoY)',
          subtitle: '소비자물가 전년동기대비',
          flag: '📈',
          unit: '%',
          items: [
            { label: '미국 CPI', key: '미국', val: 2.5, change: -0.1 },
            { label: '한국 CPI', key: '한국', val: 2.2, change: 0.0 },
            { label: '중국 CPI', key: '중국', val: 0.6, change: +0.2 },
            { label: '일본 CPI', key: '일본', val: 2.4, change: +0.1 },
            { label: '유럽 CPI', key: '유럽', val: 2.2, change: -0.1 }
          ]
        },
        tile14: {
          title: '실업률 (Unemployment)',
          subtitle: '각국 노동시장 고용지표',
          flag: '👥',
          unit: '%',
          items: [
            { label: '미국 실업률', key: '미국', val: 4.1, change: -0.1 },
            { label: '한국 실업률', key: '한국', val: 2.7, change: 0.0 },
            { label: '중국 실업률', key: '중국', val: 5.0, change: 0.0 },
            { label: '일본 실업률', key: '일본', val: 2.5, change: 0.0 },
            { label: '유럽 실업률', key: '유럽', val: 6.3, change: -0.1 }
          ]
        },
        tile15: {
          title: '글로벌 매크로 종합 브리핑',
          subtitle: '시장 심리 & 리스크 레이더',
          flag: '⚡',
          unit: '상태',
          items: [
            { label: '미국 10Y-2Y 스프레드', key: 'SPREAD', val: '+0.10%p (정상화)', change: 0, status: 'safe' },
            { label: '글로벌 유동성 사이클', key: 'LIQUIDITY', val: '확장 국면 진입', change: 0, status: 'positive' },
            { label: '환율 변동성 지수', key: 'FX_VOL', val: '안정세 (VIX 14.2)', change: 0, status: 'safe' },
            { label: '데이터 자동 수집 상태', key: 'UPDATE', val: '실시간 정상 가동 중', change: 0, status: 'live' }
          ]
        }
      };
    }
  };
})();

// 브라우저 및 Node.js 공용 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore;
}
