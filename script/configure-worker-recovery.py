#!/usr/bin/env python3
"""Maintain the hourly Fly Machine that recovers missed worker wake requests."""
import json
import subprocess
import sys
import tempfile

APP = "shred-day-worker"
NAME = "queue-recovery"

machines = json.loads(subprocess.check_output(["fly", "machine", "list", "--app", APP, "--json"]))
existing = [machine for machine in machines if machine["name"] == NAME]
if len(existing) > 1:
    raise SystemExit("Multiple recovery Machines found; refusing to add another")

config = {
    "image": sys.argv[1],
    "init": {"cmd": ["ruby", "bin/wake-worker"]},
    "env": {"WORKER_WAKE_URL": "http://shred-day-worker.flycast/wake"},
    "guest": {"cpu_kind": "shared", "cpus": 1, "memory_mb": 512},
    "schedule": "hourly",
    "restart": {"policy": "on-failure", "max_retries": 3},
    "services": [],
    "metadata": {"role": "queue-recovery"},
}

with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as config_file:
    json.dump(config, config_file)
    config_file.flush()
    if existing:
        command = ["fly", "machine", "update", existing[0]["id"], "--yes", "--skip-start"]
    else:
        command = ["fly", "machine", "run", sys.argv[1], "--name", NAME, "--region", "fra"]
    subprocess.run(command + ["--app", APP, "--machine-config", config_file.name], check=True)
