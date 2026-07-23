"""Run one TradingAgents analysis for a single ticker and print the result as JSON.

Invoked as a subprocess by the Millionaire Flask backend's /chat route (kept out
of app.py's own venv since TradingAgents ships a much heavier dependency set).
Usage: python run_decision_json.py <TICKER>
"""
import json
import sys
from datetime import date

from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.graph.trading_graph import TradingAgentsGraph

RESULT_MARKER = "###RESULT_JSON###"


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing ticker argument"}), file=sys.stderr)
        sys.exit(1)

    symbol = sys.argv[1].strip().upper()
    trade_date = date.today().isoformat()

    config = DEFAULT_CONFIG.copy()
    ta = TradingAgentsGraph(debug=False, config=config)
    final_state, decision = ta.propagate(symbol, trade_date)

    out = {
        "ticker": symbol,
        "trade_date": trade_date,
        "rating": decision,
        "final_trade_decision": final_state.get("final_trade_decision"),
        "market_report": final_state.get("market_report"),
        "news_report": final_state.get("news_report"),
        "deep_thinking_model": config.get("deep_think_llm"),
        "quick_thinking_model": config.get("quick_think_llm"),
    }
    print(RESULT_MARKER)
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
