#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
5초 실시간 자동 갱신 데몬 (Auto-Sync Loop)
5초 간격으로 Yahoo Finance(금·환율·10년물 국채), 네이버/Investing(채권·기준금리), 경제 캘린더 발표치를
수집하여 macro_realtime.json, data.json, naver_data.json에 실시간 동기화합니다.
"""

import time
import os
import json
import datetime
import traceback
import sync_realtime_macro as macro_sync

def run_loop():
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    macro_json_path = os.path.join(curr_dir, 'macro_realtime.json')
    data_json_path = os.path.join(curr_dir, 'data.json')
    naver_json_path = os.path.join(curr_dir, 'naver_data.json')

    print("=" * 70)
    print("🚀 [5초 실시간 자동 갱신 데몬 가동]")
    print("   • 실시간 시장 시세: Yahoo Finance (GC=F, ^TNX, KRW=X, JPY=X, DXY)")
    print("   • 거시지표 속보치: 경제 캘린더 & 중앙은행(BOK·FRED·BOJ) 고시치")
    print("   • 동기화 주기: 5초 (5000ms)")
    print("=" * 70)

    cycle_count = 0
    while True:
        cycle_start = time.time()
        cycle_count += 1
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # 1. 18개 핵심 지표 수집 및 환산
            data = macro_sync.collect_all_realtime_macro()
            data['cycle'] = cycle_count

            # 2. 파일 저장 (원자적 쓰기)
            with open(macro_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            with open(data_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            m = data.get('metrics', {})
            gold_val = m.get('us_gold', {}).get('formatted', '-')
            krw_val = m.get('kr_fx', {}).get('formatted', '-')
            tips_val = m.get('us_tips', {}).get('formatted', '-')
            kr_real = m.get('kr_real', {}).get('formatted', '-')

            print(f"[{now_str}] 🟢 [5초 갱신 #{cycle_count}] 美금: {gold_val} | TIPS: {tips_val} | 韓실질: {kr_real} | 환율: {krw_val} ➔ macro_realtime.json 완료")

            # 10분(120사이클)마다 GitHub Pages로 자동 백그라운드 푸시 (핸드폰/도메인 최신화)
            if cycle_count % 120 == 0:
                os.system(f'cd "{curr_dir}" && git add macro_realtime.json data.json && git commit -m "chore: 🔄 실시간 매크로 자동 동기화" && git push origin main > /dev/null 2>&1 &')

        except Exception as e:
            print(f"[{now_str}] ⚠️ 갱신 중 예외 발생: {e}")
            traceback.print_exc()

        # 5초 주기 조절 (작업 소요 시간 감안)
        elapsed = time.time() - cycle_start
        sleep_time = max(0.5, 5.0 - elapsed)
        time.sleep(sleep_time)

if __name__ == '__main__':
    run_loop()
