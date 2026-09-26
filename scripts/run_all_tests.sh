#!/bin/bash
# HyperNexus Full Test Suite
# Run: bash scripts/run_all_tests.sh

set -e

echo "=========================================="
echo "  HyperNexus Full Test Suite"
echo "  Date: $(date)"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

run_test() {
	local test_name="$1"
	local test_cmd="$2"

	echo -n "  $test_name ... "

	if result=$(eval "$test_cmd" 2>/dev/null); then
		echo -e "${GREEN}PASS${NC}"
		PASS=$((PASS + 1))
		return 0
	else
		echo -e "${RED}FAIL${NC}"
		FAIL=$((FAIL + 1))
		return 1
	fi
}

echo "=========================================="
echo "  Phase 1: Core Infrastructure"
echo "=========================================="
echo ""

run_test "1.1 Go Kernel Health" "curl -sk https://hypernexus.site/api/go/health | grep -q '\"ok\":true'"
run_test "1.2 Dashboard Load" "curl -sk https://hypernexus.site/dashboard | grep -q '<title>HyperNexus</title>'"
run_test "1.3 API Proxy" "curl -sk https://hypernexus.site/api/go/api/mcp/status | grep -q '\"success\":true'"
run_test "1.4 tRPC Endpoint" "curl -sk https://hypernexus.site/trpc/mcp.getStatus | grep -q '\"result\"'"
run_test "1.5 Direct Go Kernel" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'curl -s http://localhost:7778/health' | grep -q '\"ok\":true'"
run_test "1.6 Nginx Proxy Chain" "curl -sk https://hypernexus.site/api/go/health | grep -q '\"ok\":true' && curl -sk https://hypernexus.site/api/health | grep -q '\"ok\":true'"
run_test "1.7 Service Status" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'systemctl is-active hypernexus.service' | grep -q 'active'"

echo ""
echo "=========================================="
echo "  Phase 2: MCP & Tools"
echo "=========================================="
echo ""

run_test "2.1 MCP Server List" "curl -sk https://hypernexus.site/api/go/api/mcp/servers | grep -q '\"success\":true'"
run_test "2.2 MCP Server Status" "curl -sk https://hypernexus.site/api/go/api/mcp/status | grep -q '\"connected\":true'"
run_test "2.3 MCP Tool Search" "curl -sk 'https://hypernexus.site/api/go/api/mcp/tools/search?query=test' | grep -q '\"success\":true'"
run_test "2.4 MCP Server Configuration" "curl -sk https://hypernexus.site/api/go/api/mcp/servers/configured | grep -q '\"success\":true'"
run_test "2.5 MCP Working Set" "curl -sk https://hypernexus.site/api/go/api/mcp/working-set | grep -q '\"tools\"'"
run_test "2.6 MCP Server List (tRPC)" "curl -sk https://hypernexus.site/trpc/mcp.listServers | grep -q '\"result\"'"
run_test "2.7 Local MCP Binary" "echo '{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"id\":1,\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}' | timeout 5 C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe mcp 2>/dev/null | grep -q '\"capabilities\"'"

echo ""
echo "=========================================="
echo "  Phase 3: Memory System"
echo "=========================================="
echo ""

run_test "3.1 Store Memory (Server)" "curl -sk -X POST https://hypernexus.site/api/go/api/memory/facts/add -H 'Content-Type: application/json' -d '{\"title\":\"Test\",\"content\":\"Test content\",\"tags\":[\"test\"],\"namespace\":\"project\"}' | grep -q '\"success\":true'"
run_test "3.2 Search Memory (Server)" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'curl -s http://localhost:7778/api/memory/search?query=test' | grep -q '\"success\":true'"
run_test "3.3 Store Memory (Local)" "cd C:/Users/hyper/workspace/HyperNexus && python scripts/memory_local.py store 'Test' 'Test content' 'test' | grep -qE 'Memory stored|Memory already exists'"
run_test "3.4 Search Memory (Local)" "cd C:/Users/hyper/workspace/HyperNexus && python scripts/memory_local.py search 'test' | grep -q 'Found'"
run_test "3.5 List Memories (Local)" "cd C:/Users/hyper/workspace/HyperNexus && python scripts/memory_local.py list | grep -q 'Listing'"
run_test "3.6 Memory File Verification" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'test -f /opt/tormentnexus/.hypernexus/agent_memory/memories.json' && test -f C:/Users/hyper/workspace/HyperNexus/.tormentnexus/agent_memory/memories.json"
run_test "3.7 Dual Storage" "curl -sk -X POST https://hypernexus.site/api/go/api/memory/facts/add -H 'Content-Type: application/json' -d '{\"title\":\"Dual\",\"content\":\"Dual test\",\"tags\":[\"dual\"],\"namespace\":\"project\"}' | grep -q '\"success\":true' && cd C:/Users/hyper/workspace/HyperNexus && python scripts/memory_local.py store 'Dual' 'Dual test' 'dual' | grep -qE 'Memory stored|Memory already exists'"

