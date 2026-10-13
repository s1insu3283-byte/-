import os
import shutil
import qrcode
import re

dashboard_dir = '/Users/insooshin/Desktop/macro-dashboard'
source_html_path = '/Users/insooshin/.gemini/antigravity/scratch/moodys_big3_dashboard/index.html'

target_moodys = os.path.join(dashboard_dir, 'moodys.html')
target_moodys_full = os.path.join(dashboard_dir, 'moodys_big3_dashboard.html')

# 1. Read source HTML
with open(source_html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 2. Generate QR Code
url = 'https://s1insu3283-byte.github.io/-/moodys.html'
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=10,
    border=2,
)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")
qr_path = os.path.join(dashboard_dir, 'qr_moodys.png')
img.save(qr_path)
print(f"Generated QR code at {qr_path} for {url}")

# 3. Create Hub Bar & Mobile QR Modal
hub_bar = '''
    <!-- Top Global Hub Bar -->
    <div class="bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg mb-4">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-slate-400 font-semibold flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          대시보드 패밀리 바로가기:
        </span>
        <a href="index.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1 font-medium">
          <span>🌐</span> 글로벌 매크로
        </a>
        <a href="macro_gold_dashboard.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/60 transition flex items-center gap-1 font-medium">
          <span>🏛️</span> 100년 금·부동산
        </a>
        <a href="real_estate_dashboard.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/60 transition flex items-center gap-1 font-medium">
          <span>🏢</span> 전국 37개구 부동산
        </a>
        <a href="traffic_analytics.html" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60 transition flex items-center gap-1 font-medium">
          <span>🌲</span> 오르트숲 펜션 유입 분석
        </a>
        <span class="px-2.5 py-1 rounded bg-indigo-600/40 text-indigo-300 border border-indigo-500 font-bold flex items-center gap-1">
          <span>📊</span> 신용평가 빅3·한기평 (현재)
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="openMobileModal()" class="px-3 py-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg font-bold shadow-md shadow-indigo-950 flex items-center gap-1.5 transition">
          <span>📱</span> 핸드폰 바로 열기 (QR코드)
        </button>
      </div>
    </div>
'''

modal_html = '''
  <!-- Mobile Connect QR Modal -->
  <div id="mobile-qr-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
      <button onclick="closeMobileModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
      
      <div class="inline-flex p-3 bg-indigo-500/10 rounded-full text-indigo-400">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
      </div>

      <div>
        <h3 class="text-lg font-extrabold text-white">스마트폰으로 바로 열기</h3>
        <p class="text-xs text-slate-400 mt-1">스마트폰 기본 카메라로 아래 QR 코드를 비추면 언제 어디서나 대시보드가 열립니다.</p>
      </div>

      <div class="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto">
        <img src="qr_moodys.png" alt="QR Code" class="w-48 h-48 mx-auto block">
      </div>

      <div class="space-y-1.5">
        <div class="text-[11px] text-slate-400">인터넷 주소 직접 입력:</div>
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-indigo-400 select-all break-all">
          https://s1insu3283-byte.github.io/-/moodys.html
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

# Inject hub bar inside <main class="..."> right at the beginning of main
if '<main class="' in html:
    main_match = re.search(r'(<main class="[^"]*">)', html)
    if main_match:
        main_tag = main_match.group(1)
        html = html.replace(main_tag, main_tag + '\n' + hub_bar, 1)

# Inject modal before </body>
html = html.replace('</body>', modal_html + '\n</body>')

# Write moodys.html and moodys_big3_dashboard.html
with open(target_moodys, 'w', encoding='utf-8') as f:
    f.write(html)

with open(target_moodys_full, 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved moodys.html and moodys_big3_dashboard.html successfully!")
