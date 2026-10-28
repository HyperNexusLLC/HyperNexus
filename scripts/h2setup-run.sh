export HARNESS2_SOLVER_MODEL=meta/muse-spark-1.3-contributor
export HARNESS2_IMPROVER_MODEL=meta/muse-spark-1.3-contributor
export HARNESS2_CODEX_MODEL=muse-spark-1.3-contributor
export HARNESS2_JUDGE_MODEL=meta/muse-spark-1.3-contributor
export HARNESS2_JUDGE_BASE_URL=https://api.meta.ai/v1
# Token read LIVE from pi auth.json at launch (pi owns refresh; never stored).
export HARNESS2_JUDGE_API_KEY
HARNESS2_JUDGE_API_KEY=$(node -e "console.log(require(process.env.HOME+'/.pi/agent/auth.json').meta.access)")
harness2-setup jb > /tmp/h2setup.log 2>&1
