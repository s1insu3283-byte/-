/**
 * GLOBAL MACRO DASHBOARD - APPLICATION CONTROLLER
 * 15개 타일 관리, 모달 차트 제어, 실시간 틱 업데이트, 카카오톡/이메일 공유 기능
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
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

  // Chart Engine Instance
  const canvas = document.getElementById('chartCanvas');
  let chartEngine = null;

  // App State
  let summaryData = DataStore.getLatestSummary();
  let isAutoRefresh = true;
  let activePreset = '50Y';

  // 1. Initialize Chart Engine
  function initChart() {
    chartEngine = new InteractiveChartEngine(canvas, {
      unit: '%',
      showLegend: true
    });
    window.addEventListener('resize', () => {
      if (chartModal.classList.contains('active')) {
        chartEngine.resize();
      }
    });
  }

  // 2. Render 15 Tiles in 5x3 Grid
  function renderDashboard() {
    gridContainer.innerHTML = '';

    for (let i = 1; i <= 15; i++) {
      const tileKey = `tile${i}`;
      const tileInfo = summaryData[tileKey];
      if (!tileInfo) continue;

      const card = document.createElement('div');
      card.className = 'dash-card';
      card.id = `card-${i}`;

      // Card Header
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

      // Card Body
      if (i === 6) {
        // Tile 6: 만기별 5개국 비교 (특별 레이아웃)
        const body = document.createElement('div');
        body.className = 'maturity-tabs';
        tileInfo.items.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'maturity-btn';
          btn.innerHTML = `
            <span>⏱️ ${item.label}</span>
            <span style="font-size:0.75rem; color:var(--primary); font-weight:700;">5개국 비교 차트 &rarr;</span>
          `;
          btn.addEventListener('click', () => {
            openCrossCountryChart(item.key, item.label);
          });
          body.appendChild(btn);
        });
        card.appendChild(body);
      } else if (i === 15) {
        // Tile 15: 글로벌 매크로 종합 브리핑 & 리스크 레이더
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
        // 일반 1~5, 7~14번 타일
        const metricList = document.createElement('div');
        metricList.className = 'metric-list';

        tileInfo.items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'metric-row';
          row.dataset.tile = i;
          row.dataset.key = item.key;

          const changeClass = item.change > 0 ? 'change-up' : (item.change < 0 ? 'change-down' : 'change-flat');
          const changeSign = item.change > 0 ? '▲ +' : (item.change < 0 ? '▼ ' : '- ');
          const changeFormatted = item.change !== undefined ? `${changeSign}${Math.abs(item.change).toFixed(2)}` : '';

          let displayVal = item.val;
          if (typeof displayVal === 'number') {
            displayVal = displayVal.toLocaleString();
          }

          row.innerHTML = `
            <div class="metric-label">
              <span>${item.label}</span>
            </div>
            <div class="metric-right">
              <span class="metric-val" id="val-${i}-${item.key}">${displayVal}${item.unit !== undefined ? item.unit : tileInfo.unit}</span>
              ${item.change !== undefined ? `<span class="metric-change ${changeClass}">${changeFormatted}</span>` : ''}
            </div>
          `;

          row.addEventListener('click', () => {
            openSingleSeriesChart(i, item.key, item.label, tileInfo);
          });

          metricList.appendChild(row);
        });
        card.appendChild(metricList);
      }

      // Card Footer
      const footer = document.createElement('div');
      footer.className = 'card-footer';
      if (i === 6) {
        footer.innerHTML = `<span>만기 선택 시 5개국 동시 비교</span><span class="click-hint">클릭 🔍</span>`;
      } else if (i === 15) {
        footer.innerHTML = `<span>종합 지표 정상 가동</span><button id="btnCopyReport" style="background:transparent; border:none; color:var(--primary); font-size:0.75rem; font-weight:700; cursor:pointer;">요약 복사 📋</button>`;
      } else {
        footer.innerHTML = `<span>50년 시계열 인터랙티브</span><span class="click-hint">클릭 🔍</span>`;
      }
      card.appendChild(footer);

      gridContainer.appendChild(card);
    }

    // 15번 요약 복사 버튼 이벤트 바인딩
    const copyReportBtn = document.getElementById('btnCopyReport');
    if (copyReportBtn) {
      copyReportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyBriefingToClipboard();
      });
    }
  }

  // 3. Open Single Series Chart Modal (Tiles 1-5, 7-14)
  function openSingleSeriesChart(tileId, itemKey, itemLabel, tileInfo) {
    let seriesData = null;
    let unit = tileInfo.unit || '';
    let seriesName = `${tileInfo.title} (${itemLabel})`;

    // DataStore mapping
    switch (tileId) {
      case 1: seriesData = DataStore.getUsYields(itemKey); unit = '%'; break;
      case 2: seriesData = DataStore.getJpYields(itemKey); unit = '%'; break;
      case 3: seriesData = DataStore.getKrYields(itemKey); unit = '%'; break;
      case 4: seriesData = DataStore.getCnYields(itemKey); unit = '%'; break;
      case 5: seriesData = DataStore.getEuYields(itemKey); unit = '%'; break;
      case 7: seriesData = DataStore.getKrwFx(itemKey); unit = '원'; break;
      case 8: seriesData = DataStore.getUsdFx(itemKey); unit = itemKey === 'KRW' ? '원' : ''; break;
      case 9: seriesData = DataStore.getPolicyRate(itemKey); unit = '%'; break;
      case 10: seriesData = DataStore.getM1(itemKey); unit = '지수'; break;
      case 11: seriesData = DataStore.getM2(itemKey); unit = '지수'; break;
      case 12: seriesData = DataStore.getCoreCpi(itemKey); unit = '%'; break;
      case 13: seriesData = DataStore.getCpi(itemKey); unit = '%'; break;
      case 14: seriesData = DataStore.getUnemp(itemKey); unit = '%'; break;
    }

    if (!seriesData) return;

    // Set Modal Titles
    document.getElementById('modalTitle').textContent = `${tileInfo.flag || '📊'} ${tileInfo.title} - ${itemLabel}`;
    document.getElementById('modalSubtitle').textContent = `1975년 ~ 2026년 50년간 역사적 시계열 추이 (확대/축소 및 마우스 드래그 지원)`;

    // Calculate Summary Stats
    const vals = seriesData.values;
    let min = Infinity, max = -Infinity, sum = 0;
    let minDate = '', maxDate = '';

    vals.forEach((v, idx) => {
      if (v < min) { min = v; minDate = seriesData.dates[idx]; }
      if (v > max) { max = v; maxDate = seriesData.dates[idx]; }
      sum += v;
    });
    const avg = sum / vals.length;
    const latest = vals[vals.length - 1];

    document.getElementById('statCurrent').textContent = `${latest.toLocaleString()} ${unit}`;
    document.getElementById('statMax').textContent = `${max.toLocaleString()} ${unit} (${maxDate})`;
    document.getElementById('statMin').textContent = `${min.toLocaleString()} ${unit} (${minDate})`;
    document.getElementById('statAvg').textContent = `${avg.toFixed(2)} ${unit}`;

    // Pass data to chart
    chartEngine.options.unit = unit;
    chartEngine.setData([{
      name: itemLabel,
      dates: seriesData.dates,
      values: seriesData.values,
      color: '#3b82f6'
    }]);

    setActivePreset('50Y');
    openModal();
  }

  // 4. Open Multi-Country Comparison Chart (Tile 6)
  function openCrossCountryChart(maturityKey, maturityLabel) {
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
    document.getElementById('modalSubtitle').textContent = `미국·한국·중국·일본·유럽 ${maturityLabel} 국채금리 50년 시계열 비교`;

    const usVals = multi['미국'].values;
    const krVals = multi['한국'].values;
    const latestUs = usVals[usVals.length - 1];
    const latestKr = krVals[krVals.length - 1];

    document.getElementById('statCurrent').textContent = `미국: ${latestUs}% / 한국: ${latestKr}%`;
    document.getElementById('statMax').textContent = `미국 1981년 16.3%`;
    document.getElementById('statMin').textContent = `일본 2016년 -0.3%`;
    document.getElementById('statAvg').textContent = `한미 금리차 ${(latestUs - latestKr).toFixed(2)}%p`;

    chartEngine.options.unit = '%';
    chartEngine.setData(seriesArray);

    setActivePreset('50Y');
    openModal();
  }

  function openModal() {
    chartModal.classList.add('active');
    setTimeout(() => {
      chartEngine.resize();
    }, 50);
  }

  function closeModal() {
    chartModal.classList.remove('active');
  }

  // Modal event listeners
  btnCloseModal.addEventListener('click', closeModal);
  chartModal.addEventListener('click', (e) => {
    if (e.target === chartModal) closeModal();
  });

  // Range Presets
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
      if (b.dataset.range === range) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  // Zoom Buttons
  document.getElementById('btnZoomIn').addEventListener('click', () => chartEngine.zoom(0.75));
  document.getElementById('btnZoomOut').addEventListener('click', () => chartEngine.zoom(1.3));
  document.getElementById('btnZoomReset').addEventListener('click', () => {
    setActivePreset('50Y');
    chartEngine.resetZoom();
  });

  // 5. Real-Time Clock & Ticker Simulator
  function updateClock() {
    const now = new Date();
    const str = now.toLocaleTimeString('ko-KR', { hour12: false });
    if (liveClockEl) {
      liveClockEl.textContent = `${str} LIVE`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Subtle real-time live ticker fluctuations (매 3~5초마다 무작위 환율/금리 틱 발생)
  function simulateLiveTick() {
    if (!isAutoRefresh) return;

    // Pick random metric to tick slightly
    const fxKeys = ['USD', 'JPY', 'CNY', 'EUR'];
    const randomFx = fxKeys[Math.floor(Math.random() * fxKeys.length)];
    const fxItem = summaryData.tile7.items.find(it => it.key === randomFx);

    if (fxItem) {
      const delta = (Math.random() - 0.48) * 0.4;
      fxItem.val = Math.round((fxItem.val + delta) * 100) / 100;
      fxItem.change = Math.round((fxItem.change + delta) * 100) / 100;

      const el = document.getElementById(`val-7-${randomFx}`);
      if (el) {
        el.textContent = `${fxItem.val.toLocaleString()}원`;
        const row = el.closest('.metric-row');
        if (row) {
          row.classList.remove('flash-up', 'flash-down');
          void row.offsetWidth; // trigger reflow
          row.classList.add(delta >= 0 ? 'flash-up' : 'flash-down');
        }
      }
    }

    // US 10Y Yield tick
    const us10Y = summaryData.tile1.items.find(it => it.key === '10Y');
    if (us10Y && Math.random() > 0.5) {
      const yieldDelta = (Math.random() - 0.49) * 0.004;
      us10Y.val = Math.round((us10Y.val + yieldDelta) * 1000) / 1000;
      const el = document.getElementById('val-1-10Y');
      if (el) {
        el.textContent = `${us10Y.val.toFixed(2)}%`;
      }
    }
  }
  setInterval(simulateLiveTick, 3500);

  // 6. KakaoTalk Share Integration
  btnKakaoShare.addEventListener('click', () => {
    handleKakaoShare();
  });

  function handleKakaoShare() {
    const currentUrl = window.location.href;
    const title = "📊 [실시간] 글로벌 매크로 경제지표 5x3 대시보드";
    const desc = `미국 10Y: ${summaryData.tile1.items[3].val}% | 원/달러: ${summaryData.tile7.items[0].val}원 | 한국 기준금리: 2.50%\n지금 바로 50년 시계열 차트를 확인해보세요!`;

    // 1순위: 브라우저 Kakao SDK 초기화 여부 확인
    if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: title,
            description: desc,
            imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
            link: {
              mobileWebUrl: currentUrl,
              webUrl: currentUrl,
            },
          },
          buttons: [
            {
              title: '대시보드 바로보기',
              link: {
                mobileWebUrl: currentUrl,
                webUrl: currentUrl,
              },
            },
          ],
        });
        return;
      } catch (err) {
        console.warn('Kakao Share API failed, fallback to modal', err);
      }
    }

    // 2순위: 모바일 네이티브 Web Share API 지원 시 바로 카카오톡 앱 선택 가능
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `${desc}\n\n접속 주소:\n${currentUrl}`,
        url: currentUrl
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          openKakaoModal(title, desc, currentUrl);
        }
      });
      return;
    }

    // 3순위: 카카오 연동 및 원클릭 복사 모달 표시
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
      alert('✅ 카카오톡 전송용 대시보드 요약 및 링크가 복사되었습니다!\n카카오톡 대화방에 [붙여넣기] 하시면 됩니다.');
    });
  });

  // 7. Email Share Feature
  btnEmailShare.addEventListener('click', () => {
    const currentUrl = window.location.href;
    const now = new Date().toLocaleString('ko-KR');
    const subject = encodeURIComponent(`[글로벌 매크로 대시보드] 실시간 경제 지표 브리핑 (${now})`);

    const us10Y = summaryData.tile1.items[3].val;
    const kr10Y = summaryData.tile3.items[3].val;
    const usdKrw = summaryData.tile7.items[0].val;
    const fedRate = summaryData.tile9.items[0].val;
    const bokRate = summaryData.tile9.items[1].val;

    const bodyText = `[글로벌 매크로 5x3 경제 대시보드 실시간 브리핑]
발송 일시: ${now}

■ 1. 핵심 국채금리
- 미국 10년물 국채: ${us10Y}%
- 한국 10년물 국채: ${kr10Y}%
- 한미 금리 역전차: ${(us10Y - kr10Y).toFixed(2)}%p

■ 2. 주요 환율
- 원/달러 (USD/KRW): ${usdKrw}원
- 100엔/원 (JPY/KRW): ${summaryData.tile7.items[1].val}원

■ 3. 주요국 기준금리
- 미국 Fed 정책금리: ${fedRate}%
- 한국은행 기준금리: ${bokRate}%

■ 4. 대시보드 전체 50년 시계열 차트 보기
${currentUrl}

(본 메일은 글로벌 매크로 대시보드에서 전송되었습니다.)`;

    const mailtoUrl = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
  });

  function copyBriefingToClipboard() {
    const currentUrl = window.location.href;
    const now = new Date().toLocaleString('ko-KR');
    const report = `[글로벌 매크로 종합 브리핑 요약 - ${now}]
• 미국 10Y 국채: ${summaryData.tile1.items[3].val}%
• 한국 10Y 국채: ${summaryData.tile3.items[3].val}%
• 원/달러 환율: ${summaryData.tile7.items[0].val}원
• 미국 기준금리: 3.75% | 한국: 2.50%
• 대시보드 링크: ${currentUrl}`;

    navigator.clipboard.writeText(report).then(() => {
      alert('📋 오늘의 매크로 지표 요약 리포트가 클립보드에 복사되었습니다!');
    });
  }

  // 8. GitHub Deploy Guide Modal
  btnDeployGuide.addEventListener('click', () => {
    guideModal.classList.add('active');
  });
  btnCloseGuide.addEventListener('click', () => guideModal.classList.remove('active'));
  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) guideModal.classList.remove('active');
  });

  // 9. Theme Switcher
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggleBtn.innerHTML = isLight ? '☀️ 라이트 모드' : '🌙 다크 모드';
    if (chartModal.classList.contains('active') && chartEngine) {
      chartEngine.render();
    }
  });

  // Init
  initChart();
  renderDashboard();
});
