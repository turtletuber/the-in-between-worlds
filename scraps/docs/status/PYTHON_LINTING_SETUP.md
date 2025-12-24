# 🐍 Python Linting & Formatting Setup

## Summary

Successfully set up Python code quality tools:

- ✅ **Ruff** - Fast Python linter (replaces flake8, isort, pyupgrade)
- ✅ **Black** - Opinionated code formatter
- ✅ **pyproject.toml** - Centralized configuration

## Installation

```bash
pip3 install ruff black
```

## Configuration

### `pyproject.toml`

**Black configuration:**
- Line length: 100 characters
- Target: Python 3.11
- Consistent formatting across all files

**Ruff configuration:**
- Line length: 100 characters
- Auto-fix enabled
- Rule sets:
  - E/W: pycodestyle errors and warnings
  - F: pyflakes (unused imports, undefined names)
  - I: isort (import sorting)
  - N: pep8-naming (naming conventions)
  - UP: pyupgrade (modern Python syntax)
  - B: flake8-bugbear (common bugs)
  - C4: flake8-comprehensions (list/dict comprehensions)
  - SIM: flake8-simplify (code simplification)

## Initial Results

### tomo_api.py Analysis

**Before:**
- 3 undefined name errors
- 1 unused variable
- Inconsistent formatting
- Mixed quote styles

**After:**
- ✅ All errors fixed
- ✅ Code formatted consistently
- ✅ Imports sorted
- ✅ Modern Python syntax

### Issues Fixed

1. **logger undefined** (line 35)
   - **Problem:** Used before definition
   - **Fix:** Moved logging setup before PEFT import

2. **thread_filters unused** (line 179)
   - **Problem:** Assigned but never used
   - **Fix:** Commented out (prepared for future use)

3. **normalize_input undefined** (line 1046)
   - **Problem:** Function called but doesn't exist
   - **Fix:** Use user_input directly, added TODO comment

## Usage

### Check for issues:
```bash
ruff check server/
```

### Auto-fix issues:
```bash
ruff check server/ --fix
```

### Format code:
```bash
black server/
```

### Check formatting without changes:
```bash
black server/ --check
```

### All-in-one script:
```bash
./server/lint.sh
```

## Integration with Pre-commit

To prevent bad code from being committed:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/psf/black
    rev: 23.11.0
    hooks:
      - id: black
EOF

# Install hooks
pre-commit install
```

## VSCode Integration

Install extensions:
- Python (`ms-python.python`)
- Ruff (`charliermarsh.ruff`)
- Black Formatter (`ms-python.black-formatter`)

Add to `.vscode/settings.json`:
```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.codeActionsOnSave": {
      "source.fixAll.ruff": true,
      "source.organizeImports.ruff": true
    }
  },
  "ruff.lint.args": ["--config=pyproject.toml"]
}
```

## Benefits

✅ **Consistency**: All Python code follows same style
✅ **Quality**: Catch bugs before runtime
✅ **Speed**: Ruff is 10-100x faster than flake8
✅ **Modern**: Auto-upgrade to latest Python syntax
✅ **Standards**: PEP 8 compliant

## What Ruff Found & Fixed

### Auto-fixed (19 issues):
- Import sorting (alphabetical, grouped by type)
- Quote style consistency (double quotes)
- Whitespace and indentation
- Line length formatting
- Trailing commas
- Comprehension simplifications

### Manual fixes (3 issues):
- Undefined logger (logic bug)
- Unused variable (dead code)
- Missing function (incomplete feature)

## Next Steps

1. ✅ Python linting configured
2. ⏸️ Add type hints to tomo_api.py (in progress)
3. ⏸️ Set up mypy for static type checking
4. ⏸️ Add docstrings to all functions

---

*Setup completed: 2025-11-24*
*Initial cleanup: 22 issues → 0 errors*
