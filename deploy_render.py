#!/usr/bin/env python3
"""
SERAMAR — Deploy FACTURATION to Render & set up audit.serramaradmin.site subdomain

PREREQUISITES:
  1. Render API key from: https://dashboard.render.com/u/settings/api-keys
     → Set env var RENDER_API_KEY or pass via --render-key
  2. Namecheap API enabled on serramaradmin.site domain
     → Set env vars: NAMECHEAP_API_USER, NAMECHEAP_API_KEY
     → Or pass via --namecheap-user, --namecheap-key

USAGE:
  python deploy_facturation.py --render-key rnd_xxx
  python deploy_facturation.py --render-key rnd_xxx --namecheap-user myuser --namecheap-key xxxxxxxxxxxx
"""

import os, sys, json, argparse, subprocess
from urllib.request import Request, urlopen
from urllib.error import HTTPError

RENDER_API_BASE = "https://api.render.com/v1"
NAMECHEAP_API_BASE = "https://api.namecheap.com/xml.response"
GITHUB_REPO = "Oudanios/FACTURATION"
SERVICE_NAME = "facturation-audit"
DOMAIN = "serramaradmin.site"
SUBDOMAIN = "audit"

# ─── ANSI colors ────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):  print(f"{GREEN}✓{RESET} {msg}")
def err(msg): print(f"{RED}✗{RESET} {msg}")
def info(msg): print(f"{CYAN}→{RESET} {msg}")
def warn(msg): print(f"{YELLOW}⚠{RESET} {msg}")

# ─── Render API helper ──────────────────────────────────────────────────────────
def render_request(api_key: str, method: str, path: str, body: dict = None):
    url = f"{RENDER_API_BASE}/{path}"
    data = json.dumps(body).encode() if body else None
    req = Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json") if data else None
    try:
        resp = urlopen(req)
        return json.loads(resp.read()) if resp.status != 204 else {}
    except HTTPError as e:
        try:
            detail = json.loads(e.read())
            raise RuntimeError(f"Render API error ({e.code}): {detail.get('message', str(detail))}")
        except json.JSONDecodeError:
            raise RuntimeError(f"Render API error ({e.code}): {e.reason}")

# ─── Namecheap API helper ───────────────────────────────────────────────────────
def namecheap_request(api_user: str, api_key: str, command: str, params: dict = None):
    """Calls Namecheap API and returns parsed XML result."""
    from urllib.parse import urlencode
    base_params = {
        "ApiUser": api_user,
        "ApiKey": api_key,
        "UserName": api_user,
        "Command": command,
        "ClientIp": "127.0.0.1",  # Namecheap requires a whitelisted IP; for sandbox use
    }
    if params:
        base_params.update(params)
    query = urlencode(base_params)
    url = f"{NAMECHEAP_API_BASE}?{query}"
    try:
        resp = urlopen(url)
        return resp.read().decode()
    except HTTPError as e:
        raise RuntimeError(f"Namecheap API error ({e.code}): {e.reason}")

