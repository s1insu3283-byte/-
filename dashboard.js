/**
 * GLOBAL MACRO DASHBOARD - APPLICATION CONTROLLER
 * 네이버 검색 실시간 '국채수익률' 및 환율 카드 정밀 연동 컨트롤러
 */

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('dashboardGrid');
  const chartModal = document.getElementById('chartModal');
  const guideModal = document.getElementById('guideModal');
  const kakaoModal = document.getElementById('kakaoModal');
  const liveClockEl = document.getElementById('liveClock');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const btnKakaoShare = document.getElementById('btnKakaoShare');
  const btnEmailShare = document.getElementById('btnEmailShare');
  const btnDeployGuide = document.getElementById('btnDeployGuide');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCloseGuide = document.getElementById('btnCloseGuide');
  const btnCloseKakao = document.getElementById('btnCloseKakao');

  const canvas = document.getElementById('chartCanvas');
  let chartEngine = null;

  let summaryData = DataStore.getLatestSummary();
  let isAutoRefresh = true;
  let currentModalSeries = null;
  let currentModalUnit = '%';

  function updateModalStats(startIdx, endIdx) {
    if (!currentModalSeries) return;
    const dates = currentModalSeries.dates;
    const vals = currentModalSeries.values;
    if (!vals || vals.length === 0) return;

    const s = Math.max(0, startIdx);
    const e = Math.min(vals.length - 1, endIdx);
    if (s > e) return;

    let min = Infinity, max = -Infinity, sum = 0;
    let minDate = '', maxDate = '';

    for (let i = s; i <= e; i++) {
      const v = vals[i];
      if (v < min) { min = v; minDate = dates[i]; }
      if (v > max) { max = v; maxDate = dates[i]; }
      sum += v;
    }
    const count = (e - s + 1);
    const avg = sum / count;
    const latest = vals[vals.length - 1];

    const u = currentModalUnit;
    const isPct = (u === '%');
    const isKrw = (u === '원');

    const fmt = (num) => {
      if (typeof num !== 'number' || isNaN(num)) return '-';
      if (isPct) return num.toFixed(2);
      if (isKrw) return Math.round(num).toLocaleString();
      if (num >= 1000) return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      return num.toFixed(2);
    };

    const statCurEl = document.getElementById('statCurrent');
    const statMaxEl = document.getElementById('statMax');
    const statMinEl = document.getElementById('statMin');
    const statAvgEl = document.getElementById('statAvg');

    if (statCurEl) statCurEl.textContent = `${fmt(latest)} ${u}`;
    if (statMaxEl) statMaxEl.textContent = `${fmt(max)} ${u} (${maxDate})`;
    if (statMinEl) statMinEl.textContent = `${fmt(min)} ${u} (${minDate})`;
    if (statAvgEl) statAvgEl.textContent = `${fmt(avg)} ${u}`;
  }

  function initChart() {
    chartEngine = new InteractiveChartEngine(canvas, {
      unit: '%',
      showLegend: true,
      onRangeChange: (startIdx, endIdx) => {
        updateModalStats(startIdx, endIdx);
      }
    });
    window.addEventListener('resize', () => {
      if (chartModal.classList.contains('active')) {
        chartEngine.resize();
      }
    });
  }

  function renderDashboard() {
    gridContainer.innerHTML = '';

    for (let i = 1; i <= 16; i++) {
      const tileKey = `tile${i}`;
      const tileInfo = summaryData[tileKey];
      if (!tileInfo) continue;

      const card = document.createElement('div');
      card.className = 'dash-card';
      card.id = `card-${i}`;

      const header = document.createElement('div');
      header.className = 'card-header';
      header.innerHTML = `
        <div class="header-left">
          <span class="tile-badge">#${i < 10 ? '0' + i : i}</span>
          <div>
            <div class="card-title">${tileInfo.title}</div>
            <div class="card-subtext">${tileInfo.country || tileInfo.subtitle || ''}</div>
          </div>
        </div>
        <div class="card-flag">${tileInfo.flag || '📈'}</div>
      `;
      card.appendChild(header);

      if (i === 6) {
        const body = document.createElement('div');
        body.className = 'maturity-tabs';
        tileInfo.items.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'maturity-btn';
          btn.dataset.key = item.key;
          btn.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:flex-start;">
              <span style="font-weight:700; font-size:0.85rem;">⏱️ ${item.label}</span>
              <span class="maturity-val" style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${item.val}</span>
            </div>
            <span style="font-size:0.72rem; color:var(--primary); font-weight:700;">5개국 차트 &rarr;</span>
          `;
          btn.addEventListener('click', () => {
            openCrossCountryChart(item.key, item.label);
          });
          body.appendChild(btn);
        });
        card.appendChild(body);
      } else if (i === 16) {
        const radar = document.createElement('div');
        radar.className = 'radar-list';
        tileInfo.items.forEach(item => {
          const it = document.createElement('div');
          it.className = 'radar-item';
          it.innerHTML = `
            <div class="radar-label">${item.label}</div>
            <div class="radar-val">${item.val}</div>
          `;
          radar.appendChild(it);
        });
        card.appendChild(radar);
      } else {
        const metricList = document.createElement('div');
        metricList.className = 'metric-list';

        tileInfo.items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'metric-row';
          row.dataset.tile = i;
          row.dataset.key = item.key;

          const changeClass = item.change > 0 ? 'change-up' : (item.change < 0 ? 'change-down' : 'change-flat');
          const changeSign = item.change > 0 ? '▲ +' : (item.change < 0 ? '▼ ' : '- ');
          
          let decimals = 2;
          if (i <= 5) decimals = 4; // 국채 수익률은 네이버처럼 4자리 정밀 표시
          let changeFormatted = '';
          if (item.change !== undefined) {
            if (i === 9) {
              if (item.change > 0) changeFormatted = `▲ +${item.change.toFixed(2)}%p`;
              else if (item.change < 0) changeFormatted = `▼ ${Math.abs(item.change).toFixed(2)}%p`;
              else changeFormatted = '동결';
            } else if (i === 10 || i === 11 || i === 12) {
              changeFormatted = `${changeSign}${Math.abs(item.change).toFixed(1)}%`;
            } else {
              changeFormatted = `${changeSign}${Math.abs(item.change).toFixed(decimals)}`;
            }
          }

          let displayVal = item.val;
          if (typeof displayVal === 'number') {
            displayVal = displayVal.toLocaleString(undefined, { minimumFractionDigits: i <= 5 ? 4 : 2, maximumFractionDigits: 4 });
          }

          row.innerHTML = `
            <div class="metric-label">
              <span>${item.label}</span>
              ${item.note ? `<span style="font-size:0.72rem; color:var(--text-muted); margin-left:6px; font-weight:normal;">${item.note}</span>` : ''}
            </div>
            <div class="metric-right">
              <span class="metric-val" id="val-${i}-${item.key}">${displayVal}${item.unit !== undefined ? item.unit : tileInfo.unit}</span>
              ${item.change !== undefined ? `<span class="metric-change ${changeClass}">${changeFormatted}</span>` : ''}
            </div>
          `;

          row.addEventListener('click', () => {
            if (i === 12) {
              openLiquidityCountryChart(item.key, item.label, tileInfo);
            } else {
              openSingleSeriesChart(i, item.key, item.label, tileInfo);
            }
          });

          metricList.appendChild(row);
        });
        card.appendChild(metricList);
      }

      const footer = document.createElement('div');
      footer.className = 'card-footer';
      if (i === 6) {
        footer.innerHTML = `<span>만기 클릭 시 5개국 동시 비교</span><span class="click-hint">차트 열기 🔍</span>`;
      } else if (i === 12) {
        footer.innerHTML = `<span>항목 클릭 시 50년 나라별 비교</span><span class="click-hint">차트 열기 🔍</span>`;
      } else if (i === 16) {
        footer.innerHTML = `<span>인베스팅 & 뉴스 100% 동기화</span><button id="btnCopyReport" style="background:transparent; border:none; color:var(--primary); font-size:0.75rem; font-weight:700; cursor:pointer;">요약 복사 📋</button>`;
      } else {
        footer.innerHTML = `<span>50년 시계열 인터랙티브</span><span class="click-hint">차트 열기 🔍</span>`;
      }
      card.appendChild(footer);

      if (tileInfo.news && tileInfo.news.length > 0) {
        const topNews = tileInfo.news[0];
        const newsBox = document.createElement('div');
        newsBox.className = 'card-news-box';
        newsBox.innerHTML = `
          <div class="news-header">
            <span class="news-tag">⚡ Investing.com 속보</span>
            <span class="news-date">${topNews.date}</span>
          </div>
          <a href="${topNews.link}" target="_blank" rel="noopener noreferrer" class="news-link" title="클릭 시 인베스팅 원문 기사로 이동">
            ${topNews.title} <span class="ext-icon">&nearr;</span>
          </a>
        `;
        card.appendChild(newsBox);
      }

      gridContainer.appendChild(card);
    }

    const copyReportBtn = document.getElementById('btnCopyReport');
    if (copyReportBtn) {
      copyReportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyBriefingToClipboard();
      });
    }
  }

  function removeLiquidityTabs() {
    const existing = document.getElementById('modalCountryTabs');
    if (existing) existing.remove();
  }

  function openSingleSeriesChart(tileId, itemKey, itemLabel, tileInfo) {
    removeLiquidityTabs();
    let seriesData = null;
    let unit = '%';

    switch (tileId) {
      case 1: seriesData = DataStore.getUsYields(itemKey); unit = '%'; break;
      case 2: seriesData = DataStore.getJpYields(itemKey); unit = '%'; break;
      case 3: seriesData = DataStore.getKrYields(itemKey); unit = '%'; break;
      case 4: seriesData = DataStore.getCnYields(itemKey); unit = '%'; break;
      case 5: seriesData = DataStore.getEuYields(itemKey); unit = '%'; break;
      case 7: seriesData = DataStore.getKrwFx(itemKey); unit = '원'; break;
      case 8: seriesData = DataStore.getUsdFx(itemKey); unit = (itemKey === 'KRW' ? '원' : (itemKey === 'JPY' ? '엔' : (itemKey === 'CNY' ? '위안' : '달러'))); break;
      case 9: seriesData = DataStore.getPolicyRate(itemKey); unit = '%'; break;
      case 10:
        seriesData = DataStore.getM1(itemKey);
        unit = (itemKey === '한국') ? '조원' : (itemKey === '미국' ? '조$' : (itemKey === '중국' ? '조위안' : (itemKey === '일본' ? '조엔' : '조유로')));
        break;
      case 11:
        seriesData = DataStore.getM2(itemKey);
        unit = (itemKey === '한국') ? '조원' : (itemKey === '미국' ? '조$' : (itemKey === '중국' ? '조위안' : (itemKey === '일본' ? '조엔' : '조유로')));
        break;
      case 13: seriesData = DataStore.getCoreCpi(itemKey); unit = '%'; break;
      case 14: seriesData = DataStore.getCpi(itemKey); unit = '%'; break;
      case 15: seriesData = DataStore.getUnemp(itemKey); unit = '%'; break;
    }

    if (!seriesData) return;

    // 1. Extract exact LIVE value from current card items
    const currentItem = tileInfo.items ? tileInfo.items.find(it => it.key === itemKey) : null;
    let liveNum = null;
    if (currentItem && currentItem.val !== undefined) {
      if (typeof currentItem.val === 'number') {
        liveNum = currentItem.val;
      } else if (typeof currentItem.val === 'string') {
        const cleaned = currentItem.val.replace(/[^0-9\.-]/g, '');
        liveNum = parseFloat(cleaned);
      }
    }

    // 2. Clone arrays to prevent mutating raw cached arrays while keeping live consistency
    const clonedDates = [...seriesData.dates];
    const clonedValues = [...seriesData.values];

    // Ensure the last data point matches the exact live value on the card!
    if (liveNum !== null && !isNaN(liveNum)) {
      clonedValues[clonedValues.length - 1] = liveNum;
    }

    document.getElementById('modalTitle').textContent = `${tileInfo.flag || '📊'} ${tileInfo.title} - ${itemLabel}`;
    document.getElementById('modalSubtitle').textContent = `1975년 ~ 2026년 50년간 역사적 시계열 추이 (실시간 공식 통계 일치)`;

    currentModalSeries = { dates: clonedDates, values: clonedValues };
    currentModalUnit = unit;

    chartEngine.options.unit = unit;
    chartEngine.setData([{
      name: itemLabel,
      dates: clonedDates,
      values: clonedValues,
      color: '#3b82f6'
    }]);

    setActivePreset('50Y');
    updateModalStats(chartEngine.viewStart, chartEngine.viewEnd);
    openModal();
  }

  function openCrossCountryChart(maturityKey, maturityLabel) {
    removeLiquidityTabs();
    const multi = DataStore.getCrossCountryYields(maturityKey);
    const countryColors = {
      '미국': '#3b82f6',
      '한국': '#ef4444',
      '중국': '#f59e0b',
      '일본': '#10b981',
      '유럽': '#a855f7'
    };

    const seriesArray = Object.keys(multi).map(country => ({
      name: `${country} (${maturityKey})`,
      dates: multi[country].dates,
      values: multi[country].values,
      color: countryColors[country] || '#64748b'
    }));

    document.getElementById('modalTitle').textContent = `🌐 만기별 국채금리 5개국 비교: ${maturityLabel}`;
    document.getElementById('modalSubtitle').textContent = `네이버 실시간 기준 5개국 50년 시계열 비교 그래프`;

    const usVals = multi['미국'].values;
    const krVals = multi['한국'].values;
    const latestUs = usVals[usVals.length - 1];
    const latestKr = krVals[krVals.length - 1];

    document.getElementById('statCurrent').textContent = `미국: ${latestUs}% / 한국: ${latestKr}%`;
    document.getElementById('statMax').textContent = `미국 1981년 16.3%`;
    document.getElementById('statMin').textContent = `일본 2016년 -0.3%`;
    document.getElementById('statAvg').textContent = `한미 금리차 ${(latestUs - latestKr).toFixed(3)}%p`;

    chartEngine.options.unit = '%';
    chartEngine.setData(seriesArray);

    setActivePreset('50Y');
    openModal();
  }

  function openLiquidityCountryChart(metricKey, metricLabel, tileInfo) {
    removeLiquidityTabs();

    const toolbar = document.querySelector('.modal-toolbar');
    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'modalCountryTabs';
    tabsContainer.className = 'liquidity-country-tabs';

    const tabOptions = [
      { id: 'MULTI', label: '🌐 5개국 비교 (조$)' },
      { id: 'KR', label: '🇰🇷 한국 (조원)' },
      { id: 'US', label: '🇺🇸 미국 (조$)' },
      { id: 'CN', label: '🇨🇳 중국 (조위안)' },
      { id: 'JP', label: '🇯🇵 일본 (조엔)' },
      { id: 'EU', label: '🇪🇺 유럽 (조유로)' },
      { id: 'PYRAMID', label: '📊 한국 4단계 피라미드' }
    ];

    let currentTab = 'MULTI';

    tabOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `country-tab-btn ${opt.id === currentTab ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.dataset.tab = opt.id;
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.country-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = opt.id;
        renderLiquiditySeries(currentTab);
      });
      tabsContainer.appendChild(btn);
    });

    if (toolbar) {
      toolbar.appendChild(tabsContainer);
    }

    function renderLiquiditySeries(tabId) {
      const modalTitleEl = document.getElementById('modalTitle');
      const modalSubtitleEl = document.getElementById('modalSubtitle');
      const statCurEl = document.getElementById('statCurrent');
      const statMaxEl = document.getElementById('statMax');
      const statMinEl = document.getElementById('statMin');
      const statAvgEl = document.getElementById('statAvg');

      const countryColors = {
        '미국 ($)': '#3b82f6',
        '미국': '#3b82f6',
        '한국 (환산$)': '#ef4444',
        '한국': '#ef4444',
        '중국 (환산$)': '#f59e0b',
        '중국': '#f59e0b',
        '일본 (환산$)': '#10b981',
        '일본': '#10b981',
        '유럽 (환산$)': '#a855f7',
        '유럽': '#a855f7',
        'M1 (협의통화)': '#3b82f6',
        'M2 (광의통화)': '#10b981',
        'Lf (금융기관유동성)': '#f59e0b',
        'L (광의유동성)': '#ef4444'
      };

      if (tabId === 'MULTI') {
        const multi = DataStore.getCrossCountryMoneyUSD(metricKey);
        const seriesArray = Object.keys(multi).map(name => ({
          name: name,
          dates: multi[name].dates,
          values: multi[name].values,
          color: countryColors[name] || '#64748b'
        }));

        modalTitleEl.textContent = `🌐 ${metricLabel} - 5개국 50년 시계열 비교`;
        modalSubtitleEl.textContent = `1975년 ~ 2026년 5개국 통화 유동성 팽창 추이 (조 달러 USD 동일 환산 스케일)`;

        currentModalSeries = seriesArray[0];
        currentModalUnit = '조$';
        chartEngine.options.unit = '조$';
        chartEngine.setData(seriesArray);

        if (statCurEl) statCurEl.textContent = `미국 19.89조$ | 중국 17.21조$ | 한국 1.04조$`;
        if (statMaxEl) statMaxEl.textContent = `미국 2026년 최고치 기록 (19.89조$)`;
        if (statMinEl) statMinEl.textContent = `1975년 한국 0.001조$`;
        if (statAvgEl) statAvgEl.textContent = `글로벌 유동성 50년 연평균 약 +8.2% 팽창`;
      } else if (tabId === 'PYRAMID') {
        const pyr = DataStore.getCountryLiquidityPyramid('한국');
        const seriesArray = Object.keys(pyr).map(name => ({
          name: name,
          dates: pyr[name].dates,
          values: pyr[name].values,
          color: countryColors[name] || '#64748b'
        }));

        modalTitleEl.textContent = `📊 한국은행 4단계 유동성 체계 50년 추이 (M1·M2·Lf·L)`;
        modalSubtitleEl.textContent = `1975년 ~ 2026년 한국은행(BOK) ECOS 공식 4대 유동성 지표 총비교`;

        currentModalSeries = seriesArray[3];
        currentModalUnit = '조원';
        chartEngine.options.unit = '조원';
        chartEngine.setData(seriesArray);

        if (statCurEl) statCurEl.textContent = `M1 1,395.9조 | M2 4,209.7조 | Lf 5,540.8조 | L 6,920.5조`;
        if (statMaxEl) statMaxEl.textContent = `2026년 역대 최고 (L 6,920.5조원)`;
        if (statMinEl) statMinEl.textContent = `1975년 (M1 0.8조원 / L 6.2조원)`;
        if (statAvgEl) statAvgEl.textContent = `L 대비 M1: 20.2% | M2: 60.8% | Lf: 80.1%`;
      } else {
        const countryMap = { 'KR': '한국', 'US': '미국', 'CN': '중국', 'JP': '일본', 'EU': '유럽' };
        const cName = countryMap[tabId];
        let series = null;
        let u = '조원';

        if (metricKey === 'M1') series = DataStore.getM1(cName);
        else if (metricKey === 'M2') series = DataStore.getM2(cName);
        else if (metricKey === 'Lf') series = DataStore.getLf(cName);
        else if (metricKey === 'L') series = DataStore.getL(cName);

        if (cName === '한국') u = '조원';
        else if (cName === '미국') u = '조$';
        else if (cName === '중국') u = '조위안';
        else if (cName === '일본') u = '조엔';
        else if (cName === '유럽') u = '조유로';

        modalTitleEl.textContent = `${cName} ${metricLabel} 50년 시계열 추이`;
        modalSubtitleEl.textContent = `1975년 ~ 2026년 ${cName} 중앙은행 공식 발표치 (${u} 기준)`;

        const clonedVals = [...series.values];
        currentModalSeries = { dates: series.dates, values: clonedVals };
        currentModalUnit = u;
        chartEngine.options.unit = u;
        chartEngine.setData([{
          name: `${cName} ${metricLabel}`,
          dates: series.dates,
          values: clonedVals,
          color: countryColors[cName] || '#3b82f6'
        }]);

        updateModalStats(chartEngine.viewStart, chartEngine.viewEnd);
      }
    }

    renderLiquiditySeries('MULTI');
    setActivePreset('50Y');
    openModal();
  }

  function openModal() {
    chartModal.classList.add('active');
    setTimeout(() => { chartEngine.resize(); }, 50);
  }

  function closeModal() {
    chartModal.classList.remove('active');
    removeLiquidityTabs();
  }

  btnCloseModal.addEventListener('click', closeModal);
  chartModal.addEventListener('click', (e) => {
    if (e.target === chartModal) closeModal();
  });

  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const years = btn.dataset.range;
      setActivePreset(years);
      if (years === 'MAX') {
        chartEngine.setPresetRange('MAX');
      } else {
        chartEngine.setPresetRange(parseInt(years, 10));
      }
    });
  });

  function setActivePreset(range) {
    activePreset = range;
    presetButtons.forEach(b => {
      b.classList.toggle('active', b.dataset.range === range);
    });
  }

  document.getElementById('btnZoomIn').addEventListener('click', () => chartEngine.zoom(0.75));
  document.getElementById('btnZoomOut').addEventListener('click', () => chartEngine.zoom(1.3));
  document.getElementById('btnZoomReset').addEventListener('click', () => {
    setActivePreset('50Y');
    chartEngine.resetZoom();
  });

  function updateClock() {
    const now = new Date();
    const str = now.toLocaleTimeString('ko-KR', { hour12: false });
    if (liveClockEl) {
      liveClockEl.textContent = `${str} LIVE`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  let newsRotationIdx = 0;

  function updateDashboardInPlace() {
    if (!gridContainer || gridContainer.children.length === 0) {
      renderDashboard();
      return;
    }

    newsRotationIdx++;

    for (let i = 1; i <= 16; i++) {
      const tileKey = `tile${i}`;
      const tileInfo = summaryData[tileKey];
      if (!tileInfo) continue;

      const card = document.getElementById(`card-${i}`);
      if (!card) continue;

      // 1. Update metric items in place
      if (tileInfo.items && i !== 6) {
        tileInfo.items.forEach(item => {
          const valEl = document.getElementById(`val-${i}-${item.key}`);
          if (valEl) {
            let decimals = (i <= 5) ? 4 : 2;
            let displayVal = item.val;
            if (typeof displayVal === 'number') {
              displayVal = displayVal.toLocaleString(undefined, {
                minimumFractionDigits: (i <= 5) ? 4 : 2,
                maximumFractionDigits: 4
              });
            }
            const fullText = `${displayVal}${item.unit !== undefined ? item.unit : tileInfo.unit}`;
            if (valEl.textContent !== fullText) {
              valEl.textContent = fullText;
              const row = valEl.closest('.metric-row');
              if (row) {
                row.classList.remove('flash-up', 'flash-down');
                void row.offsetWidth;
                row.classList.add(item.change >= 0 ? 'flash-up' : 'flash-down');
              }
            }

            const row = valEl.closest('.metric-row');
            if (row && item.change !== undefined) {
              const changeEl = row.querySelector('.metric-change');
              if (changeEl) {
                const changeClass = item.change > 0 ? 'change-up' : (item.change < 0 ? 'change-down' : 'change-flat');
                const changeSign = item.change > 0 ? '▲ +' : (item.change < 0 ? '▼ ' : '- ');
                let changeFormatted = '';
                if (i === 9) {
                  if (item.change > 0) changeFormatted = `▲ +${item.change.toFixed(2)}%p`;
                  else if (item.change < 0) changeFormatted = `▼ ${Math.abs(item.change).toFixed(2)}%p`;
                  else changeFormatted = '동결';
                } else if (i === 10 || i === 11 || i === 12) {
                  changeFormatted = `${changeSign}${Math.abs(item.change).toFixed(1)}%`;
                } else {
                  changeFormatted = `${changeSign}${Math.abs(item.change).toFixed(decimals)}`;
                }
                changeEl.className = `metric-change ${changeClass}`;
                changeEl.textContent = changeFormatted;
              }
            }
          }
        });
      } else if (i === 6 && tileInfo.items) {
        tileInfo.items.forEach(item => {
          const btn = card.querySelector(`.maturity-btn[data-key="${item.key}"]`);
          if (btn) {
            const valSpan = btn.querySelector('.maturity-val');
            if (valSpan && valSpan.textContent !== item.val) {
              valSpan.textContent = item.val;
            }
          }
        });
      }

      // 2. Rotate news headlines smoothly every 3 seconds
      if (tileInfo.news && tileInfo.news.length > 0) {
        let newsBox = card.querySelector('.card-news-box');
        if (!newsBox) {
          newsBox = document.createElement('div');
          newsBox.className = 'card-news-box';
          card.appendChild(newsBox);
        }
        const article = tileInfo.news[newsRotationIdx % tileInfo.news.length];
        newsBox.innerHTML = `
          <div class="news-header">
            <span class="news-tag">⚡ Investing.com 속보</span>
            <span class="news-date">${article.date}</span>
          </div>
          <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="news-link" title="클릭 시 인베스팅 원문 기사로 이동">
            ${article.title} <span class="ext-icon">&nearr;</span>
          </a>
        `;
        newsBox.classList.remove('news-updated');
        void newsBox.offsetWidth;
        newsBox.classList.add('news-updated');
      }
    }
  }

  async function loadNaverAndLiveRates() {
    try {
      const res = await fetch(`./naver_data.json?t=${Date.now()}`);
      if (res.ok) {
        const nData = await res.json();
        if (nData && nData.naver_search_bonds) {
          const bonds = nData.naver_search_bonds;

          // 5개국 국채금리 실시간 정밀 연동 헬퍼 함수
          const updateBondTile = (tileId, cKey, rawNames) => {
            const cData = bonds[cKey];
            if (!cData || !summaryData[tileId]) return;
            const mats = cData.maturities || {};
            const items = summaryData[tileId].items;

            const matKeys = ['3M', '1Y', '5Y', '10Y', '30Y'];
            matKeys.forEach((mk, idx) => {
              const rawName = rawNames[idx];
              const entry = mats[mk] || cData[rawName] || (cData.items && cData.items[rawName]);
              if (entry && items[idx]) {
                items[idx].val = entry.val;
                if (entry.change !== undefined) items[idx].change = entry.change;
                if (window.DataStore && DataStore.updateLatestBondYield) {
                  DataStore.updateLatestBondYield(cKey, mk, entry.val);
                }
              }
            });
          };

          // 1. 미국 (US - Tile 1)
          updateBondTile('tile1', 'US', ['미국 국채 3개월', '미국 국채 1년', '미국 국채 5년', '미국 국채 10년', '미국 국채 30년']);
          // 2. 일본 (JP - Tile 2)
          updateBondTile('tile2', 'JP', ['일본 국채 3개월', '일본 국채 1년', '일본 국채 5년', '일본 국채 10년', '일본 국채 30년']);
          // 3. 한국 (KR - Tile 3)
          updateBondTile('tile3', 'KR', ['한국 국채 3개월', '한국 국채 1년', '한국 국채 5년', '한국 국채 10년', '한국 국채 30년']);
          // 4. 중국 (CN - Tile 4)
          updateBondTile('tile4', 'CN', ['중국 국채 3개월', '중국 국채 1년', '중국 국채 5년', '중국 국채 10년', '중국 국채 30년']);
          // 5. 유럽/독일 (DE - Tile 5)
          updateBondTile('tile5', 'DE', ['독일 국채 3개월', '독일 국채 1년', '독일 국채 5년', '독일 국채 10년', '독일 국채 30년']);

          // 6. 만기별 5개국 비교 (Tile 6)
          if (summaryData.tile6 && summaryData.tile6.items) {
            const matKeys = ['3M', '1Y', '5Y', '10Y', '30Y'];
            matKeys.forEach((mk, idx) => {
              const u = summaryData.tile1?.items[idx]?.val?.toFixed(2) || '-';
              const k = summaryData.tile3?.items[idx]?.val?.toFixed(2) || '-';
              const j = summaryData.tile2?.items[idx]?.val?.toFixed(2) || '-';
              const c = summaryData.tile4?.items[idx]?.val?.toFixed(2) || '-';
              const d = summaryData.tile5?.items[idx]?.val?.toFixed(2) || '-';
              summaryData.tile6.items[idx].val = `美 ${u}% | 韓 ${k}% | 일 ${j}% | 중 ${c}% | 독 ${d}%`;
            });
          }
        }
          if (nData.naver_policy_rates) {
            const pr = nData.naver_policy_rates;
            const mapping = {
              '미국연방준비은행': '미국',
              '한국은행': '한국',
              '유럽중앙은행': '유럽',
              '일본은행': '일본',
              '중국인민은행': '중국'
            };
            Object.keys(mapping).forEach(bankName => {
              const countryKey = mapping[bankName];
              if (pr[bankName] && summaryData.tile9) {
                const it = summaryData.tile9.items.find(x => x.key === countryKey);
                if (it) {
                  it.val = pr[bankName].rate;
                  it.change = pr[bankName].change;
                  it.note = `${pr[bankName].date} 고시`;
                }
              }
            });
          }
          if (nData.rates) {
            const r = nData.rates;
            if (r.USD_KRW && summaryData.tile7) {
              const it = summaryData.tile7.items.find(x => x.key === 'USD');
              if (it) it.val = r.USD_KRW;
            }
            if (r.JPY100_KRW && summaryData.tile7) {
              const it = summaryData.tile7.items.find(x => x.key === 'JPY');
              if (it) it.val = r.JPY100_KRW;
            }
            if (r.CNY_KRW && summaryData.tile7) {
              const it = summaryData.tile7.items.find(x => x.key === 'CNY');
              if (it) it.val = r.CNY_KRW;
            }
            if (r.EUR_KRW && summaryData.tile7) {
              const it = summaryData.tile7.items.find(x => x.key === 'EUR');
              if (it) it.val = r.EUR_KRW;
            }
            if (r.USD_KRW && summaryData.tile8) {
              const it = summaryData.tile8.items.find(x => x.key === 'KRW');
              if (it) it.val = r.USD_KRW;
            }
            if (r.USD_JPY && summaryData.tile8) {
              const it = summaryData.tile8.items.find(x => x.key === 'JPY');
              if (it) it.val = r.USD_JPY;
            }
            if (r.USD_CNY && summaryData.tile8) {
              const it = summaryData.tile8.items.find(x => x.key === 'CNY');
              if (it) it.val = r.USD_CNY;
            }
            if (r.EUR_USD && summaryData.tile8) {
              const it = summaryData.tile8.items.find(x => x.key === 'EUR');
              if (it) it.val = r.EUR_USD;
            }
          }
          if (nData.macro_indicators) {
            const mi = nData.macro_indicators;
            if (mi.liquidity && summaryData.tile12) {
              summaryData.tile12.items.forEach(it => {
                if (mi.liquidity[it.key]) {
                  it.val = mi.liquidity[it.key].val;
                  it.change = mi.liquidity[it.key].change;
                  if (mi.liquidity[it.key].note) it.note = mi.liquidity[it.key].note;
                }
              });
            }
            if (mi.core_cpi && summaryData.tile13) {
              summaryData.tile13.items.forEach(it => {
                if (mi.core_cpi[it.key]) {
                  it.val = mi.core_cpi[it.key].val;
                  it.change = mi.core_cpi[it.key].change;
                  if (mi.core_cpi[it.key].note) it.note = mi.core_cpi[it.key].note;
                }
              });
            }
            if (mi.cpi && summaryData.tile14) {
              summaryData.tile14.items.forEach(it => {
                if (mi.cpi[it.key]) {
                  it.val = mi.cpi[it.key].val;
                  it.change = mi.cpi[it.key].change;
                  if (mi.cpi[it.key].note) it.note = mi.cpi[it.key].note;
                }
              });
            }
            if (mi.unemployment && summaryData.tile15) {
              summaryData.tile15.items.forEach(it => {
                if (mi.unemployment[it.key]) {
                  it.val = mi.unemployment[it.key].val;
                  it.change = mi.unemployment[it.key].change;
                  if (mi.unemployment[it.key].note) it.note = mi.unemployment[it.key].note;
                }
              });
            }
          }
          if (nData.investing_news) {
            Object.keys(nData.investing_news).forEach(tKey => {
              if (summaryData[tKey]) {
                summaryData[tKey].news = nData.investing_news[tKey];
              }
            });
          }
        }
      } catch (e) {
        // offline fallback
      }

    updateDashboardInPlace();

    // 3초 갱신 펄스 애니메이션
    if (btnSyncNaver) {
      btnSyncNaver.classList.remove('pulse-3s');
      void btnSyncNaver.offsetWidth;
      btnSyncNaver.classList.add('pulse-3s');
    }
  }

  const btnSyncNaver = document.getElementById('btnSyncNaver');
  const syncBtnText = document.getElementById('syncBtnText');
  if (btnSyncNaver) {
    btnSyncNaver.addEventListener('click', async () => {
      btnSyncNaver.classList.add('spinning');
      if (syncBtnText) syncBtnText.textContent = '실시간 동기화 중...';
      await loadNaverAndLiveRates();
      setTimeout(() => {
        btnSyncNaver.classList.remove('spinning');
        if (syncBtnText) syncBtnText.textContent = '동기화 완료!';
        setTimeout(() => {
          if (syncBtnText) syncBtnText.textContent = '3초 자동 갱신 ON';
        }, 1500);
      }, 400);
    });
  }

  // 3초마다 지속적으로 인베스팅 & 뉴스 자동 갱신
  const AUTO_REFRESH_INTERVAL = 3000;
  setInterval(() => {
    if (isAutoRefresh) {
      loadNaverAndLiveRates();
    }
  }, AUTO_REFRESH_INTERVAL);

  loadNaverAndLiveRates();

  // 실제 네이버 실시간 데이터만을 3초마다 정밀 반영 (인위적 시뮬레이션 제거)

  btnKakaoShare.addEventListener('click', () => handleKakaoShare());

  function handleKakaoShare() {
    const currentUrl = window.location.href;
    const title = "📊 [네이버 국채수익률 실시간] 글로벌 매크로 경제 대시보드";
    const desc = `• 미국 10Y: ${summaryData.tile1.items[3].val}% | 30Y: ${summaryData.tile1.items[4].val}%\n• 한국 10Y: ${summaryData.tile3.items[3].val}% | 원/달러: ${summaryData.tile7.items[0].val}원\n네이버 검색 실시간 수치와 50년 차트를 확인하세요!`;

    if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: title,
            description: desc,
            imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
            link: { mobileWebUrl: currentUrl, webUrl: currentUrl },
          },
          buttons: [{ title: '대시보드 바로보기', link: { mobileWebUrl: currentUrl, webUrl: currentUrl } }],
        });
        return;
      } catch (err) {}
    }

    if (navigator.share) {
      navigator.share({ title, text: `${desc}\n\n접속 주소:\n${currentUrl}`, url: currentUrl }).catch((err) => {
        if (err.name !== 'AbortError') openKakaoModal(title, desc, currentUrl);
      });
      return;
    }
    openKakaoModal(title, desc, currentUrl);
  }

  function openKakaoModal(title, desc, currentUrl) {
    document.getElementById('kakaoPreviewText').value = `${title}\n\n${desc}\n\n접속 링크: ${currentUrl}`;
    kakaoModal.classList.add('active');
  }

  btnCloseKakao.addEventListener('click', () => kakaoModal.classList.remove('active'));
  kakaoModal.addEventListener('click', (e) => {
    if (e.target === kakaoModal) kakaoModal.classList.remove('active');
  });

  document.getElementById('btnCopyKakao').addEventListener('click', () => {
    const text = document.getElementById('kakaoPreviewText').value;
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ 카카오톡 전송용 대시보드 요약 및 링크가 복사되었습니다!');
    });
  });

  btnEmailShare.addEventListener('click', () => {
    const currentUrl = window.location.href;
    const now = new Date().toLocaleString('ko-KR');
    const subject = encodeURIComponent(`[글로벌 매크로 대시보드] 네이버 실시간 금리·환율 (${now})`);
    const bodyText = `[네이버 검색 실시간 매크로 지표 브리핑]
발송 일시: ${now}

■ 미국 국채금리 (네이버 국채수익률)
- 10년물: ${summaryData.tile1.items[3].val}%
- 30년물: ${summaryData.tile1.items[4].val}%
- 5년물: ${summaryData.tile1.items[2].val}%

■ 한국 국채금리 (네이버 국채수익률)
- 10년물: ${summaryData.tile3.items[3].val}%
- 5년물: ${summaryData.tile3.items[2].val}%

■ 주요 환율
- 원/달러: ${summaryData.tile7.items[0].val}원
- 100엔/원: ${summaryData.tile7.items[1].val}원

■ 50년 시계열 대시보드
${currentUrl}`;

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  });

  function copyBriefingToClipboard() {
    const currentUrl = window.location.href;
    const now = new Date().toLocaleString('ko-KR');
    const report = `[네이버 국채수익률 실시간 요약 - ${now}]
• 미국 10Y: ${summaryData.tile1.items[3].val}% | 30Y: ${summaryData.tile1.items[4].val}%
• 한국 10Y: ${summaryData.tile3.items[3].val}% | 5Y: ${summaryData.tile3.items[2].val}%
• 원/달러: ${summaryData.tile7.items[0].val}원
• 대시보드: ${currentUrl}`;
    navigator.clipboard.writeText(report).then(() => {
      alert('📋 네이버 실시간 요약 리포트가 복사되었습니다!');
    });
  }

  btnDeployGuide.addEventListener('click', () => guideModal.classList.add('active'));
  btnCloseGuide.addEventListener('click', () => guideModal.classList.remove('active'));
  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) guideModal.classList.remove('active');
  });

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggleBtn.innerHTML = isLight ? '☀️ 라이트 모드' : '🌙 다크 모드';
    if (chartModal.classList.contains('active') && chartEngine) {
      chartEngine.render();
    }
  });

  // ==========================================================================
  // MOBILE SMARTPHONE DIRECT CONNECT (QR CODE & URL)
  // ==========================================================================
  const mobileModal = document.getElementById('mobileModal');
  const btnMobileConnect = document.getElementById('btnMobileConnect');
  const btnCloseMobile = document.getElementById('btnCloseMobile');
  const tabQrGh = document.getElementById('tabQrGh');
  const tabQrWifi = document.getElementById('tabQrWifi');
  const qrImage = document.getElementById('qrImage');
  const mobileDirectUrl = document.getElementById('mobileDirectUrl');
  const btnCopyMobileUrl = document.getElementById('btnCopyMobileUrl');
  const btnSendMobileKakao = document.getElementById('btnSendMobileKakao');

  if (btnMobileConnect && mobileModal) {
    btnMobileConnect.addEventListener('click', () => {
      mobileModal.classList.add('active');
    });
    if (btnCloseMobile) {
      btnCloseMobile.addEventListener('click', () => mobileModal.classList.remove('active'));
    }
    mobileModal.addEventListener('click', (e) => {
      if (e.target === mobileModal) mobileModal.classList.remove('active');
    });

    if (tabQrGh && tabQrWifi && qrImage && mobileDirectUrl) {
      tabQrGh.addEventListener('click', () => {
        tabQrGh.style.background = 'var(--primary)';
        tabQrGh.style.color = '#fff';
        tabQrGh.style.border = 'none';
        tabQrWifi.style.background = 'var(--bg-main)';
        tabQrWifi.style.color = 'var(--text-muted)';
        tabQrWifi.style.border = '1px solid var(--border-color)';
        qrImage.src = 'qr_github_pages.svg';
        mobileDirectUrl.value = 'https://s1insu3283-byte.github.io/-/';
      });
      tabQrWifi.addEventListener('click', () => {
        tabQrWifi.style.background = 'var(--primary)';
        tabQrWifi.style.color = '#fff';
        tabQrWifi.style.border = 'none';
        tabQrGh.style.background = 'var(--bg-main)';
        tabQrGh.style.color = 'var(--text-muted)';
        tabQrGh.style.border = '1px solid var(--border-color)';
        qrImage.src = 'qr_local_wifi.svg';
        mobileDirectUrl.value = 'http://192.168.0.11:8080';
      });
    }

    if (btnCopyMobileUrl && mobileDirectUrl) {
      btnCopyMobileUrl.addEventListener('click', () => {
        navigator.clipboard.writeText(mobileDirectUrl.value).then(() => {
          btnCopyMobileUrl.textContent = '✅ 복사 완료!';
          setTimeout(() => { btnCopyMobileUrl.textContent = '📋 주소 복사'; }, 2000);
        });
      });
    }

    if (btnSendMobileKakao) {
      btnSendMobileKakao.addEventListener('click', () => {
        const url = mobileDirectUrl ? mobileDirectUrl.value : 'https://s1insu3283-byte.github.io/-/';
        const title = '📱 [실시간 매크로 대시보드] 핸드폰 바로보기';
        const desc = '미국·한국·일본·중국·유럽 5개국 네이버 국채수익률 및 실시간 환율 50년 대시보드입니다.';
        if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
          try {
            window.Kakao.Share.sendDefault({
              objectType: 'feed',
              content: {
                title: title,
                description: desc,
                imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
                link: { mobileWebUrl: url, webUrl: url },
              },
              buttons: [{ title: '핸드폰에서 바로 열기', link: { mobileWebUrl: url, webUrl: url } }],
            });
            return;
          } catch (e) {}
        }
        navigator.clipboard.writeText(`${title}\n${desc}\n${url}`).then(() => {
          alert('✅ 스마트폰 접속 링크가 복사되었습니다! 카카오톡에 붙여넣기 하세요.');
        });
      });
    }
  }

  initChart();
  renderDashboard();
});
