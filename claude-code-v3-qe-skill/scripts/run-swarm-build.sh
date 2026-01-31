#!/bin/bash
#
# Build with Quality - Swarm Automation Script
#
# This script automates the setup and execution of a multi-agent swarm
# to build applications using Claude Flow V3 + Agentic QE.
#
# Usage:
#   ./run-swarm-build.sh [project-name] [template]
#
# Examples:
#   ./run-swarm-build.sh shopflow-v2-swarm ecommerce
#   ./run-swarm-build.sh my-api-swarm api
#   ./run-swarm-build.sh my-app-swarm custom
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
EXAMPLES_DIR="$SKILL_DIR/examples"
SKILL_CONFIG="$SKILL_DIR/config/skill.yaml"

# Default values
PROJECT_NAME="${1:-shopflow-v2-swarm}"
TEMPLATE="${2:-ecommerce}"
MAX_AGENTS=13
TOPOLOGY="hierarchical-mesh"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Build with Quality - Swarm Automation                ║${NC}"
echo -e "${BLUE}║       Claude Flow V3 + Agentic QE (111+ agents)            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Step 1: Check Prerequisites
# ============================================================================
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 not found"
        return 1
    fi
}

MISSING_DEPS=0

check_command "node" || MISSING_DEPS=1
check_command "npm" || MISSING_DEPS=1
check_command "git" || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}Error: Missing required dependencies. Please install Node.js and npm.${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Step 2: Install Claude Flow V3
# ============================================================================
echo -e "${YELLOW}Step 2: Setting up Claude Flow V3...${NC}"

if npx claude-flow --version &> /dev/null 2>&1; then
    CLAUDE_FLOW_VERSION=$(npx claude-flow --version 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}✓${NC} Claude Flow V3 already installed (${CLAUDE_FLOW_VERSION})"
else
    echo -e "  ${BLUE}→${NC} Installing Claude Flow V3..."
    npx claude-flow@alpha init --yes 2>/dev/null || {
        echo -e "  ${YELLOW}⚠${NC} Claude Flow init had warnings (this is often OK)"
    }
    echo -e "  ${GREEN}✓${NC} Claude Flow V3 installed"
fi

echo ""

# ============================================================================
# Step 3: Install Agentic QE
# ============================================================================
echo -e "${YELLOW}Step 3: Setting up Agentic QE...${NC}"

if command -v aqe &> /dev/null; then
    AQE_VERSION=$(aqe --version 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}✓${NC} Agentic QE already installed (${AQE_VERSION})"
else
    echo -e "  ${BLUE}→${NC} Installing Agentic QE globally..."
    npm install -g agentic-qe 2>/dev/null || {
        echo -e "  ${YELLOW}⚠${NC} Agentic QE installation had issues"
        echo -e "  ${YELLOW}⚠${NC} Continuing without Agentic QE (reduced capabilities)"
    }

    if command -v aqe &> /dev/null; then
        echo -e "  ${BLUE}→${NC} Initializing Agentic QE..."
        aqe init --auto 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Agentic QE installed and initialized"
    fi
fi

echo ""

# ============================================================================
# Step 4: Setup MCP Server (if Claude Code CLI available)
# ============================================================================
echo -e "${YELLOW}Step 4: Configuring MCP servers...${NC}"

if command -v claude &> /dev/null; then
    echo -e "  ${BLUE}→${NC} Adding Agentic QE as MCP server..."
    claude mcp add aqe -- aqe-mcp 2>/dev/null || {
        echo -e "  ${YELLOW}⚠${NC} MCP server setup skipped (may already exist)"
    }
    echo -e "  ${GREEN}✓${NC} MCP configuration complete"
else
    echo -e "  ${YELLOW}⚠${NC} Claude CLI not found - skipping MCP setup"
    echo -e "  ${YELLOW}⚠${NC} Install with: npm install -g @anthropic-ai/claude-code"
fi

echo ""

# ============================================================================
# Step 5: Create Project Directory
# ============================================================================
echo -e "${YELLOW}Step 5: Creating project directory...${NC}"

PROJECT_DIR="$EXAMPLES_DIR/$PROJECT_NAME"

if [ -d "$PROJECT_DIR" ]; then
    echo -e "  ${YELLOW}⚠${NC} Directory $PROJECT_NAME already exists"
    read -p "  Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "  ${RED}Aborted.${NC}"
        exit 1
    fi
    rm -rf "$PROJECT_DIR"
fi

mkdir -p "$PROJECT_DIR"
echo -e "  ${GREEN}✓${NC} Created $PROJECT_DIR"

echo ""

# ============================================================================
# Step 6: Generate Prompt Based on Template
# ============================================================================
echo -e "${YELLOW}Step 6: Generating swarm prompt...${NC}"

generate_ecommerce_prompt() {
cat <<'PROMPT'
# Build with Quality - Claude Flow V3 Swarm

## Skill Activation
build-with-quality v1.0.0 (111+ agents, hierarchical-mesh)
Config: skill.yaml - FULL CAPABILITY MODE

## Project Context
- **Name:** ShopFlow-V2-Swarm
- **Type:** web-app
- **Stack:** Next.js 14 + TypeScript + Prisma + PostgreSQL + Stripe + Redis
- **Description:** E-commerce platform with cart, checkout, and order management

## Task
Build complete e-commerce with product catalog, cart, checkout, and orders

## Acceptance Criteria
- [ ] Product catalog with search and filters
- [ ] Shopping cart (persistent across sessions)
- [ ] Stripe checkout integration
- [ ] Order history and status tracking
- [ ] Admin dashboard for inventory
- [ ] Email notifications (order confirmation)

## Methodology
- **DDD:**
  - Core Domain: Orders, Payments
  - Supporting: Catalog, Inventory, Notifications
  - Bounded Contexts: Shopping, Fulfillment, Admin
  - Aggregates: Product, Cart, Order
  - Domain Events: ProductAddedToCart, OrderPlaced, PaymentCompleted
- **ADR:** Document all significant decisions
- **TDD:** Full red-green-refactor for each aggregate

## Quality Gates (Production Critical)
- Coverage: 90% overall, 100% payment flows
- Security: 0 critical/high, PCI-DSS compliance
- Accessibility: WCAG AA, keyboard checkout
- Chaos: 90% graceful degradation

## Swarm Configuration
domains:
  development: 4 concurrent (architect, coder, reviewer, browser-agent)
  quality: 4 concurrent (full test suite)
  security: 2 concurrent (PCI focus)
  learning: 2 concurrent (SONA, ReasoningBank)
  coordination: 1 (unified-coordinator)
max_agents: 13
topology: hierarchical-mesh

## Execute
Phase 1: DDD modeling with architect agent
Phase 2: TDD implementation with coder + test-generator
Phase 3: Security scan with sast-scanner + dast-scanner
Phase 4: Quality validation with coverage-analyzer + chaos-engineer
Phase 5: Pattern capture with sona-optimizer

Deliver production-ready e-commerce with full quality assurance.
PROMPT
}

generate_api_prompt() {
cat <<'PROMPT'
# Build with Quality - Claude Flow V3 Swarm

## Skill Activation
build-with-quality v1.0.0 (111+ agents, hierarchical-mesh)

## Project Context
- **Name:** API-V2-Swarm
- **Type:** api
- **Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Description:** RESTful API with authentication and CRUD operations

## Task
Build a production-ready REST API with users, resources, and authentication

## Acceptance Criteria
- [ ] User registration and login (JWT)
- [ ] CRUD operations for resources
- [ ] Role-based access control
- [ ] Rate limiting
- [ ] OpenAPI documentation

## Methodology
- **DDD:** User aggregate, Resource aggregate
- **ADR:** Document auth strategy, database choice
- **TDD:** Test each endpoint before implementation

## Quality Gates
- Coverage: 85% overall, 95% auth flows
- Security: 0 critical/high (OWASP)
- Contracts: OpenAPI validation

## Execute with swarm parallelism.
PROMPT
}

generate_custom_prompt() {
cat <<'PROMPT'
# Build with Quality - Claude Flow V3 Swarm

## Skill Activation
build-with-quality v1.0.0 (111+ agents, hierarchical-mesh)

## Project Context
- **Name:** [YOUR_PROJECT_NAME]
- **Type:** [web-app | api | library | cli]
- **Stack:** [YOUR_TECH_STACK]
- **Description:** [YOUR_DESCRIPTION]

## Task
[DESCRIBE WHAT TO BUILD]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Methodology
- **DDD:** [Define bounded contexts and aggregates]
- **ADR:** [List decisions to document]
- **TDD:** Red-green-refactor for all features

## Quality Gates
- Coverage: 85% minimum
- Security: 0 critical/high
- Accessibility: WCAG AA

## Execute with swarm parallelism.
PROMPT
}

PROMPT_FILE="$PROJECT_DIR/SWARM-PROMPT.md"

case $TEMPLATE in
    ecommerce)
        generate_ecommerce_prompt > "$PROMPT_FILE"
        echo -e "  ${GREEN}✓${NC} Generated e-commerce prompt"
        ;;
    api)
        generate_api_prompt > "$PROMPT_FILE"
        echo -e "  ${GREEN}✓${NC} Generated API prompt"
        ;;
    custom)
        generate_custom_prompt > "$PROMPT_FILE"
        echo -e "  ${GREEN}✓${NC} Generated custom template prompt"
        echo -e "  ${YELLOW}⚠${NC} Edit $PROMPT_FILE before running swarm"
        ;;
    *)
        echo -e "  ${RED}Unknown template: $TEMPLATE${NC}"
        echo -e "  ${YELLOW}Available: ecommerce, api, custom${NC}"
        exit 1
        ;;
