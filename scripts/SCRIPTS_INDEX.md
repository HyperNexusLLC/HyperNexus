# Scripts Index — HyperNexus

Organized by category. Archived scripts are in `archive/2026-10-cleanup/`.

## Build & Deploy
| Script | Purpose |
|--------|---------|
| `build.cjs` | Main build orchestrator |
| `build_all.mjs` | Full workspace build |
| `build_startup.mjs` | Startup build (stale) |
| `ci-deploy-hetzner.sh` | CI/CD Hetzner deployment |
| `create-deploy-package.sh` | Create deployment package |
| `deploy-hetzner.sh` | Deploy to Hetzner |
| `deploy-restart-kernel.sh` | Deploy + restart kernel |
| `deploy-v1011.sh` | v1.0.11 deployment |
| `hetzner-setup.sh` | Hetzner server setup |
| `hetzner-rename.sh` | Hetzner hostname rename |
| `sync-versions.mjs` | Sync versions across packages |

## Install & Setup
| Script | Purpose |
|--------|---------|
| `install.bat` | Windows installer |
| `install.sh` | Linux installer |
| `install_all.bat` | Full Windows install |
| `install_all.ps1` | Full PowerShell install |
| `install_codewhale.bat` | CodeWhale integration |
| `install_services.bat` | Windows services |
| `install-client-support.py` | Client support setup |
| `install-gui.py` | GUI installer |
| `install-watchdog.ps1` | Watchdog installer |
| `setup.bat` | Basic setup |
| `setup.py` | Python setup |
| `setup-api-key.sh` | API key setup |

## Testing & Verification
| Script | Purpose |
|--------|---------|
| `test-all.sh` | Run all tests |
| `run_all_tests.sh` | Test runner |
| `test-final.sh` | Final verification |
| `test-billing-deployment.sh` | Billing tests |
| `test-l2-roundtrip.ps1` | L2 memory roundtrip |
| `test_marketing_cdp.py` | Marketing CDP test |
| `e2e_integration_verify.py` | E2E integration |
| `check_release_gate.mjs` | Release gate check |
| `check_extensions.ps1` | Extension check |
| `dashboard-smoke.cjs` | Dashboard smoke test |
| `benchmark.py` | Performance benchmark |
| `fix_and_test_go_tools.py` | Go tools test |

## Memory & Data
| Script | Purpose |
|--------|---------|
| `memory_local.py` | Local memory storage |
| `memory-consolidation.sh` | Memory consolidation |
| `extract-memories.py` | Extract memories |
| `migrate-memories.py` | Migrate memories |
| `rebuild-vectors.py` | Rebuild vectors |

## Marketing & Outreach
| Script | Purpose |
|--------|---------|
| `campaign_scheduler.py` | Campaign scheduling |
| `outreach_automation.py` | Outreach automation |
| `outreach_followup.py` | Follow-up emails |
| `outreach_smtp.py` | SMTP outreach |
| `outreach_targeted.py` | Targeted outreach |
| `outreach_top100.py` | Top 100 outreach |
| `autonomous_marketing.py` | Auto marketing |
| `linkedin-posts.md` | LinkedIn content |
| `post_linkedin_article.py` | Post to LinkedIn |
| `reddit_outreach.py` | Reddit outreach |
| `x_dm_outreach.py` | X/Twitter DMs |
| `daily_status.py` | Daily status report |

## Monitoring & Health
| Script | Purpose |
|--------|---------|
| `monitor.sh` | System monitoring |
| `health-monitor.sh` | Health monitoring |
| `health-dashboard.ps1` | Health dashboard |
| `kernel-watchdog.ps1` | Kernel watchdog |
| `watchdog.py` | Python watchdog |
| `catalog-status.sh` | Catalog status |
| `check-mcp-tools.sh` | MCP tools check |
| `check-search-bridge.sh` | Search bridge check |

## Content & Blog
| Script | Purpose |
|--------|---------|
| `gen-blog.py` | Generate blog |
| `gen-catalog-page.py` | Generate catalog |
| `content_calendar.py` | Content calendar |
| `directory_submissions.py` | Directory submissions |
| `find-relevant-threads.py` | Thread finder |
| `enrich-catalog.py` | Enrich catalog |
| `enrich-mimo.py` | Enrich MiMo |
| `scrape-all-registries.py` | Scrape registries |
| `scrape-mcp-servers.py` | Scrape MCP servers |
| `scrape-mega.py` | Mega scrape |
| `scrape-more.py` | Additional scrape |

## Utilities
| Script | Purpose |
|--------|---------|
| `tn.py` | TN CLI utility |
| `template-loader.py` | Template loader |
| `check_responses.py` | Response checker |
| `check-placeholder-regressions.mjs` | Placeholder check |
| `verify_dev_readiness.mjs` | Dev readiness |
| `embedder-healthcheck.mjs` | Embedder health |
| `dev_tabby_ready.mjs` | Tabby readiness |
| `publish-all-npm.js` | NPM publisher |
| `cleanup_repo.sh` | Repo cleanup |
| `add-stripe-checkout.py` | Stripe checkout |
| `update_stripe_keys.py` | Stripe keys |
| `update-stripe-key.sh` | Stripe key update |
| `bobbybookmarks_sync.py` | Bookmarks sync |
| `ingest_bobbybookmarks.py` | Ingest bookmarks |
| `swarm_v7.py` | Swarm v7 |
| `llm_reply.py` | LLM reply |
| `assimilate_all_resources.py` | Resource assimilation |
| `scan_ai_tools.ps1` | AI tools scan |
| `referral-status.sh` | Referral status |
| `growth-dashboard.sh` | Growth dashboard |
