/**
 * GLOBAL MACRO DASHBOARD - INTERACTIVE CANVAS CHART ENGINE
 * 50년 시계열 줌(확대/축소), 팬(드래그 이동), 크로스헤어 툴팁, 다중 시리즈 지원
 */

class InteractiveChartEngine {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.options = Object.assign({
      theme: 'dark',
      unit: '%',
      showLegend: true,
      onRangeChange: null
    }, options);

    // Data series: [{ name: '미국 10년물', dates: [...], values: [...], color: '#3b82f6' }]
    this.seriesList = [];
    this.dates = [];

    // Viewport range (indices in dates array)
    this.viewStart = 0;
    this.viewEnd = 0;

    // Interaction state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartViewStart = 0;
    this.dragStartViewEnd = 0;
    this.mouseX = -1;
    this.mouseY = -1;

    this.initEvents();
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  setData(seriesArray) {
    this.seriesList = seriesArray;
    if (seriesArray.length > 0 && seriesArray[0].dates) {
      this.dates = seriesArray[0].dates;
      this.viewStart = 0;
      this.viewEnd = this.dates.length - 1;
    }
    this.render();
  }

  setPresetRange(years) {
    if (!this.dates || this.dates.length === 0) return;
    const total = this.dates.length;
    if (years === 'MAX' || years >= 50) {
      this.viewStart = 0;
      this.viewEnd = total - 1;
    } else {
      const months = years * 12;
      this.viewStart = Math.max(0, total - 1 - months);
      this.viewEnd = total - 1;
    }
    this.render();
  }

  zoom(factor) {
    const span = this.viewEnd - this.viewStart;
    const center = (this.viewStart + this.viewEnd) / 2;
    const newSpan = Math.max(12, Math.min(this.dates.length, Math.round(span * factor)));
    
    let newStart = Math.round(center - newSpan / 2);
    let newEnd = newStart + newSpan;

    if (newStart < 0) {
      newStart = 0;
      newEnd = Math.min(this.dates.length - 1, newSpan);
    }
    if (newEnd >= this.dates.length) {
      newEnd = this.dates.length - 1;
      newStart = Math.max(0, newEnd - newSpan);
    }

    this.viewStart = newStart;
    this.viewEnd = newEnd;
    this.render();
  }

  resetZoom() {
    if (this.dates && this.dates.length > 0) {
      this.viewStart = 0;
      this.viewEnd = this.dates.length - 1;
      this.render();
    }
  }

