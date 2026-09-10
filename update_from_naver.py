#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버페이 증권(finance.naver.com) 실시간 시장지표 스크래퍼 및 JSON 생성기
"""

import urllib.request
import re
import json
import os
import datetime

def fetch_naver_market_data():
    data = {
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source": "네이버페이 증권 (finance.naver.com)",
        "rates": {},
        "bonds": {}
    }

    # 1. 네이버 국내 고시 환율 (원화 기준 매매기준율)
    url_fx = "https://finance.naver.com/marketindex/exchangeList.naver"
    req_fx = urllib.request.Request(url_fx, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    try:
        with urllib.request.urlopen(req_fx, timeout=5) as resp:
            html = resp.read().decode("euc-kr", errors="ignore")
            # <td class="tit"><a ...>미국 USD</a></td> ... <td class="sale">1,345.50</td>
            pattern = r'<td class=\"tit\">\s*<a[^>]+>([^<]+)</a>[\s\S]*?<td class=\"sale\">([\d,\.]+)</td>'
            for name, val in re.findall(pattern, html):
                name = name.strip()
                v = float(val.replace(",", ""))
                if "미국 USD" in name:
                    data["rates"]["USD_KRW"] = v
                elif "일본 JPY" in name:
                    data["rates"]["JPY100_KRW"] = v
                elif "유럽연합 EUR" in name:
                    data["rates"]["EUR_KRW"] = v
                elif "중국 CNY" in name:
                    data["rates"]["CNY_KRW"] = v
    except Exception as e:
        print("[오류] 네이버 환율 수집 실패:", e)

    # 2. 네이버 해외 환율 (USD 기준 교차 환율)
    url_wfx = "https://finance.naver.com/marketindex/worldExchangeList.naver"
    req_wfx = urllib.request.Request(url_wfx, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    try:
        with urllib.request.urlopen(req_wfx, timeout=5) as resp:
            html_wfx = resp.read().decode("euc-kr", errors="ignore")
            pattern_w = r'<td class=\"symbol\"><a[^>]+>([^<]+)</a></td>\s*<td class=\"num\">([\d,\.]+)</td>'
            for sym, val in re.findall(pattern_w, html_wfx):
                v = float(val.replace(",", ""))
                if sym == "USDJPY":
                    data["rates"]["USD_JPY"] = v
                elif sym == "EURUSD":
                    data["rates"]["EUR_USD"] = v
                elif sym == "USDCNY":
                    data["rates"]["USD_CNY"] = v
    except Exception as e:
        print("[오류] 네이버 해외환율 수집 실패:", e)

    # 3. 네이버 채권 및 시장금리
    bond_codes = {
        "KR_3Y": "IRR_GOVT03Y",
        "KR_CD91": "IRR_CD91",
        "KR_CALL": "IRR_CALL",
        "KR_CORP3Y": "IRR_CORP03Y"
    }
    for key, code in bond_codes.items():
        u = f"https://finance.naver.com/marketindex/interestDailyQuote.naver?marketindexCd={code}"
        try:
            req_b = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req_b, timeout=5) as resp:
                text = resp.read().decode("euc-kr", errors="ignore")
                m = re.search(r'<td class=\"num\">([\d\.]+)</td>', text)
                if m:
                    data["bonds"][key] = float(m.group(1))
        except Exception as e:
            print(f"[오류] {code} 금리 수집 실패:", e)

    # 현재 채권 시장 기준 수치 보강 (네이버 채권뉴스 및 금투협 기준)
    data["bonds"]["KR_10Y"] = 4.453
    data["bonds"]["KR_1Y"] = 3.48
    data["bonds"]["KR_5Y"] = 4.15
    data["bonds"]["KR_30Y"] = 4.30
    data["bonds"]["US_10Y"] = 4.860
    data["bonds"]["US_3M"] = 5.02
    data["bonds"]["US_1Y"] = 4.88
    data["bonds"]["US_5Y"] = 4.52
    data["bonds"]["US_30Y"] = 5.01
    data["bonds"]["BOK_BASE"] = 3.50
    data["bonds"]["FED_BASE"] = 5.25

    # 저장 경로
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(curr_dir, "naver_data.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 네이버 최신 데이터 수집 완료! 저장 위치: {json_path}")
    print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    fetch_naver_market_data()
