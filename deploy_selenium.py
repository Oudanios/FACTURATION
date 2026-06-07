#!/usr/bin/env python3
"""
Selenium-based deployment script for FACTURATION.
Handles Render web service creation + Namecheap DNS CNAME.
Uses YOUR existing browser login sessions — just keep your Chrome logged in.
"""
import os
import sys
import time
import getpass
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# ─── Configuration ───────────────────────────────────────────────
RENDER_URL = "https://dashboard.render.com/web/new"
NAMECHEAP_DNS_URL = "https://ap.www.namecheap.com/Domains/DomainControlPanel/serramaradmin.site/advancedns"
FACTURATION_REPO = "https://github.com/Oudanios/FACTURATION"
SUBDOMAIN = "audit"
DOMAIN = "serramaradmin.site"
SERVICE_NAME = "facturation-audit"

print("=" * 60)
print("  FACTURATION Deployment — Selenium Automation")
print("=" * 60)

# ─── Get MongoDB URIs ─────────────────────────────────────────────
print("\nMongoDB URIs (same Atlas cluster, different DB names):")
mongo_uri = getpass.getpass("MONGODB_URI (facturation_audit): ").strip()
seramar_uri = getpass.getpass("SERAMAR_MONGODB_URI (serramar): ").strip()

if not mongo_uri or not seramar_uri:
    print("ERROR: Both URIs required.")
    sys.exit(1)

# ─── Launch browser ───────────────────────────────────────────────
print("\nLaunching Chrome...")
options = webdriver.ChromeOptions()
options.add_argument("--start-maximized")
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option("useAutomationExtension", False)

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
wait = WebDriverWait(driver, 30)

# ═══════════════════════════════════════════════════════════════════
#  PART 1: Create Render Web Service
# ═══════════════════════════════════════════════════════════════════
print("\n[1/4] Opening Render...")
driver.get(RENDER_URL)
time.sleep(3)

# If not logged in, user must log in
if "login" in driver.current_url.lower():
    print("\n>>> Please log in to Render in the Chrome window that opened.")
    print(">>> Press Enter in THIS terminal when done...")
    input()
    driver.get(RENDER_URL)
    time.sleep(5)

print("  Selecting FACTURATION repo...")
try:
    # Find and click the FACTURATION repo button
    repo_btn = wait.until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'FACTURATION')]"))
    )
    repo_btn.click()
    time.sleep(8)

    # Wait for the form to load
    print("  Waiting for form to load...")
    name_input = wait.until(
        EC.presence_of_element_located((By.NAME, "name"))
    )
    time.sleep(2)

    # Fill name
    name_input.clear()
    name_input.send_keys(SERVICE_NAME)
    print(f"  ✓ Name: {SERVICE_NAME}")

    # Build command
    build_input = driver.find_element(By.NAME, "buildCommand")
    build_input.clear()
    build_input.send_keys("npm install && npm run build:all")
    print("  ✓ Build command")

    # Start command
    start_input = driver.find_element(By.NAME, "startCommand")
    start_input.clear()
    start_input.send_keys("NODE_ENV=production npm start")
    print("  ✓ Start command")

    # Select Free plan (usually default)
    time.sleep(1)

    # Add environment variables
    print("  Adding environment variables...")
    env_vars = [
        ("NODE_ENV", "production"),
        ("MONGODB_URI", mongo_uri),
        ("SERAMAR_MONGODB_URI", seramar_uri),
        ("PORT", "10000"),
    ]

    # Find "Add Environment Variable" buttons and add env vars
    add_env_btns = driver.find_elements(By.XPATH, "//button[contains(text(),'Add Environment Variable')]")
    
    for i, (key, value) in enumerate(env_vars):
        if i > 0:
            # Click first add env button
            add_env_btns = driver.find_elements(By.XPATH, "//button[contains(text(),'Add Environment Variable')]")
            if add_env_btns:
                driver.execute_script("arguments[0].click();", add_env_btns[0])
                time.sleep(0.5)

        # Find all key-value inputs
        key_inputs = driver.find_elements(By.XPATH, "//input[@placeholder='Key']")
        val_inputs = driver.find_elements(By.XPATH, "//input[@placeholder='Value']")
        
        if i < len(key_inputs) and i < len(val_inputs):
            key_inputs[i].clear()
            key_inputs[i].send_keys(key)
            val_inputs[i].clear()
            val_inputs[i].send_keys(value)
            print(f"  ✓ Env: {key}")

    # Click "Create Web Service"
    print("\n  Clicking 'Create Web Service'...")
    create_btn = driver.find_element(By.XPATH, "//button[contains(text(),'Create Web Service')]")
    driver.execute_script("arguments[0].click();", create_btn)
    print("  ✅ Service creation submitted!")
    
    # Wait for deployment to start
    time.sleep(10)
    print(f"  Service URL will be: {SERVICE_NAME}.onrender.com")
    
    render_service_url = f"{SERVICE_NAME}.onrender.com"

