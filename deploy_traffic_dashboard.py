import os
import shutil
import qrcode
import json

dashboard_dir = '/Users/insooshin/Desktop/macro-dashboard'
scratch_file = '/Users/insooshin/.gemini/antigravity/scratch/traffic-analytics/index.html'
target_file = os.path.join(dashboard_dir, 'traffic_analytics.html')
target_file_short = os.path.join(dashboard_dir, 'traffic.html')

# 1. Read scratch index.html
with open(scratch_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# 2. Add Top Hub Bar in traffic_analytics.html to link back to macro & real estate dashboards + QR code button
hub_bar = '''
    <!-- Top Global Hub Bar -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-slate-400 font-semibold flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          대시보드 패밀리 바로가기:
        </span>
        <a href="index.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1">
          <span>🌐</span> 글로벌 매크로
        </a>
        <a href="macro_gold_dashboard.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/60 transition flex items-center gap-1">
          <span>🏛️</span> 100년 금·부동산
        </a>
        <a href="real_estate_dashboard.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/60 transition flex items-center gap-1">
          <span>🏢</span> 전국 37개구 부동산
        </a>
        <span class="px-2.5 py-1 rounded bg-emerald-600/40 text-emerald-300 border border-emerald-500 font-bold flex items-center gap-1">
          <span>🌲</span> 오르트숲 펜션 유입 분석 (현재)
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="openMobileModal()" class="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold shadow-md shadow-emerald-950 flex items-center gap-1.5 transition">
          <span>📱</span> 핸드폰 바로 열기 (QR코드)
        </button>
      </div>
    </div>
'''

# 3. Add Mobile QR Modal HTML before </body>
modal_html = '''
  <!-- Mobile Connect QR Modal -->
  <div id="mobile-qr-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
      <button onclick="closeMobileModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
      
      <div class="inline-flex p-3 bg-emerald-500/10 rounded-full text-emerald-400">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
      </div>

      <div>
        <h3 class="text-lg font-extrabold text-white">스마트폰으로 바로 열기</h3>
        <p class="text-xs text-slate-400 mt-1">스마트폰 기본 카메라로 아래 QR 코드를 비추면 언제 어디서나 대시보드가 열립니다.</p>
      </div>

      <div class="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto">
        <img src="qr_traffic_analytics.png" alt="QR Code" class="w-48 h-48 mx-auto display-block">
      </div>

      <div class="space-y-1.5">
        <div class="text-[11px] text-slate-400">인터넷 주소 직접 입력:</div>
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-emerald-400 select-all break-all">
          https://s1insu3283-byte.github.io/-/traffic_analytics.html
        </div>
      </div>

      <button onclick="closeMobileModal()" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition">
        닫기
      </button>
    </div>
  </div>

  <script>
    function openMobileModal() {
      document.getElementById('mobile-qr-modal').classList.remove('hidden');
    }
    function closeMobileModal() {
      document.getElementById('mobile-qr-modal').classList.add('hidden');
    }
  </script>
'''

# Inject hub_bar right after <div class="max-w-7xl mx-auto space-y-5">
if '<div class="max-w-7xl mx-auto space-y-5">' in html_content:
    html_content = html_content.replace(
        '<div class="max-w-7xl mx-auto space-y-5">',
        '<div class="max-w-7xl mx-auto space-y-5">\n' + hub_bar
    )

# Inject modal before </body>
html_content = html_content.replace('</body>', modal_html + '\n</body>')

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(target_file_short, 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Generated traffic_analytics.html and traffic.html")

# 4. Generate QR Code
url = 'https://s1insu3283-byte.github.io/-/traffic_analytics.html'
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=10,
    border=2,
)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")
qr_path_png = os.path.join(dashboard_dir, 'qr_traffic_analytics.png')
img.save(qr_path_png)

# Also save copy to conversation artifact dir
artifact_dir = '/Users/insooshin/.gemini/antigravity/brain/0caa3f6b-3b44-4242-b89c-35276c310b8e'
img.save(os.path.join(artifact_dir, 'qr_traffic_analytics.png'))
print(f"Generated QR code for {url}")

# 5. Add button to Desktop/macro-dashboard/index.html if not already present
index_file = os.path.join(dashboard_dir, 'index.html')
with open(index_file, 'r', encoding='utf-8') as f:
    idx_content = f.read()

pension_btn = '''
      <!-- 🌲 오르트숲 펜션 정밀 유입 분석 시스템 바로가기 -->
      <a href="traffic_analytics.html" class="btn" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-weight: 800; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 9px; box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4); transition: transform 0.15s ease;" title="오르트숲 펜션 정밀 유입 분석 대시보드로 이동">
        <span>🌲</span>
        <span>오르트숲 펜션 유입 분석</span>
      </a>
'''

if 'traffic_analytics.html' not in idx_content:
    # insert after real_estate_dashboard.html button
    pos = idx_content.find('real_estate_dashboard.html')
    if pos != -1:
        end_a = idx_content.find('</a>', pos)
        if end_a != -1:
            idx_content = idx_content[:end_a + 4] + '\n' + pension_btn + idx_content[end_a + 4:]
            with open(index_file, 'w', encoding='utf-8') as f:
                f.write(idx_content)
            print("Added pension dashboard button to index.html")

print("Deployment preparation complete.")