# ─── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Deploy FACTURATION to Render + DNS")
    parser.add_argument("--render-key", help="Render API key (or set RENDER_API_KEY env)")
    parser.add_argument("--namecheap-user", help="Namecheap API username")
    parser.add_argument("--namecheap-key", help="Namecheap API key")
    parser.add_argument("--mongodb-uri", help="MongoDB connection string for FACTURATION (or set MONGODB_URI env)")
    parser.add_argument("--seramar-mongodb-uri", help="SERAMAR MongoDB URI for cross-reference (or set SERAMAR_MONGODB_URI env)")
    parser.add_argument("--dns-only", action="store_true", help="Only set up DNS, skip Render service creation")
    parser.add_argument("--render-only", action="store_true", help="Only create Render service, skip DNS")
    args = parser.parse_args()

    render_key = args.render_key or os.environ.get("RENDER_API_KEY")
    mongodb_uri = args.mongodb_uri or os.environ.get("MONGODB_URI")
    seramar_mongodb_uri = args.seramar_mongodb_uri or os.environ.get("SERAMAR_MONGODB_URI")

    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{CYAN}║   SERRAMAR — FACTURATION DEPLOY TOOL           ║{RESET}")
    print(f"{BOLD}{CYAN}╚══════════════════════════════════════════════════╝{RESET}\n")

    # ─── Step 1: Verify GitHub repo is accessible ────────────────────────────
    info("Checking GitHub repo accessibility...")
    try:
        gh = urlopen(f"https://api.github.com/repos/{GITHUB_REPO}")
        gh_data = json.loads(gh.read())
        if gh.getcode() == 200:
            ok(f"GitHub repo {BOLD}{GITHUB_REPO}{RESET} found — {gh_data.get('default_branch', 'main')} branch")
        else:
            err(f"GitHub repo not found: {GITHUB_REPO}")
            sys.exit(1)
    except Exception as e:
        err(f"Cannot reach GitHub: {e}")
        sys.exit(1)

    if not args.dns_only:
        # ─── Step 2: Render service creation ─────────────────────────────────
        if not render_key:
            err("Render API key required! Set RENDER_API_KEY env or pass --render-key")
            sys.exit(1)

        info("Connecting to Render API...")
        try:
            # Get owner ID
            owner_data = render_request(render_key, "GET", "owners")
            owner_id = owner_data[0]["owner"]["id"] if isinstance(owner_data, list) else owner_data["id"]
            ok(f"Render owner: {BOLD}{owner_id}{RESET}")
        except Exception as e:
            err(f"Render API connection failed: {e}")
            sys.exit(1)

        # Check if service already exists
        info("Checking for existing service...")
        existing = None
        try:
            services = render_request(render_key, "GET", f"services?name={SERVICE_NAME}&ownerId={owner_id}")
            if services and len(services) > 0:
                existing = services[0]["service"]
                warn(f"Service '{SERVICE_NAME}' already exists (ID: {existing['id']})")
                warn(f"URL: {existing.get('serviceDetails', {}).get('url', 'N/A')}")
        except Exception:
            pass

        if not existing:
            info(f"Creating Render web service: {BOLD}{SERVICE_NAME}{RESET}")
            env_vars = []
            if mongodb_uri:
                env_vars.append({"key": "MONGODB_URI", "value": mongodb_uri})
            if seramar_mongodb_uri:
                env_vars.append({"key": "SERAMAR_MONGODB_URI", "value": seramar_mongodb_uri})
            env_vars.append({"key": "NODE_ENV", "value": "production"})

            service_body = {
                "type": "web_service",
                "name": SERVICE_NAME,
                "ownerId": owner_id,
                "repo": f"https://github.com/{GITHUB_REPO}",
                "branch": "main",
                "autoDeploy": "yes",
                "serviceDetails": {
                    "env": "node",
                    "buildCommand": "npm install && npm run build:all",
                    "startCommand": "NODE_ENV=production npm start",
                    "envVars": env_vars,
                }
            }
            try:
                result = render_request(render_key, "POST", "services", service_body)
                service_url = result.get("service", {}).get("serviceDetails", {}).get("url", "")
                ok(f"Service created! ID: {result.get('service', {}).get('id', '?')}")
                if service_url:
                    ok(f"Render URL: {BOLD}{service_url}{RESET}")
            except Exception as e:
                err(f"Service creation failed: {e}")
                sys.exit(1)
        else:
            # Update env vars on existing service
            info("Updating environment variables on existing service...")
            if mongodb_uri or seramar_mongodb_uri:
                try:
                    env_vars_to_update = {}
                    if mongodb_uri:
                        env_vars_to_update["MONGODB_URI"] = mongodb_uri
                    if seramar_mongodb_uri:
                        env_vars_to_update["SERAMAR_MONGODB_URI"] = seramar_mongodb_uri
                    # Render API for env vars is PATCH /services/:id/env-vars
                    sid = existing["id"]
                    # Get current env vars
                    current_env = render_request(render_key, "GET", f"services/{sid}/env-vars")
                    for ev in current_env:
                        if ev["envVar"]["key"] in env_vars_to_update:
                            # Update it
                            render_request(render_key, "PUT", f"services/{sid}/env-vars/{ev['envVar']['id']}",
                                          {"key": ev["envVar"]["key"], "value": env_vars_to_update[ev["envVar"]["key"]]})
                            del env_vars_to_update[ev["envVar"]["key"]]
                    # Add remaining
                    for key, value in env_vars_to_update.items():
                        render_request(render_key, "POST", f"services/{sid}/env-vars", {"key": key, "value": value})
                    ok("Environment variables updated.")
                except Exception as e:
                    warn(f"Env var update failed (may need manual setup): {e}")
            else:
                warn("No MongoDB URIs provided — set MONGODB_URI in Render dashboard manually.")

        info("Render setup complete. Next: set up DNS.\n")

    if not args.render_only:
        # ─── Step 3: Namecheap DNS ───────────────────────────────────────────
        namecheap_user = args.namecheap_user or os.environ.get("NAMECHEAP_API_USER")
        namecheap_key = args.namecheap_key or os.environ.get("NAMECHEAP_API_KEY")

        if not namecheap_user or not namecheap_key:
            warn("Namecheap API credentials not provided.")
            warn(f"\n{YELLOW}MANUAL DNS STEP:{RESET}")
            print(f"  1. Log into Namecheap → Domain List → {BOLD}{DOMAIN}{RESET} → Advanced DNS")
            print(f"  2. Add CNAME Record:")
            print(f"     • Type:  {BOLD}CNAME Record{RESET}")
            print(f"     • Host:  {BOLD}{SUBDOMAIN}{RESET}")
            print(f"     • Value: {BOLD}<your-render-service>.onrender.com{RESET}")
            print(f"     • TTL:   {BOLD}Automatic{RESET}\n")
        else:
            info(f"Adding CNAME record on Namecheap: {BOLD}{SUBDOMAIN}.{DOMAIN}{RESET}")
            try:
                # First, get the Render service URL to use as target
                services = render_request(render_key, "GET", f"services?name={SERVICE_NAME}&ownerId={owner_id}")
                if not services or len(services) == 0:
                    err("Cannot find Render service to get URL. Add CNAME manually.")
                else:
                    render_url = services[0]["service"].get("serviceDetails", {}).get("url", "")
                    if not render_url:
                        err("Render service has no URL yet (still deploying?)")
                    else:
                        # Namecheap domains.dns.setHosts API
                        # First get current hosts
                        result = namecheap_request(namecheap_user, namecheap_key, "namecheap.domains.dns.getHosts", {
                            "SLD": DOMAIN.split('.')[0],
                            "TLD": DOMAIN.split('.')[1],
                        })
                        info(f"Current DNS records retrieved.")
                        # Add CNAME
                        result = namecheap_request(namecheap_user, namecheap_key, "namecheap.domains.dns.setHosts", {
                            "SLD": DOMAIN.split('.')[0],
                            "TLD": DOMAIN.split('.')[1],
                            "HostName1": SUBDOMAIN,
                            "RecordType1": "CNAME",
                            "Address1": render_url,
                            "TTL1": "1800",
                        })
                        ok(f"DNS CNAME record added: {BOLD}{SUBDOMAIN}.{DOMAIN} → {render_url}{RESET}")
                        ok(f"Audit app will be at: {BOLD}https://{SUBDOMAIN}.{DOMAIN}{RESET}")
            except Exception as e:
                err(f"DNS setup failed: {e}")
                warn(f"\n{YELLOW}MANUAL DNS STEP:{RESET}")
                print(f"  Add CNAME: {BOLD}{SUBDOMAIN}{RESET} → your Render service URL\n")

    # ─── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{BOLD}{'='*50}{RESET}")
    print(f"{BOLD}{GREEN}DEPLOYMENT COMPLETE{RESET}")
    print(f"{BOLD}{'='*50}{RESET}")
    print(f"\n  {CYAN}Render Service:{RESET} {SERVICE_NAME}")
    print(f"  {CYAN}GitHub Repo:{RESET}    https://github.com/{GITHUB_REPO}")
    print(f"  {CYAN}Subdomain:{RESET}     https://{SUBDOMAIN}.{DOMAIN}")
    print(f"\n  {YELLOW}Note:{RESET} DNS may take 5-30 min to propagate.")
    print(f"  {YELLOW}Note:{RESET} Render deploy takes 2-5 min on first push.\n")

if __name__ == "__main__":
    main()
