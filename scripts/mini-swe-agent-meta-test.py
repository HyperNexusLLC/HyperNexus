"""mini-swe-agent meta hack verification: real stack, no broken prompt_toolkit UI."""
import os

os.environ["MSWEA_SILENT_STARTUP"] = "1"
import minisweagent  # noqa: F401  (loads global .env via dotenv)
from minisweagent.models.litellm_model import LitellmModel

model_name = os.getenv("MSWEA_MODEL_NAME", "openai/muse-spark-1.3-contributor")
print("model:", model_name)
print("base:", os.getenv("OPENAI_API_BASE"))
print("key_len:", len(os.getenv("OPENAI_API_KEY", "")))

model = LitellmModel(model_name=model_name)
# query() expects agent tool-call format; _query() is the raw litellm path -
# proves endpoint reachability + auth + model routing through the real stack.
resp = model._query([{"role": "user", "content": "Reply with exactly: MINISWEA-META-OK and nothing else"}])
print("RESULT:", resp.choices[0].message.content)
