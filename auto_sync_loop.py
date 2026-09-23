#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3초 실시간 자동 갱신 데몬 (Auto-Sync Loop)
3초 간격으로 네이버 국채수익률(미국·한국·일본·중국·유럽 5개국 전만기),
기준금리 및 환율을 실시간 수집하여 naver_data.json, data.json, investing_data.json에 원자적 동기화합니다.
"""

import time
import os
import json
import datetime
import traceback
import sync_naver_exact as naver_sync

def run_loop():
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    naver_json_path = os.path.join(curr_dir, 'naver_data.json')
    investing_json_path = os.path.join(curr_dir, 'investing_data.json')
    data_json_path = os.path.join(curr_dir, 'data.json')
    macro_json_path = os.path.join(curr_dir, 'macro_realtime.json')

    print("=" * 75)
    print("🚀 [3초 실시간 자동 갱신 데몬 가동]")
    print("   • 데이터 출처: 네이버 국채수익률 검색 (미국·한국·일본·중국·유럽 5개국)")
    print("   • 연동 지표: 3개월·1년·5년·10년·30년 전만기, 공식 기준금리, 실시간 환율")
    print("   • 동기화 주기: 3초 (3000ms)")
    print("=" * 75)

    cycle_count = 0
    while True:
        cycle_start = time.time()
        cycle_count += 1
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # 1. 5개국 국채 및 매크로 지표 병렬 수집
            data = naver_sync.collect_all_data()
            data['cycle'] = cycle_count

            # 2. 파일 원자적 저장 (Atomic Write via .tmp)
            tmp_naver = naver_json_path + '.tmp'
            with open(tmp_naver, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp_naver, naver_json_path)

            tmp_inv = investing_json_path + '.tmp'
            with open(tmp_inv, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp_inv, investing_json_path)

            # data.json & macro_realtime.json 동시 호환
            with open(data_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            with open(macro_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # 콘솔 요약 로그
            b = data.get('naver_search_bonds', {})
            us_10y = b.get('US', {}).get('maturities', {}).get('10Y', {}).get('val', '-')
            kr_10y = b.get('KR', {}).get('maturities', {}).get('10Y', {}).get('val', '-')
            jp_10y = b.get('JP', {}).get('maturities', {}).get('10Y', {}).get('val', '-')
            cn_10y = b.get('CN', {}).get('maturities', {}).get('10Y', {}).get('val', '-')
            de_10y = b.get('DE', {}).get('maturities', {}).get('10Y', {}).get('val', '-')
            usd_krw = data.get('rates', {}).get('USD_KRW', '-')

            print(f"[{now_str}] 🟢 [3초 갱신 #{cycle_count}] 美10Y:{us_10y}% | 韓10Y:{kr_10y}% | 日10Y:{jp_10y}% | 中10Y:{cn_10y}% | 獨10Y:{de_10y}% | 환율:{usd_krw}원")

            # 5분(100사이클)마다 GitHub Pages로 자동 백그라운드 푸시
            if cycle_count % 100 == 0:
                os.system(f'cd "{curr_dir}" && git add naver_data.json investing_data.json data.json macro_realtime.json && git commit -m "chore: 🔄 네이버 실시간 매크로 자동 동기화" && git push origin main > /dev/null 2>&1 &')

        except Exception as e:
            print(f"[{now_str}] ⚠️ 갱신 중 예외 발생: {e}")
            traceback.print_exc()

        # 3초 주기 조절
        elapsed = time.time() - cycle_start
        sleep_time = max(0.5, 3.0 - elapsed)
        time.sleep(sleep_time)

if __name__ == '__main__':
    run_loop()
