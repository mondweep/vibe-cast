#!/usr/bin/env python3
"""Generate evaluation stubs from an inventory file.

Creates one evaluations/<marketplace>/<name>.md per plugin, using
evaluations/TEMPLATE.md as the shape. Existing files are left alone unless
--force is passed, so this is safe to re-run after adding plugins to an
inventory — it will only fill in the gaps.

    python3 scripts/bootstrap_evals.py inventories/ruflo.json
    python3 scripts/bootstrap_evals.py inventories/ruflo.json --force

The output directory defaults to the inventory's stem, so ruflo.json populates
evaluations/ruflo/.

Standard library only.
"""

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EVAL_DIR = ROOT / "evaluations"
TEMPLATE = EVAL_DIR / "TEMPLATE.md"


def render(plugin, template):
    requires = plugin.get("requires") or []
    if requires:
        deps = (
            "Requires "
            + ", ".join(f"**{r}**" for r in requires)
            + ". Confirm each is authorised before testing; if any is missing, set "
            "`status: blocked` and record which one."
        )
    else:
        deps = "None declared. Works out of the box."

    surface = plugin.get("surface")
    if surface:
        deps += (
            "\n\nMeasured surface area: "
            f"{surface['commands']} commands, {surface['agents']} agents, "
            f"{surface['skills']} skills"
            + (f", MCP servers: {', '.join(surface['mcp_servers'])}"
               if surface["mcp_servers"] else ", no MCP server")
            + (f", hooks on {', '.join(surface['hook_events'])}"
               if surface["hook_events"] else ", no hooks")
            + f" (v{surface['version']})."
        )

    text = template
    text = text.replace("plugin: <name>", f"plugin: {plugin['name']}")
    text = text.replace("plugin_id: <plugin_...>", f"plugin_id: {plugin['id']}")
    text = text.replace(
        "category: <from the inventory>", f"category: {plugin['category']}"
    )
    text = text.replace("# <name>", f"# {plugin['name']}")
    text = text.replace(
        "> <one-line description from the catalogue>", f"> {plugin['description']}"
    )
    text = text.replace(
        '<What must be authorised or installed before this can be tested. "None" is a valid answer.\n'
        "If a dependency is missing, set `status: blocked` and stop here.>",
        deps,
    )
    return text


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("inventory", type=pathlib.Path, help="path to an inventory JSON file")
    ap.add_argument("--out", type=pathlib.Path,
                    help="output directory (default: evaluations/<inventory stem>)")
    ap.add_argument("--force", action="store_true", help="overwrite existing stubs")
    args = ap.parse_args()

    if not TEMPLATE.exists():
        sys.exit(f"missing template: {TEMPLATE}")
    if not args.inventory.exists():
        sys.exit(f"no such inventory: {args.inventory}")
    template = TEMPLATE.read_text()
    inventory = json.loads(args.inventory.read_text())
    out_dir = args.out or EVAL_DIR / args.inventory.stem

    out_dir.mkdir(parents=True, exist_ok=True)
    created = skipped = 0
    for plugin in inventory["plugins"]:
        path = out_dir / f"{plugin['name']}.md"
        if path.exists() and not args.force:
            skipped += 1
            continue
        path.write_text(render(plugin, template))
        created += 1

    print(f"created {created}, left alone {skipped}")


if __name__ == "__main__":
    main()
