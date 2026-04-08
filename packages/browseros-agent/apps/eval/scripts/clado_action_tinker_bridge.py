#!/usr/bin/env python3
"""
Persistent bridge for Clado action inference via a Tinker sampling client.

Reads newline-delimited JSON requests from stdin and writes one JSON response per
line to stdout. Supports either a direct sampler checkpoint or a training
checkpoint that must first be exported for sampler use.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[5]
RL_ROOT = Path(__file__).resolve().parents[6] / "rl"
RL_ACTION_RECIPE_DIR = RL_ROOT / "browseros" / "recipe" / "legacy" / "rl"
if str(RL_ACTION_RECIPE_DIR) not in sys.path:
    sys.path.insert(0, str(RL_ACTION_RECIPE_DIR))

from action_space import (  # noqa: E402
    EXECUTOR_ACTION_GUIDANCE,
    EXECUTOR_KEYS_PROMPT_LINE,
    EXECUTOR_VALID_ACTIONS_BLOCK,
)

ACTION_PROMPT = """
In this UI screenshot, I want to perform the command '__INSTRUCTION__' with the action history '__HISTORY__'.
First think step-by-step inside <thinking></thinking> tags about what you see and what action to take, then provide exactly one action as JSON inside <answer></answer> tags.
Coordinates must be percentage integers in [0, 100], where 0 is left/top and 100 is right/bottom.
For action "type", x and y are mandatory and cannot be omitted.
__ACTION_BLOCK__
__ACTION_GUIDANCE__
__KEYS_LINE__
Example output:
<thinking>I see a login form. The instruction says to enter a username. I should type directly into the username field at the center-left position.</thinking>
<answer>{"action": "type", "x": 42, "y": 36, "text": "alice"}</answer>
"""
ACTION_PROMPT = (
    ACTION_PROMPT.replace("__ACTION_BLOCK__", EXECUTOR_VALID_ACTIONS_BLOCK)
    .replace("__ACTION_GUIDANCE__", EXECUTOR_ACTION_GUIDANCE)
    .replace("__KEYS_LINE__", EXECUTOR_KEYS_PROMPT_LINE)
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clado action Tinker bridge")
    parser.add_argument("--model", help="Legacy tokenizer model name; unused when sampler provides tokenizer")
    parser.add_argument("--sampler-path", help="tinker://.../sampler_weights/...")
    parser.add_argument("--state-path", help="tinker://.../weights/...")
    parser.add_argument("--sampler-name", help="optional sampler checkpoint name")
    parser.add_argument("--base-url", default=None, help="Optional Tinker base URL")
    return parser.parse_args()


def normalize_coordinates(result: dict) -> dict:
    if "x" in result and isinstance(result["x"], list):
        coord_list = result["x"]
        if len(coord_list) >= 2:
            result["x"] = int(coord_list[0])
            result["y"] = int(coord_list[1])
            if len(coord_list) >= 4:
                result["x2"] = int(coord_list[2])
                result["y2"] = int(coord_list[3])
        elif len(coord_list) == 1:
            result["x"] = int(coord_list[0])

    if "y" in result and isinstance(result["y"], list):
        if len(result["y"]) >= 1:
            result["y"] = int(result["y"][0])

    for coord_key in ["coordinate", "coordinates", "coord", "coords"]:
        if coord_key in result and isinstance(result[coord_key], list):
            coord_list = result[coord_key]
            if len(coord_list) >= 2:
                result["x"] = int(coord_list[0])
                result["y"] = int(coord_list[1])
                if len(coord_list) >= 4:
                    result["x2"] = int(coord_list[2])
                    result["y2"] = int(coord_list[3])
            del result[coord_key]

    for key in ["x", "y", "x2", "y2", "startX", "startY", "endX", "endY", "amount"]:
        if key in result and result[key] is not None:
            try:
                result[key] = int(result[key])
            except (ValueError, TypeError):
                pass

    return result


def extract_action_from_response(response: str) -> dict:
    answer_match = re.search(r"<answer>(.*?)</answer>", response, re.DOTALL)
    if answer_match:
        answer_content = answer_match.group(1).strip()
    else:
        answer_content = response.strip()

    try:
        json_str = answer_content.replace("'", '"')
        if json_str.startswith("[") and json_str.endswith("]"):
            json_str = json_str[1:-1].strip()
        result = json.loads(json_str)
        return normalize_coordinates(result)
    except json.JSONDecodeError:
        pass

    action_match = re.search(r'"action"\s*:\s*"(\w+)"', answer_content)
    if not action_match:
        action_match = re.search(r"'action'\s*:\s*'(\w+)'", answer_content)

    action = action_match.group(1) if action_match else "unknown"
    coords: dict[str, object] = {}

    for field in ["x", "y", "x2", "y2", "startX", "startY", "endX", "endY", "amount", "time"]:
        field_match = re.search(rf'"{field}"\s*:\s*(\d+)', answer_content)
        if field_match:
            coords[field] = int(field_match.group(1))

    for field in ["text", "key", "direction", "url"]:
        field_match = re.search(rf'"{field}"\s*:\s*"([^"]*)"', answer_content)
        if field_match:
            coords[field] = field_match.group(1)

    return normalize_coordinates({"action": action, **coords})


def build_sampler_path(args: argparse.Namespace, tinker_module) -> str:
    if args.sampler_path:
        return args.sampler_path

    if not args.state_path:
        raise ValueError("either --sampler-path or --state-path is required")

    service_client = tinker_module.ServiceClient(base_url=args.base_url)
    training_client = service_client.create_training_client_from_state_with_optimizer(
        args.state_path
    )
    checkpoint_name = (
        args.sampler_name
        or Path(args.state_path.rstrip("/")).name.replace("/", "_") + "_sampler"
    )
    sampler_result = training_client.save_weights_for_sampler(name=checkpoint_name).result()
    return sampler_result.path


def main() -> int:
    args = parse_args()

    import tinker
    from tinker import types as tinker_types

    sampler_path = build_sampler_path(args, tinker)
    service_client = tinker.ServiceClient(base_url=args.base_url)
    sampling_client = service_client.create_sampling_client(model_path=sampler_path)
    tokenizer = sampling_client.get_tokenizer()

    end_token_ids = tokenizer.encode("<|im_end|>", add_special_tokens=False)
    if len(end_token_ids) != 1:
        raise RuntimeError("expected exactly one <|im_end|> token id")
    end_token_id = end_token_ids[0]

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            image_b64 = request["image_base64"]
            image_bytes = base64.b64decode(image_b64)
            instruction = request["instruction"]
            history = request.get("history") or "None"
            max_tokens = int(request.get("max_tokens", 768))
            temperature = float(request.get("temperature", 0.0))

            prompt = (
                ACTION_PROMPT
                .replace("__INSTRUCTION__", instruction)
                .replace("__HISTORY__", history)
            )
            prefix_tokens = tokenizer.encode(
                "<|im_start|>user\n<|vision_start|>", add_special_tokens=False
            )
            suffix_tokens = tokenizer.encode(
                f"<|vision_end|>\n{prompt}<|im_end|>\n<|im_start|>assistant\n",
                add_special_tokens=False,
            )
            model_input = tinker.ModelInput(
                chunks=[
                    tinker_types.EncodedTextChunk(tokens=prefix_tokens),
                    tinker_types.ImageChunk(data=image_bytes, format="png"),
                    tinker_types.EncodedTextChunk(tokens=suffix_tokens),
                ]
            )
            sampling_params = tinker_types.SamplingParams(
                max_tokens=max_tokens,
                stop=[end_token_id],
                temperature=temperature,
            )
            result = sampling_client.sample(
                prompt=model_input,
                num_samples=1,
                sampling_params=sampling_params,
            ).result()
            tokens = result.sequences[0].tokens
            text = tokenizer.decode(tokens, skip_special_tokens=False)
            text = text.replace("<|im_end|>", "").strip()
            parsed = extract_action_from_response(text)
            thinking = None
            thinking_match = re.search(r"<thinking>(.*?)</thinking>", text, re.DOTALL)
            if thinking_match:
                thinking = thinking_match.group(1).strip()
            response = {
                "ok": True,
                "sampler_path": sampler_path,
                "action": parsed.get("action", "unknown"),
                "x": parsed.get("x"),
                "y": parsed.get("y"),
                "x2": parsed.get("x2"),
                "y2": parsed.get("y2"),
                "text": parsed.get("text"),
                "key": parsed.get("key"),
                "direction": parsed.get("direction"),
                "startX": parsed.get("startX"),
                "startY": parsed.get("startY"),
                "endX": parsed.get("endX"),
                "endY": parsed.get("endY"),
                "amount": parsed.get("amount"),
                "time": parsed.get("time"),
                "url": parsed.get("url"),
                "thinking": thinking,
                "raw_response": text,
            }
        except Exception as exc:
            response = {"ok": False, "error": str(exc)}

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