  initEvents() {
    // Mouse Wheel Zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
      this.zoom(zoomFactor);
    }, { passive: false });

    // Drag to Pan
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.offsetX;
      this.dragStartViewStart = this.viewStart;
      this.dragStartViewEnd = this.viewEnd;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      if (this.isDragging) {
        const dx = this.mouseX - this.dragStartX;
        const visibleCount = this.dragStartViewEnd - this.dragStartViewStart;
        const plotWidth = this.width - 80;
        const shiftIndex = Math.round((-dx / plotWidth) * visibleCount);

        let newStart = this.dragStartViewStart + shiftIndex;
        let newEnd = this.dragStartViewEnd + shiftIndex;

        if (newStart < 0) {
          newEnd -= newStart;
          newStart = 0;
        }
        if (newEnd >= this.dates.length) {
          const diff = newEnd - (this.dates.length - 1);
          newStart -= diff;
          newEnd = this.dates.length - 1;
        }
        if (newStart >= 0 && newEnd < this.dates.length) {
          this.viewStart = newStart;
          this.viewEnd = newEnd;
        }
      }

      this.render();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = -1;
      this.mouseY = -1;
      this.render();
    });

    // Touch Support
    let touchStartX = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        this.dragStartViewStart = this.viewStart;
        this.dragStartViewEnd = this.viewEnd;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const dx = touchX - touchStartX;
        const visibleCount = this.dragStartViewEnd - this.dragStartViewStart;
        const plotWidth = this.width - 80;
        const shiftIndex = Math.round((-dx / plotWidth) * visibleCount);

        let newStart = this.dragStartViewStart + shiftIndex;
        let newEnd = this.dragStartViewEnd + shiftIndex;

        if (newStart >= 0 && newEnd < this.dates.length) {
          this.viewStart = newStart;
          this.viewEnd = newEnd;
          this.render();
        }
      }
    }, { passive: true });
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (!w || !h || this.seriesList.length === 0 || !this.dates || this.dates.length === 0) return;

    const isDark = document.body.classList.contains('light-theme') ? false : true;

    // Palette
    const colors = {
      bg: isDark ? '#0f172a' : '#ffffff',
      grid: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      axis: isDark ? '#64748b' : '#94a3b8',
      text: isDark ? '#cbd5e1' : '#475569',
      crosshair: isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(71, 85, 105, 0.5)',
      tooltipBg: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: isDark ? '#334155' : '#e2e8f0'
    };

    ctx.clearRect(0, 0, w, h);

    // Plot Margins
    const padLeft = 70;
    const padRight = 30;
    const padTop = 35;
    const padBottom = 40;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Determine Min & Max value in visible view
    let minVal = Infinity;
    let maxVal = -Infinity;

    this.seriesList.forEach(series => {
      for (let i = this.viewStart; i <= this.viewEnd; i++) {
        const v = series.values[i];
        if (v !== undefined && !isNaN(v)) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }
    });

    if (minVal === Infinity) { minVal = 0; maxVal = 10; }
    if (minVal === maxVal) { minVal -= 1; maxVal += 1; }

    // Value padding
    const valMargin = (maxVal - minVal) * 0.1 || 0.5;
    minVal -= valMargin;
    maxVal += valMargin;

    // Coordinate helpers
    const getX = (idx) => padLeft + ((idx - this.viewStart) / (this.viewEnd - this.viewStart)) * plotW;
    const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

    // Draw Grid & Y-Axis ticks
    const yTicks = 6;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= yTicks; i++) {
      const val = minVal + (i / yTicks) * (maxVal - minVal);
      const y = getY(val);

      // Grid line
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      // Y Label
      ctx.fillStyle = colors.axis;
      let labelStr = val >= 1000 ? Math.round(val).toLocaleString() : val.toFixed(2);
      ctx.fillText(labelStr + (this.options.unit ? this.options.unit : ''), padLeft - 10, y);
    }

    // Draw X-Axis Dates
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const visibleCount = this.viewEnd - this.viewStart;
    const step = Math.max(1, Math.floor(visibleCount / 8));

    for (let i = this.viewStart; i <= this.viewEnd; i += step) {
      const x = getX(i);
      const dStr = this.dates[i]; // 'YYYY-MM'

      // Tick mark & label
      ctx.fillStyle = colors.axis;
      ctx.fillText(dStr, x, h - padBottom + 10);

      // Vertical subtle grid line
      ctx.strokeStyle = colors.grid;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();
    }

    // Draw Series Lines & Gradients
    this.seriesList.forEach((series) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(padLeft, padTop, plotW, plotH);
      ctx.clip();

      const lineColor = series.color || '#3b82f6';

      // Gradient under the first series
      if (this.seriesList.length === 1) {
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, lineColor + '44');
        grad.addColorStop(1, lineColor + '00');

        ctx.beginPath();
        let started = false;
        for (let i = this.viewStart; i <= this.viewEnd; i++) {
          const val = series.values[i];
          if (val === undefined) continue;
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, padTop + plotH);
            ctx.lineTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(getX(this.viewEnd), padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Line path
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let started = false;
      for (let i = this.viewStart; i <= this.viewEnd; i++) {
        const val = series.values[i];
        if (val === undefined || isNaN(val)) continue;
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    });

    // Crosshair & Tooltip
    if (this.mouseX >= padLeft && this.mouseX <= w - padRight && this.mouseY >= padTop && this.mouseY <= h - padBottom) {
      const ratio = (this.mouseX - padLeft) / plotW;
      const hoverIndex = Math.round(this.viewStart + ratio * (this.viewEnd - this.viewStart));

      if (hoverIndex >= 0 && hoverIndex < this.dates.length) {
        const x = getX(hoverIndex);
        const dateStr = this.dates[hoverIndex];

        // Draw vertical crosshair
        ctx.strokeStyle = colors.crosshair;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, h - padBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight dots
        const tooltipItems = [];
        this.seriesList.forEach(series => {
          const val = series.values[hoverIndex];
          if (val !== undefined) {
            const y = getY(val);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = series.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            tooltipItems.push({
              name: series.name,
              color: series.color,
              val: val
            });
          }
        });

        // Draw Tooltip Box
        this.drawTooltip(ctx, x, this.mouseY, dateStr, tooltipItems, colors, w, h);
      }
    }

    // Legend (top-left inside plot)
    if (this.options.showLegend && this.seriesList.length > 1) {
      let legendX = padLeft + 15;
      const legendY = padTop + 15;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      this.seriesList.forEach(series => {
        ctx.fillStyle = series.color;
        ctx.beginPath();
        ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.text;
        ctx.fillText(series.name, legendX + 10, legendY);
        legendX += ctx.measureText(series.name).width + 30;
      });
    }
  }

  drawTooltip(ctx, x, y, dateStr, items, colors, w, h) {
    const boxPad = 10;
    const lineHeight = 18;
    const boxW = Math.max(150, items.reduce((max, it) => Math.max(max, ctx.measureText(`${it.name}: ${it.val}`).width + 50), 100));
    const boxH = 26 + items.length * lineHeight;

    let boxX = x + 15;
    let boxY = y - boxH / 2;

    if (boxX + boxW > w - 15) {
      boxX = x - boxW - 15;
    }
    if (boxY < 10) boxY = 10;
    if (boxY + boxH > h - 10) boxY = h - boxH - 10;

    // Background shadow & rect
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors.tooltipBg;
    ctx.strokeStyle = colors.tooltipBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Date header
    ctx.fillStyle = colors.axis;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`📅 ${dateStr}`, boxX + boxPad, boxY + 8);

    // Items
    items.forEach((it, idx) => {
      const itemY = boxY + 26 + idx * lineHeight;
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(boxX + boxPad + 4, itemY + 6, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.fillText(it.name, boxX + boxPad + 14, itemY);

      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = it.color;
      const formatted = it.val >= 1000 ? Math.round(it.val).toLocaleString() : it.val.toFixed(2);
      ctx.fillText(formatted + (this.options.unit || ''), boxX + boxW - boxPad, itemY);
      ctx.textAlign = 'left';
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveChartEngine;
}
