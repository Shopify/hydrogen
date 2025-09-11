#!/bin/bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧪 Recipe Validation Script${NC}"
echo "=============================="
echo ""

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --recipe <name>     Validate a specific recipe"
    echo "  --all               Validate all recipes (default)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Validate all recipes"
    echo "  $0 --recipe bundles # Validate only the bundles recipe"
    echo "  $0 --all            # Explicitly validate all recipes"
}

RECIPE=""
VALIDATE_ALL=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --recipe)
            RECIPE="$2"
            VALIDATE_ALL=false
            shift 2
            ;;
        --all)
            VALIDATE_ALL=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
COOKBOOK_DIR="$ROOT_DIR/cookbook"

cd "$ROOT_DIR"

echo -e "${YELLOW}📦 Building packages...${NC}"
npm run build:pkg

echo -e "${YELLOW}📚 Setting up cookbook...${NC}"
cd "$COOKBOOK_DIR"
npm ci

if [ "$VALIDATE_ALL" = true ]; then
    echo -e "${YELLOW}🔍 Validating all recipes...${NC}"
    echo ""
    
    RECIPES_DIR="$COOKBOOK_DIR/recipes"
    if [ -d "$RECIPES_DIR" ]; then
        RECIPE_COUNT=$(ls -d "$RECIPES_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
        echo "Found $RECIPE_COUNT recipe(s) to validate"
        echo "--------------------------------"
        
        SUCCESS_COUNT=0
        FAILED_COUNT=0
        FAILED_RECIPES=""
        
        for recipe_dir in "$RECIPES_DIR"/*/; do
            if [ -d "$recipe_dir" ]; then
                recipe_name=$(basename "$recipe_dir")
                echo -e "\n${YELLOW}Testing recipe: $recipe_name${NC}"
                
                if npm run cookbook -- validate --recipe "$recipe_name"; then
                    echo -e "${GREEN}✅ $recipe_name: PASSED${NC}"
                    ((SUCCESS_COUNT++))
                else
                    echo -e "${RED}❌ $recipe_name: FAILED${NC}"
                    ((FAILED_COUNT++))
                    FAILED_RECIPES="$FAILED_RECIPES $recipe_name"
                fi
            fi
        done
        
        echo ""
        echo "================================"
        echo -e "${YELLOW}Validation Summary${NC}"
        echo "================================"
        echo -e "${GREEN}✅ Passed: $SUCCESS_COUNT${NC}"
        echo -e "${RED}❌ Failed: $FAILED_COUNT${NC}"
        
        if [ $FAILED_COUNT -gt 0 ]; then
            echo ""
            echo -e "${RED}Failed recipes:${NC}"
            for recipe in $FAILED_RECIPES; do
                echo "  - $recipe"
            done
            exit 1
        else
            echo ""
            echo -e "${GREEN}🎉 All recipes validated successfully!${NC}"
        fi
    else
        echo -e "${RED}No recipes directory found at $RECIPES_DIR${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}🔍 Validating recipe: $RECIPE${NC}"
    echo ""
    
    if npm run cookbook -- validate --recipe "$RECIPE"; then
        echo -e "${GREEN}✅ Recipe '$RECIPE' validated successfully!${NC}"
    else
        echo -e "${RED}❌ Recipe '$RECIPE' validation failed${NC}"
        exit 1
    fi
fi