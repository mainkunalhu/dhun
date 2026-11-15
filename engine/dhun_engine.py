#!/usr/bin/env python3
"""Dhun voice engine sidecar.

Newline-delimited JSON over stdio. One render at a time, on a worker thread, so
`cancel` can be read while a model is generating. The model stays warm until a
different model is requested.

Requests:
  {"id": 1, "method": "ping"}
  {"id": 2, "method": "render", "params": {...}}
  {"method": "cancel"}
  {"method": "shutdown"}

Responses:
  {"id": 2, "type": "progress", "value": {"progress": 42}}
  {"id": 2, "type": "result", "value": {"wavPath": "...", "durationMs": 1420, "sampleRate": 24000}}
  {"id": 2, "type": "error", "error": {"code": "RENDER_FAILED", "message": "..."}}
"""

from __future__ import annotations

import json
import os
import queue
import sys
import threading
import traceback

import numpy as np
import soundfile as sf

OUT = sys.stdout
# Keep the protocol channel clean: anything a library prints goes to stderr.
sys.stdout = sys.stderr
WRITE_LOCK = threading.Lock()

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "de": "German",
    "fr": "French",
    "ru": "Russian",
    "pt": "Portuguese",
    "es": "Spanish",
    "it": "Italian",
}


def emit(payload: dict) -> None:
    with WRITE_LOCK:
        OUT.write(json.dumps(payload, ensure_ascii=False) + "\n")
        OUT.flush()


class Engine:
    def __init__(self) -> None:
        self.model = None
        self.model_key: str | None = None
        self.cancel = threading.Event()
        self.jobs: queue.Queue = queue.Queue()
        self.worker = threading.Thread(target=self.run, daemon=True)
        self.worker.start()

    def load(self, path: str):
        if self.model_key == path and self.model is not None:
            return self.model

        from mlx_audio.tts.utils import load_model

        self.model = None
        self.model_key = None
        model = load_model(path)
        self.model = model
        self.model_key = path
        return model

    def run(self) -> None:
        while True:
            item = self.jobs.get()
            if item is None:
                return

            request_id, params = item
            self.cancel.clear()

            try:
                self.render(request_id, params)
            except Exception as error:  # noqa: BLE001 - report every failure
                if self.cancel.is_set():
                    emit(
                        {
                            "id": request_id,
                            "type": "error",
                            "error": {
                                "code": "CANCELED",
                                "message": "Canceled.",
                            },
                        }
                    )
                else:
                    emit(
                        {
                            "id": request_id,
                            "type": "error",
                            "error": {
                                "code": "RENDER_FAILED",
                                "message": str(error),
                                "trace": traceback.format_exc()[-2000:],
                            },
                        }
                    )

    def render(self, request_id: int, params: dict) -> None:
        engine = params["engine"]
        model_path = params["modelPath"]
        script = params["script"]
        voice_id = params.get("voiceId") or ""
        voice_name = params.get("voiceName") or voice_id
        voice_prompt = params.get("voicePrompt") or ""
        language = params.get("language") or "en"
        speed = float(params.get("speed") or 1.0)
        output_path = params["outputPath"]

        emit({"id": request_id, "type": "progress", "value": {"progress": 5}})
        model = self.load(model_path)
        emit({"id": request_id, "type": "progress", "value": {"progress": 15}})

        if engine == "qwen3-tts":
            chunks = model.generate_voice_design(
                text=script,
                instruct=voice_prompt or "A natural voice.",
                language=LANGUAGE_NAMES.get(language, "English"),
            )
        elif engine == "maya2":
            chunks = model.generate(
                text=script,
                voice=voice_name,
                lang_code=language,
            )
        elif engine == "kokoro":
            chunks = model.generate(
                text=script,
                voice=voice_id,
                speed=speed,
            )
        elif engine == "chatterbox":
            raise RuntimeError(
                "Chatterbox needs a reference voice; voice cloning is next."
            )
        else:
            raise RuntimeError(f"Unsupported engine: {engine}")

        parts = []
        sample_rate = 24000
        count = 0

        for chunk in chunks:
            if self.cancel.is_set():
                raise RuntimeError("Canceled")

            audio = np.asarray(chunk.audio, dtype=np.float32).reshape(-1)
            if audio.size:
                parts.append(audio)
                sample_rate = int(getattr(chunk, "sample_rate", sample_rate))
                count += 1
                emit(
                    {
                        "id": request_id,
                        "type": "progress",
                        "value": {"progress": min(92, 15 + count * 4)},
                    }
                )

        if not parts:
            raise RuntimeError("The model produced no audio.")

        audio = np.clip(np.concatenate(parts), -1.0, 1.0)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        sf.write(output_path, audio, sample_rate)

        emit(
            {
                "id": request_id,
                "type": "result",
                "value": {
                    "wavPath": output_path,
                    "durationMs": int(len(audio) / sample_rate * 1000),
                    "sampleRate": sample_rate,
                },
            }
        )


def main() -> None:
    engine = Engine()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue

        method = request.get("method")
        request_id = request.get("id")

        if method == "ping":
            emit({"id": request_id, "type": "result", "value": {"ok": True}})
        elif method == "render":
            engine.jobs.put((request_id, request.get("params") or {}))
        elif method == "cancel":
            engine.cancel.set()
        elif method == "shutdown":
            engine.cancel.set()
            engine.jobs.put(None)
            break

    engine.jobs.put(None)
    engine.worker.join()


if __name__ == "__main__":
    main()
