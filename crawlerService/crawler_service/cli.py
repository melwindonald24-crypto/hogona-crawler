import argparse
import json
import sys
from typing import Any, Dict


def parse_payload(args: argparse.Namespace) -> Dict[str, Any]:
    if args.input_json:
        return json.loads(args.input_json)

    if args.input_file:
        with open(args.input_file, "r", encoding="utf-8") as file:
            return json.load(file)

    stdin_data = sys.stdin.read().strip()
    if stdin_data:
        return json.loads(stdin_data)

    return {}


def run(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "crawlerService",
        "message": "Crawler service subprocess is ready.",
        "input": payload,
        "documents": [],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawler service subprocess entrypoint")
    parser.add_argument("--input-json", help="JSON payload for the crawler service")
    parser.add_argument("--input-file", help="Path to a JSON payload file")
    args = parser.parse_args()

    try:
        payload = parse_payload(args)
        result = run(payload)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(
            json.dumps({
                "ok": False,
                "service": "crawlerService",
                "error": str(error),
            }),
            file=sys.stderr,
        )
        raise SystemExit(1)