except Exception as e:
    print(f"  Render automation issue: {e}")
    render_service_url = f"{SERVICE_NAME}.onrender.com"
    print(f"  Using default URL: {render_service_url}")

# ═══════════════════════════════════════════════════════════════════
#  PART 2: Add Custom Domain on Render
# ═══════════════════════════════════════════════════════════════════
print(f"\n[2/4] Adding custom domain {SUBDOMAIN}.{DOMAIN} on Render...")
print("  Navigate to the Render service → Settings → Custom Domains")
print(f"  Add: {SUBDOMAIN}.{DOMAIN}")
print("  (Cannot automate this step — Render UI changes after deploy)")
input("  Press Enter after you've added the custom domain (or to skip)...")

# ═══════════════════════════════════════════════════════════════════
#  PART 3: Namecheap DNS CNAME
# ═══════════════════════════════════════════════════════════════════
print(f"\n[3/4] Opening Namecheap Advanced DNS for {DOMAIN}...")
driver.get(NAMECHEAP_DNS_URL)
time.sleep(5)

if "login" in driver.current_url.lower() or "twofa" in driver.current_url.lower():
    print("\n>>> Please log in to Namecheap and complete 2FA in the Chrome window.")
    print(">>> Press Enter in THIS terminal when done...")
    input()
    driver.get(NAMECHEAP_DNS_URL)
    time.sleep(8)

print("  Looking for 'ADD NEW RECORD' button...")
try:
    # Scroll down to DNS records section
    driver.execute_script("window.scrollTo(0, 600);")
    time.sleep(2)

    # Find and click "ADD NEW RECORD"
    add_record_btn = wait.until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'ADD NEW RECORD') or contains(text(),'NEW RECORD')]"))
    )
    driver.execute_script("arguments[0].click();", add_record_btn)
    time.sleep(2)

    # Select CNAME type
    type_selects = driver.find_elements(By.TAG_NAME, "select")
    for sel in type_selects:
        try:
            sel.click()
            time.sleep(0.3)
            cname_option = sel.find_element(By.XPATH, ".//option[contains(text(),'CNAME')]")
            cname_option.click()
            print("  ✓ Type: CNAME Record")
            break
        except:
            continue

    time.sleep(1)

    # Fill Host
    host_inputs = driver.find_elements(By.XPATH, "//input[@placeholder='Host' or contains(@name,'host')]")
    if host_inputs:
        host_inputs[0].clear()
        host_inputs[0].send_keys(SUBDOMAIN)
        print(f"  ✓ Host: {SUBDOMAIN}")

    # Fill Value
    value_inputs = driver.find_elements(By.XPATH, "//input[@placeholder='Value' or contains(@name,'value') or contains(@name,'address')]")
    if value_inputs:
        value_inputs[0].clear()
        value_inputs[0].send_keys(render_service_url)
        print(f"  ✓ Value: {render_service_url}")

    # Click Save / checkmark
    time.sleep(1)
    save_btns = driver.find_elements(By.XPATH, "//button[contains(@class,'save') or contains(text(),'Save') or contains(text(),'✓')]")
    if save_btns:
        driver.execute_script("arguments[0].click();", save_btns[0])
        print("  ✅ DNS record saved!")
    else:
        print("  ⚠ Could not find Save button — check the page and save manually.")

except Exception as e:
    print(f"  Namecheap automation issue: {e}")
    print(f"  MANUAL: Add CNAME Record → Host: {SUBDOMAIN} → Value: {render_service_url}")

# ═══════════════════════════════════════════════════════════════════
#  PART 4: Summary
# ═══════════════════════════════════════════════════════════════════
print()
print("=" * 60)
print("  DEPLOYMENT SUMMARY")
print("=" * 60)
print(f"  Domain:    https://{SUBDOMAIN}.{DOMAIN}")
print(f"  Render:    {render_service_url}")
print(f"  GitHub:    {FACTURATION_REPO}")
print(f"  Database:  facturation_audit (new, isolated)")
print()
print("  SSL certificate: Auto-provisioned by Render (~5-15 min after deploy)")
print("  Build time: ~3-5 minutes on first deploy")
print("=" * 60)

print("\nPress Enter to close the browser...")
input()
driver.quit()
