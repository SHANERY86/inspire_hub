# Weekly Pi backup → Google Drive

Back up Inspire Hub on the Pi (Postgres + screenshot media), keep a few local copies, and upload each archive to Google Drive with **rclone**. No Mac or SSH pull required.

## What gets backed up

- `postgres.sql.gz` — full DB dump from the running `db` container
- `media.tar` — screenshots from the `backend` container (if any)
- `manifest.txt` — timestamp, hostname, paths

Archives are named `inspire_hub_backup_YYYYMMDD_HHMMSS.tar.gz`.

## 1. Install the script on the Pi

From your Mac (repo root):

```bash
ssh pi@192.168.1.68 'sudo mkdir -p /opt/inspire_hub/scripts /var/backups/inspire_hub'
scp scripts/backup-on-pi.sh pi@192.168.1.68:/tmp/
ssh pi@192.168.1.68 'sudo install -m 755 /tmp/backup-on-pi.sh /opt/inspire_hub/scripts/backup-on-pi.sh && sudo chown pi:pi /var/backups/inspire_hub'
```

Test manually (as `pi`, must be in the `docker` group):

```bash
ssh pi@192.168.1.68
/opt/inspire_hub/scripts/backup-on-pi.sh
ls -lh /var/backups/inspire_hub/
```

## 2. Install rclone and link Google Drive

On the Pi (Buster may need the static installer if apt is old):

```bash
# If apt has a recent rclone:
sudo apt-get update && sudo apt-get install -y rclone

# Otherwise (static binary, works on armhf Buster):
# curl -O https://downloads.rclone.org/rclone-current-linux-arm.zip
# unzip … && sudo install rclone-v*/rclone /usr/local/bin/rclone
```

### Google OAuth: use your own client ID (required)

If the browser shows **“Access blocked: rclone’s request is invalid”**, Google has rejected rclone’s shared app. You need a **personal OAuth client** (not a special backup key — just a free Google Cloud login).

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → configure:
   - User type: **External** (personal Gmail is fine)
   - App name: e.g. `inspire-hub-backup`
   - Add your Gmail as a **test user** (while app is in “Testing”)
   - **Data access / Scopes**: add `https://www.googleapis.com/auth/drive` (full Drive access for uploads)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Desktop app**
   - Copy the **Client ID** and **Client secret** (click “Reset secret” if secret is empty)
5. On the same OAuth client, under **Authorized redirect URIs**, add:
   ```
   http://127.0.0.1:53682/
   ```
   (rclone prints this URL during auth; without it you may get `redirect_uri_mismatch`.)

Keep the app in **Testing** mode and add yourself as a test user — that is enough for personal backups. You may see a “Google hasn’t verified this app” screen; choose **Advanced → Go to … (unsafe)**. Tokens in Testing mode can expire after 7 days; re-run `rclone config reconnect gdrive:` if uploads suddenly fail.

### Configure rclone remote `gdrive`

On the **Pi** (or on your **Mac** with the same `~/.config/rclone/rclone.conf` copied to the Pi afterward):

```bash
rclone config
# n) new remote
# name: gdrive
# storage: drive
# client_id:     <paste your Client ID>
# client_secret: <paste your Client secret>
# scope: 1 (full access) — needed for uploads
# service_account_file: blank
# Edit advanced config: n
```

**Headless Pi (no browser):** answer **n** to “Use auto config?”, then on your Mac:

```bash
rclone authorize "drive" "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET"
```

Open the URL it prints, sign in, approve. Paste the token blob back into `rclone config` on the Pi.

**Machine with a browser:** answer **y** to auto config; browser opens `http://127.0.0.1:53682/`.

```bash
# Configure as Shared Drive: n
```

Official walkthrough: [rclone — Making your own client_id](https://rclone.org/drive/#making-your-own-client-id).

Create a folder in Drive (e.g. **Inspire Hub Backups**) and note the path. Rclone paths look like `gdrive:Inspire Hub Backups` (spaces are fine).

Test upload:

```bash
RCLONE_DEST='gdrive:Inspire Hub Backups' /opt/inspire_hub/scripts/backup-on-pi.sh
```

Check the file appears in Google Drive.

## 3. Persistent settings

```bash
sudo tee /etc/default/inspire-hub-backup <<'EOF'
INSTALL_DIR=/opt/inspire_hub
BACKUP_DIR=/var/backups/inspire_hub
RCLONE_DEST='gdrive:Inspire Hub Backups'
RETAIN_LOCAL=0
RETAIN_REMOTE=1
EOF
```

Adjust `RCLONE_DEST` to match your rclone remote name and folder.

After each successful run, **local** archives are removed (`RETAIN_LOCAL=0` by default — Pi disk stays empty). On Drive, only the newest file is kept (`RETAIN_REMOTE=1`). Set `RETAIN_REMOTE=2` or higher if you want more history in Google Drive.

## 4. Weekly cron

As `pi`:

```bash
crontab -e
```

Add (Sundays at 03:00):

```cron
0 3 * * 0 /opt/inspire_hub/scripts/backup-on-pi.sh >> /home/pi/inspire-hub-backup.log 2>&1
```

The script sources `/etc/default/inspire-hub-backup` when present, so `RCLONE_DEST` does not need to be repeated in crontab.

Verify cron after the first run:

```bash
tail -50 /home/pi/inspire-hub-backup.log
```

## Optional: Mac pull script

`scripts/backup-from-pi.sh` still works for ad-hoc downloads to your laptop but is not needed for scheduled Drive backups. Prefer the Pi cron flow above.

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| `permission denied` on docker | `sudo usermod -aG docker pi` then log out/in |
| `db` not running | `cd /opt/inspire_hub && docker compose -f docker-compose.ghcr.yml ps` |
| `Access blocked: rclone's request is invalid` | Do **not** leave client_id/secret blank — create your own OAuth client (section above) |
| `redirect_uri_mismatch` | Add `http://127.0.0.1:53682/` to OAuth client redirect URIs |
| rclone `Failed to copy` | `rclone lsd gdrive:` and re-run `rclone config` |
| Disk full on Pi | Default `RETAIN_LOCAL=0` deletes local `.tar.gz` after each run |
| Old backups still on Drive | Set `RETAIN_REMOTE=1` in `/etc/default/inspire-hub-backup` and redeploy the script |
| OAuth expired (Testing app ~7 days) | `rclone config reconnect gdrive:` |
