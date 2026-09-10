#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3초 실시간 자동 갱신 데몬 (Auto-Sync Loop)
3초 간격으로 최신 환율, 국채수익률, 기준금리 및 인베스팅 뉴스를 동기화하여 naver_data.json에 기록합니다.
네이버 차단(403) 방지를 위한 스마트 캐싱 및 무중단 유지 아키텍처
"""

import time
import os
import json
import datetime
import traceback
import sync_naver_exact as sync

def run_loop():
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    json_path1 = os.path.join(curr_dir, 'naver_data.json')
    json_path2 = os.path.join(curr_dir, 'investing_data.json')

    print("🚀 [3초 자동 갱신 데몬 시작] 3초 간격으로 실시간 동기화를 실행합니다...")

    last_heavy_sync_time = 0
    cached_bonds = {}
    cached_policy_rates = {}
    cached_news = {}
    cached_fx = {}

    # 이전 정상 데이터 로드
    if os.path.exists(json_path1):
        try:
            with open(json_path1, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
                cached_bonds = old_data.get('naver_search_bonds', {})
                cached_policy_rates = old_data.get('naver_policy_rates', {})
                cached_news = old_data.get('investing_news', {})
                cached_fx = old_data.get('rates', {})
        except Exception:
            pass

    cycle_count = 0
    while True:
        cycle_start = time.time()
        cycle_count += 1
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # 1. 환율 수집 (매 3~6초)
            try:
                new_fx = sync.fetch_investing_fx()
                if new_fx and "USD_KRW" in new_fx:
                    cached_fx = new_fx
            except Exception as e:
                pass

            # 2. 국채금리, 기준금리, 뉴스 (30초마다 갱신하여 403 차단 방지)
            if cycle_start - last_heavy_sync_time >= 30 or not cached_bonds:
                try:
                    new_bonds = sync.fetch_investing_bonds()
                    if new_bonds and new_bonds.get('US', {}).get('미국 국채 10년'):
                        cached_bonds = new_bonds
                except Exception as e:
                    print(f"[{now_str}] 국채금리 갱신 대기: {e}")

                try:
                    new_policy = sync.fetch_investing_policy_rates()
                    if new_policy and '한국은행' in new_policy:
                        cached_policy_rates = new_policy
                except Exception as e:
                    print(f"[{now_str}] 기준금리 갱신 대기: {e}")

                try:
                    new_news = sync.fetch_investing_news()
                    if new_news:
                        cached_news = new_news
                except Exception as e:
                    print(f"[{now_str}] 뉴스 갱신 대기: {e}")

                last_heavy_sync_time = cycle_start

            # 3. 공식 거시지표 (근원물가, 소비자물가, 실업률)
            macro = sync.fetch_macro_indicators()

            output = {
                "updated_at": now_str,
                "source": "Investing.com (인베스팅닷컴) & 글로벌 실시간 경제 속보",
                "cycle": cycle_count,
                "rates": cached_fx,
                "naver_search_bonds": cached_bonds,
                "naver_policy_rates": cached_policy_rates,
                "macro_indicators": macro,
                "investing_news": cached_news
            }

            with open(json_path1, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            with open(json_path2, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)

            us10y = cached_bonds.get('US', {}).get('미국 국채 10년', {}).get('val', '-')
            print(f"[{now_str}] ⚡ #Cycle {cycle_count} 동기화 완료 (원/달러: {cached_fx.get('USD_KRW')}원, 미국10Y: {us10y}%)")

        except Exception as err:
            print(f"동기화 루프 오류: {err}")
            traceback.print_exc()

        # 정확히 3초 주기 유지
        elapsed = time.time() - cycle_start
        sleep_time = max(0.5, 3.0 - elapsed)
        time.sleep(sleep_time)

if __name__ == '__main__':
    run_loop()
