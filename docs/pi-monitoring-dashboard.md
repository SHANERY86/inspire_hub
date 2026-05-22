# Simple Pi monitoring dashboard

[Netdata](https://www.netdata.cloud/) on the Pi already collects CPU, RAM, and disk metrics. This repo includes a **minimal one-page dashboard** that reads Netdata’s API.

Full Netdata UI (all charts): `http://192.168.1.68:19999/`

Simple dashboard (3 cards): see below.

## 1. Copy the page to the Pi

From your Mac (repo root):

```bash
scp scripts/pi-monitoring-dashboard.html pi@192.168.1.68:/home/pi/
```

## 2. Serve it (pick one)

**Option A — quick test (Python, port 8765)**

```bash
ssh pi@192.168.1.68
cd ~
python3 -m http.server 8765
```

Open: `http://192.168.1.68:8765/pi-monitoring-dashboard.html`

Stop with Ctrl+C when done testing.

**Option B — keep it running (systemd user service)**

```bash
ssh pi@192.168.1.68
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/pi-dashboard.service <<'EOF'
[Unit]
Description=Simple Pi monitoring dashboard
After=network.target

[Service]
ExecStart=/usr/bin/python3 -m http.server 8765 --directory /home/pi
WorkingDirectory=/home/pi
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now pi-dashboard.service
loginctl enable-linger pi
```

Open: `http://192.168.1.68:8765/pi-monitoring-dashboard.html`

## 3. Different Netdata URL

If Netdata is not on the default host/port:

```
http://192.168.1.68:8765/pi-monitoring-dashboard.html?netdata=http://127.0.0.1:19999
```

## What each card shows

| Card | Source (Netdata chart) | Meaning |
|------|------------------------|---------|
| CPU | `system.cpu` | Sum of busy CPU % (user, system, iowait, etc.) |
| CPU temp | `sensors.temperature_cpu_thermal-…_temp1_input` | CPU temperature °C |
| Load | `system.load` | 1 / 5 / 15 min load (bar vs 4 cores) |
| RAM | `system.ram` | Used % and used/free/total in MB |
| RAM available | `mem.available` | MB available for new apps |
| Disk `/` | `disk_space./` | Used % and free/used/total in GB |

Refreshes every 5 seconds.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Page loads but metrics error | `systemctl status netdata` on the Pi |
| Cannot open port 8765 | Open in router/firewall or use SSH tunnel: `ssh -L 8765:127.0.0.1:8765 pi@192.168.1.68` then open `http://127.0.0.1:8765/...` |
| Wrong Pi IP | Edit `?netdata=` query or change default in the HTML |

For the full monitoring app, use Netdata directly at port **19999**.