esac

echo ""

# ============================================================================
# Step 7: Create Run Script
# ============================================================================
echo -e "${YELLOW}Step 7: Creating project run script...${NC}"

cat > "$PROJECT_DIR/run-swarm.sh" <<'RUNSCRIPT'
#!/bin/bash
# Run the swarm build for this project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/SWARM-PROMPT.md"

echo "Starting swarm build..."
echo "Project: $(basename "$SCRIPT_DIR")"
echo "Prompt: $PROMPT_FILE"
echo ""

# Option 1: Use claude-flow directly
if command -v npx &> /dev/null; then
    echo "Running with Claude Flow V3..."
    npx claude-flow swarm \
        --topology hierarchical-mesh \
        --max-agents 13 \
        --prompt "$(cat "$PROMPT_FILE")"
fi

# Option 2: Use Claude Code CLI with MCP
# Uncomment below if you prefer Claude Code CLI:
# claude --mcp-server aqe -p "$(cat "$PROMPT_FILE")"
RUNSCRIPT

chmod +x "$PROJECT_DIR/run-swarm.sh"
echo -e "  ${GREEN}✓${NC} Created run-swarm.sh"

echo ""

# ============================================================================
# Step 8: Summary
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Setup Complete!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Project created at: ${BLUE}$PROJECT_DIR${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Review the prompt:"
echo -e "     ${BLUE}cat $PROMPT_FILE${NC}"
echo ""
echo "  2. (Optional) Edit the prompt if using 'custom' template:"
echo -e "     ${BLUE}nano $PROMPT_FILE${NC}"
echo ""
echo "  3. Run the swarm build:"
echo -e "     ${BLUE}cd $PROJECT_DIR && ./run-swarm.sh${NC}"
echo ""
echo "  Or run directly with Claude Code CLI:"
echo -e "     ${BLUE}claude --mcp-server aqe${NC}"
echo "     Then paste the prompt from SWARM-PROMPT.md"
echo ""
echo -e "${YELLOW}Available templates:${NC}"
echo "  - ecommerce : Full e-commerce platform (Next.js + Stripe)"
echo "  - api       : REST API with auth (Express + JWT)"
echo "  - custom    : Empty template to customize"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - Skill README: $SKILL_DIR/README.md"
echo "  - Full Prompt:  $SKILL_DIR/BUILD-WITH-QUALITY-PROMPT.md"
echo "  - Examples:     $SKILL_DIR/USAGE-EXAMPLES.md"
echo ""
