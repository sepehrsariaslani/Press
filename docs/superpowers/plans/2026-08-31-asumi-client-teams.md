# Asumi Client Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create three isolated Press teams for Dehati, Denroom, and Veederakht, owned and managed only by Administrator.

**Architecture:** This is an Asumi-site data operation, not a source-code feature. A Frappe console script creates missing Team documents with the standard Team child-table membership and leaves existing matching teams unchanged. A second, read-only script verifies every created record.

**Tech Stack:** Frappe v16, Press Team and Team Member DocTypes, Bench console.

## Global Constraints

- Target site is `asumi.ir`.
- Create only `Dehati`, `Denroom`, and `Veederakht` teams.
- `Administrator` is owner and sole member of each target team.
- Each team is enabled and marked as a free account.
- Do not create or modify Site, Bench, Server, user, billing, or customer records.
- Re-running the operation must not create duplicates.

---

### Task 1: Create and verify the three Press teams

**Files:**
- Create: none
- Modify: Asumi database records for `Team` and `Team Member`
- Test: read-only Bench verification command

**Interfaces:**
- Consumes: `frappe.get_doc({"doctype": "Team", ...}).insert(ignore_permissions=True)`.
- Produces: three enabled Team records, each with one Team Member row for `Administrator`.

- [ ] **Step 1: Inspect current target-team state**

Run this in the Asumi Frappe console:

    frappe.get_all(
        "Team",
        fields=["name", "team_title", "user", "enabled"],
        filters={"team_title": ["in", ["Dehati", "Denroom", "Veederakht"]]},
    )

Expected: zero to three target teams and no duplicate titles.

- [ ] **Step 2: Create only missing teams**

Run this in the same console:

    for title in ("Dehati", "Denroom", "Veederakht"):
        if not frappe.db.exists("Team", {"team_title": title}):
            frappe.get_doc({
                "doctype": "Team",
                "team_title": title,
                "user": "Administrator",
                "enabled": 1,
                "free_account": 1,
                "team_members": [{"user": "Administrator"}],
            }).insert(ignore_permissions=True)
    frappe.db.commit()

Expected: exactly one new Team record for every previously missing title.

- [ ] **Step 3: Verify ownership and isolation**

Run this in the same console:

    target_teams = frappe.get_all(
        "Team",
        fields=["name", "team_title", "user", "enabled", "free_account"],
        filters={"team_title": ["in", ["Dehati", "Denroom", "Veederakht"]]},
        order_by="team_title asc",
    )
    assert len(target_teams) == 3, target_teams
    for team in target_teams:
        members = frappe.get_all(
            "Team Member", fields=["user"], filters={"parent": team.name}, order_by="idx asc"
        )
        assert team.user == "Administrator", team
        assert team.enabled == 1 and team.free_account == 1, team
        assert members == [{"user": "Administrator"}], (team, members)
    print([(team.team_title, team.name) for team in target_teams])

Expected: the three names and Press IDs print without assertion errors.

- [ ] **Step 4: Commit this plan only**

    git add docs/superpowers/plans/2026-08-31-asumi-client-teams.md
    git commit -m "docs: plan Asumi client team creation"

Expected: source control contains the execution plan; database records remain runtime state.
