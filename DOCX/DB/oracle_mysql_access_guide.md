# Oracle MySQL Access Guide

## Goal
This document explains how to access the SignLingo Oracle Cloud MySQL HeatWave database from local development tools, VSCode, Docker, Flask, and Django.

Related schema snapshot:
- [`document/DB/oracle_mysql_schema.md`](/home/kotaiho/26-1/Signlingo_V2/document/DB/oracle_mysql_schema.md)

---

## Architecture

```text
Developer Local Machine
        ↓ SSH Tunnel
Oracle Compute VM
        ↓ Private Network
Oracle MySQL HeatWave DB System
```

Oracle MySQL HeatWave DB System has a private endpoint only.  
Developers must connect through the Oracle Compute VM using SSH local port forwarding.

---

## Connection Info

| Item | Value |
|------|-------|
| VM Public IP | `134.185.98.192` |
| DB Private IP | `10.0.1.50` |
| DB Port | `3306` |
| Local Tunnel Host | `127.0.0.1` |
| Local Tunnel Port | `3307` |
| Database Name | `signlingo` |
| DB Engine | Oracle Cloud MySQL HeatWave |

Do not write the DB password or SSH private key in this document.

---

## SSH Key Rule

### Do Not Share

Never share these files:

```text
private key
.env
DB password
Oracle_DB/ssh-key-2026-04-10.key
```

### Recommended Team Flow

Each developer creates their own SSH key pair:

```bash
ssh-keygen -t ed25519 -C "your-name-signlingo"
```

The developer sends only the public key to the DB/infra owner:

```text
~/.ssh/id_ed25519.pub
```

The developer must keep this file private:

```text
~/.ssh/id_ed25519
```

The DB/infra owner adds the public key to the VM:

```text
~/.ssh/authorized_keys
```

---

## 1. Open SSH Tunnel

Run this command in a terminal and keep it open:

```bash
ssh -L 3307:10.0.1.50:3306 -i ~/.ssh/id_ed25519 ubuntu@134.185.98.192
```

If using the original local key before moving it out of the repo:

```bash
ssh -L 3307:10.0.1.50:3306 -i Oracle_DB/ssh-key-2026-04-10.key ubuntu@134.185.98.192
```

Expected behavior:

```text
No output is normal.
The terminal stays connected.
Do not close this terminal while using the DB.
```

---

## 2. Test DB Connection with MySQL CLI

In another terminal:

```bash
mysql -h 127.0.0.1 -P 3307 -u admin -p signlingo
```

Useful commands:

```sql
SHOW TABLES;
SELECT COUNT(*) FROM user;
SELECT COUNT(*) FROM lesson;
SELECT COUNT(*) FROM shop_item;
```

Expected seed counts:

```text
course: 1
module: 1
unit: 1
lesson: 3
user: 1
shop_item: 4
```

---

## 3. Flask and Django Local Access

Use the `signlingo` conda environment.

```bash
conda activate signlingo
```

### Flask local access

Set `.env`:

```env
DATABASE_URI=mysql+pymysql://DB_USER:DB_PASSWORD@127.0.0.1:3307/signlingo
```

Apply migrations:

```bash
flask --app app.py db upgrade
```

Seed initial data without dropping tables:

```bash
flask --app app.py seed-data
```

Run Flask:

```bash
flask --app app.py run
```

Open:

```text
http://127.0.0.1:5000
```

### Django local access

The Django development branch uses the same tunnel, but reads `DATABASE_URI` through `django_port/manage.py`.

Set the database URI:

```env
DATABASE_URI=mysql+pymysql://DB_USER:DB_PASSWORD@127.0.0.1:3307/signlingo
```

Run migrations:

```bash
python django_port/manage.py migrate --fake-initial
```

Seed legacy starter data:

```bash
python django_port/manage.py bootstrap_legacy_data
```

Run Django:

```bash
python django_port/manage.py runserver 127.0.0.1:8000 --noreload
```

Open:

```text
http://127.0.0.1:8000
```

---

## 4. Docker Access

Docker containers cannot use `127.0.0.1:3307` to reach a tunnel running on the host.

For Docker Compose, use:

```env
DATABASE_URI=mysql+pymysql://DB_USER:DB_PASSWORD@host.docker.internal:3307/signlingo
```

Start the SSH tunnel on the host first:

```bash
ssh -L 3307:10.0.1.50:3306 -i ~/.ssh/id_ed25519 ubuntu@134.185.98.192
```

Then run:

```bash
docker compose up --build
```

Open:

```text
http://localhost:5001
```

---

## 5. VSCode Table View

Recommended extensions:

```text
SQLTools
SQLTools MySQL/MariaDB/TiDB
```

Create a new SQLTools connection:

| Field | Value |
|------|-------|
| Driver | MySQL/MariaDB |
| Connection Name | SignLingo Oracle MySQL |
| Server Address | `127.0.0.1` |
| Port | `3307` |
| Database | `signlingo` |
| Username | DB username |
| Password | DB password |
| SSL | Disabled |

After connecting:

- Open the SQLTools panel
- Expand `SignLingo Oracle MySQL`
- Expand `Tables`
- Right-click a table
- Select `Show Table Records`

Useful queries:

```sql
SELECT * FROM user;
SELECT * FROM lesson;
SELECT * FROM shop_item;
SELECT * FROM user_lesson_status;
```

---

## 6. ERD View in VSCode

Open:

```text
document/week6/signlingo_erd_preview.md
```

Then use:

```text
Ctrl+Shift+V
```

If Mermaid does not render, install:

```text
Markdown Preview Mermaid Support
```

---

## 7. Important Commands

### Safe migration

```bash
flask --app app.py db upgrade
```

### Safe seed

```bash
flask --app app.py seed-data
```

### Dangerous reset

Use only when intentionally resetting the database:

```bash
ALLOW_DB_RESET=1 flask --app app.py init-app
```

Warning:

```text
init-app runs db.drop_all().
It can delete cloud DB tables and data.
Do not run it casually.
```

---

## Troubleshooting

### SSH tunnel does not connect

Check:

- VM public IP is correct
- SSH key path is correct
- SSH key permission is `600`
- VM is running
- Port `22` is open

Fix key permission:

```bash
chmod 600 ~/.ssh/id_ed25519
```

### MySQL connection fails

Check:

- SSH tunnel terminal is still open
- `.env` host is correct
  - Local Flask: `127.0.0.1`
  - Docker Compose: `host.docker.internal`
- Port is `3307`
- DB user/password is correct
- Database name is `signlingo`

### Flask says missing column

Run migrations:

```bash
flask --app app.py db upgrade
```

Current expected Alembic version:

```text
91b8f2d4c6a1
```

---

## Current Verified State

Verified on 2026-04-28:

- [x] VM SSH access works
- [x] VM can reach DB private IP `10.0.1.50:3306`
- [x] Local tunnel `127.0.0.1:3307` works
- [x] `signlingo` database exists
- [x] Alembic version is `91b8f2d4c6a1`
- [x] `user.is_verified` exists in Oracle MySQL
- [x] Seed data exists
- [x] Flask responds on `/`, `/login`, `/start`
- [x] Admin login redirects to `/dashboard`
- [x] Django `manage.py check` passes
- [x] Django `migrate --fake-initial` succeeds against Oracle MySQL
- [x] Django `bootstrap_legacy_data` succeeds against Oracle MySQL
- [x] Django reads `DATABASE_URI=mysql+pymysql://...@127.0.0.1:3307/signlingo`

---

*작성일: 2026-04-28*
*대상: Oracle Cloud MySQL HeatWave DB access workflow*