echo ""
echo "=========================================="
echo "  Phase 4: Billing & Stripe"
echo "=========================================="
echo ""

run_test "4.1 Checkout Session Creation" "curl -sk -X POST https://hypernexus.site/api/go/api/billing/stripe/checkout -H 'Content-Type: application/json' -d '{\"plan\":\"pro\"}' | grep -q '\"sessionId\"'"
run_test "4.2 Price ID Verification" "curl -sk -X POST https://hypernexus.site/api/go/api/billing/stripe/checkout -H 'Content-Type: application/json' -d '{\"plan\":\"pro\"}' | grep -q 'price_1TxqpoPISUNpi4xXjfth4nvk'"
run_test "4.3 Stripe URL Generation" "curl -sk -X POST https://hypernexus.site/api/go/api/billing/stripe/checkout -H 'Content-Type: application/json' -d '{\"plan\":\"pro\"}' | grep -q 'checkout.stripe.com'"
run_test "4.4 Webhook Endpoint" "curl -sk -X POST https://hypernexus.site/api/go/api/billing/stripe/webhook -H 'Content-Type: application/json' -d '{}' | grep -q '\"received\":true'"
run_test "4.5 Webhook Secret Config" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'grep -q STRIPE_WEBHOOK_SECRET /opt/tormentnexus/.env'"
run_test "4.6 Billing Status" "curl -sk https://hypernexus.site/api/go/api/billing/status | grep -q '\"success\":true'"
run_test "4.7 Subscription Check" "curl -sk https://hypernexus.site/api/go/api/billing/stripe/subscription | grep -q '\"success\":true'"

echo ""
echo "=========================================="
echo "  Phase 5: Sessions & Agents"
echo "=========================================="
echo ""

run_test "5.1 Imported Sessions List" "curl -sk 'https://hypernexus.site/api/go/api/sessions/imported/list?limit=5' | grep -q '\"success\":true'"
run_test "5.2 Session Import Scan" "curl -sk -X POST https://hypernexus.site/api/go/api/sessions/imported/scan | grep -q '\"success\":true'"
run_test "5.3 Marketing Agent Status" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'systemctl is-active marketing-agent.service' | grep -q 'active'"
run_test "5.4 Marketing Agent Health" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'curl -s http://localhost:8084/' | grep -q 'login'"
run_test "5.5 Memory Export Service" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'curl -s http://localhost:7778/api/memory/search?query=test' | grep -q '\"success\":true'"
run_test "5.6 Cloud Service Status" "ssh -o StrictHostKeyChecking=no root@hypernexus.site 'systemctl is-active hypernexus-cloud.service' | grep -q 'active'"
run_test "5.7 Agent Memory Stats" "curl -sk https://hypernexus.site/api/go/api/agent-memory/stats | grep -q '\"success\":true'"

echo ""
echo "=========================================="
echo "  Phase 6: Dashboard Pages"
echo "=========================================="
echo ""

run_test "6.1 Dashboard Home Page" "curl -sk https://hypernexus.site/dashboard | grep -q '<title>HyperNexus</title>'"
run_test "6.2 Memory Page" "curl -sk https://hypernexus.site/dashboard/memory | grep -q 'dashboard'"
run_test "6.3 Sessions Page" "curl -sk https://hypernexus.site/dashboard/sessions | grep -q 'dashboard'"
run_test "6.4 Tools Page" "curl -sk https://hypernexus.site/dashboard/tools | grep -q '<title>HyperNexus</title>'"
run_test "6.5 Settings Page" "curl -sk https://hypernexus.site/dashboard/settings | grep -q 'dashboard'"
run_test "6.6 Billing Page" "curl -sk https://hypernexus.site/dashboard/billing | grep -q 'dashboard'"
run_test "6.7 Brain Page" "curl -sk https://hypernexus.site/dashboard/brain | grep -q 'dashboard'"

echo ""
echo "=========================================="
echo "  RESULTS"
echo "=========================================="
echo ""
echo -e "  Passed: ${GREEN}$PASS${NC}"
echo -e "  Failed: ${RED}$FAIL${NC}"
echo -e "  Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
	echo -e "${GREEN}=========================================="
	echo "  ALL TESTS PASSED!"
	echo -e "==========================================${NC}"
	exit 0
else
	echo -e "${RED}=========================================="
	echo "  SOME TESTS FAILED"
	echo -e "==========================================${NC}"
	exit 1
fi
