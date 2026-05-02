# Oracle Cloud MySQL Infrastructure Handover

## Overview

This project uses **Oracle Cloud MySQL HeatWave DB System (Always Free)** as the primary database.

Because Oracle MySQL DB Systems are **not directly accessible from the public internet**, the architecture uses an intermediate **Compute VM (Bastion-style host)** for database access. Oracle documents note that DB system endpoints are private-only and require access through a compute instance, bastion, VPN, or similar networking service. ([Oracle Documentation][1])

---

## Final Architecture

```text
Developer Local Machine
        ↓ SSH
Oracle Compute VM (Public IP)
        ↓ Private Network
Oracle MySQL DB System (Private IP)
```

---

## Resource Summary

### MySQL DB System

| Field      | Value                    |
| ---------- | ------------------------ |
| Name       | Signlingo-DB             |
| Type       | MySQL HeatWave DB System |
| Shape      | Always Free              |
| Private IP | 10.0.1.50                |
| Port       | 3306                     |
| Admin User | admin                    |

---

### Compute VM

| Field      | Value                  |
| ---------- | ---------------------- |
| Name       | signlingo-vm           |
| OS         | Ubuntu 22.04           |
| Shape      | VM.Standard.E2.1.Micro |
| Public IP  | 134.185.98.192         |
| Private IP | 10.0.1.93              |

---

### Network

| Resource         | Value         |
| ---------------- | ------------- |
| VCN              | Signlingo     |
| Public Subnet    | public-subnet |
| Internet Gateway | igw-signlingo |

---

## Why This Architecture Was Chosen

### Problem

Oracle MySQL DB Systems:

* Do **NOT** expose public IP
* Cannot be directly accessed externally
* Only accessible inside OCI VCN

### Solution

Use Compute VM as intermediate access node:

* SSH into VM
* Connect from VM to DB private IP

---

## Developer Access Workflow

### 1. SSH into VM

```bash
ssh -i <private-key>.key ubuntu@134.185.98.192
```

---

### 2. Connect to MySQL from VM

```bash
mysql -h 10.0.1.50 -u admin -p
```

---

## Optional: Local Port Forwarding

If developer wants to use local DB GUI / IDE:

```bash
ssh -L 3307:10.0.1.50:3306 -i <private-key>.key ubuntu@134.185.98.192
```

Then connect locally with:

```bash
mysql -h 127.0.0.1 -P 3307 -u admin -p
```

Useful for:

* DBeaver
* MySQL Workbench
* VSCode SQL Extensions

---

## Initial VM Setup Performed

### Installed MySQL Client

```bash
sudo apt update
sudo apt install mysql-client -y
```

---

## Important Security / Networking Rules

### VM Security List

| Port | Purpose    |
| ---- | ---------- |
| 22   | SSH Access |

---

### DB Security Rules

| Port | Purpose               |
| ---- | --------------------- |
| 3306 | MySQL Access from VCN |

---

## Operational Notes

### HeatWave Cluster

* Was initially enabled by default during provisioning
* Not required for current project
* Can be disabled later if needed

---

### Password Reset

If admin password is lost:

* Oracle Console → DB System → More Actions → Reset Administrator Password

---

## Recommended Team Workflow

### For Each Developer

1. Obtain SSH key
2. SSH into VM
3. Connect to DB via MySQL client

---

## Future Improvement Ideas

### Option 1: Bastion Service

Replace Compute VM with OCI Bastion for tighter security.

### Option 2: VPN Access

Establish VCN VPN for direct private subnet access.

### Option 3: Network Load Balancer

Expose DB externally (NOT recommended for security).

---

## Cost / Free Tier Notes

### Current Resources

* MySQL DB System: Always Free
* VM: Always Free E2.1.Micro

### Monitor

Ensure no non-free resources are provisioned accidentally.

---

## Key Lessons Learned / Pitfalls

1. Oracle DB Systems do NOT provide public endpoint.
2. VM/Bastion is mandatory for external access.
3. Public IP on Compute VM must be enabled.
4. SSH key must be saved immediately during VM creation.
5. DB authentication failures may require password reset from OCI console.

---

## Quick Troubleshooting

### SSH Timeout

Check:

* Public IP correct
* Port 22 open
* VM running

---

### MySQL Access Denied

Check:

* Correct admin password
* Reset admin password in OCI if needed

---

### Cannot Reach DB

Check:

* VM and DB in same VCN
* DB security rules allow 3306
* Use private IP, not public IP

---

## Reference Docs

* Oracle MySQL DB systems are private-only / use compute instance for access
* Oracle recommends compute/bastion/VPN for DB connectivity

(See Oracle Cloud MySQL HeatWave networking docs)

[1]: https://docs.oracle.com/en-us/iaas/mysql-database/doc/compute-instance.html "https://docs.oracle.com/en-us/iaas/mysql-database/doc/compute-instance.html"
