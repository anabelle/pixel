# 🏥 Server Restoration Guide

So, the server is locked, and we need to start fresh. Don't worry, we saved the data! 🛡️

Here is your step-by-step guide to getting **LNPixels** back online with all 9,000+ pixels intact.

## 📦 What You Have
1.  **Codebase**: The full project code is safe on your local machine.
2.  **Data**: `pixels.json` contains the complete database of pixels.
3.  **Scripts**:
    -   `restore_pixels.js`: To import the data back into the database.
    -   `download_pixels.py`: The tool we used to save the data (for reference).

---

## 🚀 Speedrun to Recovery

### 1. Provision New Server
Spin up a new VPS (Ubuntu 22.04/24.04 recommended). Set up your SSH key immediately so we don't repeat history! 😉
**Requirement**: At least 2GB RAM is recommended for the build process.

### 2. Prepare the Environment
SSH into your new server and run these commands to install the basics:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20+), npm, and Python
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 build-essential git
npm install -g pm2 bun

# Verify installations
node -v
bun -v
pm2 -v
```

### 3. Clone & Setup Code
Clone your repository (or copy the files from your local machine).

```bash
# Example if using git
git clone <your-repo-url> pixel
cd pixel

# Install dependencies
npm install
cd lnpixels && npm install
```

### 4. Restore the Data
This is the magic moment. 

1.  **Upload `pixels.json` and `restore_pixels.js`** to the server. You can use `scp`:
    ```bash
    scp pixels.json restore_pixels.js user@your-new-server-ip:~/pixel/
    ```

2.  **Run the Restoration Script**:
    Move the files to the root of your project (where you can run node) and execute:
    ```bash
    # Run the restoration script
    # Usage: node restore_pixels.js <source_json> <target_db_path>
    
    # Example (assuming you are in project root and lnpixels/api exists)
    node restore_pixels.js pixels.json lnpixels/api/pixels.db
    ```

3.  **Verify**: You should see a success message: `Restored 9041 pixels...`.

### 5. Launch! 🚀
Now that the database is in place (`lnpixels/api/pixels.db`), you can start the application.

```bash
# From the root directory
npm run deploy:production
```

Or manually:
```bash
# Build
npm run build -w lnpixels/api
npm run build -w lnpixels/web

# Start
pm2 start ecosystem.config.js
```

---

## 🛡️ Future Proofing
To avoid getting locked out again:
1.  **Keep SSH Keys Safe**: Ensure you have multiple keys if possible.
2.  **Disable Password Auth ONLY after** verifying SSH access works.
3.  **Enable Backups**: Ensure `autonomous-backup.sh` is running in cron!

Good luck! 
