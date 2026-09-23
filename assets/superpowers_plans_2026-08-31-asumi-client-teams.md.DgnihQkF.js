import{_ as t,o,c as a,ai as r}from"./chunks/framework.lvpqbiZd.js";const p=JSON.parse('{"title":"Asumi Client Teams Implementation Plan","description":"","frontmatter":{},"headers":[],"relativePath":"superpowers/plans/2026-08-31-asumi-client-teams.md","filePath":"superpowers/plans/2026-08-31-asumi-client-teams.md"}'),n={name:"superpowers/plans/2026-08-31-asumi-client-teams.md"};function s(i,e,u,m,l,c){return o(),a("div",null,[...e[0]||(e[0]=[r(`<h1 id="asumi-client-teams-implementation-plan" tabindex="-1">Asumi Client Teams Implementation Plan <a class="header-anchor" href="#asumi-client-teams-implementation-plan" aria-label="Permalink to “Asumi Client Teams Implementation Plan”">​</a></h1><blockquote><p><strong>For agentic workers:</strong> REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (<code>- [ ]</code>) syntax for tracking.</p></blockquote><p><strong>Goal:</strong> Create three isolated Press teams for Dehati, Denroom, and Veederakht, owned and managed only by Administrator.</p><p><strong>Architecture:</strong> This is an Asumi-site data operation, not a source-code feature. A Frappe console script creates missing Team documents with the standard Team child-table membership and leaves existing matching teams unchanged. A second, read-only script verifies every created record.</p><p><strong>Tech Stack:</strong> Frappe v16, Press Team and Team Member DocTypes, Bench console.</p><h2 id="global-constraints" tabindex="-1">Global Constraints <a class="header-anchor" href="#global-constraints" aria-label="Permalink to “Global Constraints”">​</a></h2><ul><li>Target site is <code>asumi.ir</code>.</li><li>Create only <code>Dehati</code>, <code>Denroom</code>, and <code>Veederakht</code> teams.</li><li><code>Administrator</code> is owner and sole member of each target team.</li><li>Each team is enabled and marked as a free account.</li><li>Do not create or modify Site, Bench, Server, user, billing, or customer records.</li><li>Re-running the operation must not create duplicates.</li></ul><hr><h3 id="task-1-create-and-verify-the-three-press-teams" tabindex="-1">Task 1: Create and verify the three Press teams <a class="header-anchor" href="#task-1-create-and-verify-the-three-press-teams" aria-label="Permalink to “Task 1: Create and verify the three Press teams”">​</a></h3><p><strong>Files:</strong></p><ul><li>Create: none</li><li>Modify: Asumi database records for <code>Team</code> and <code>Team Member</code></li><li>Test: read-only Bench verification command</li></ul><p><strong>Interfaces:</strong></p><ul><li><p>Consumes: <code>frappe.get_doc({&quot;doctype&quot;: &quot;Team&quot;, ...}).insert(ignore_permissions=True)</code>.</p></li><li><p>Produces: three enabled Team records, each with one Team Member row for <code>Administrator</code>.</p></li><li><p>[ ] <strong>Step 1: Inspect current target-team state</strong></p></li></ul><p>Run this in the Asumi Frappe console:</p><pre><code>frappe.get_all(
    &quot;Team&quot;,
    fields=[&quot;name&quot;, &quot;team_title&quot;, &quot;user&quot;, &quot;enabled&quot;],
    filters={&quot;team_title&quot;: [&quot;in&quot;, [&quot;Dehati&quot;, &quot;Denroom&quot;, &quot;Veederakht&quot;]]},
)
</code></pre><p>Expected: zero to three target teams and no duplicate titles.</p><ul><li>[ ] <strong>Step 2: Create only missing teams</strong></li></ul><p>Run this in the same console:</p><pre><code>for title in (&quot;Dehati&quot;, &quot;Denroom&quot;, &quot;Veederakht&quot;):
    if not frappe.db.exists(&quot;Team&quot;, {&quot;team_title&quot;: title}):
        frappe.get_doc({
            &quot;doctype&quot;: &quot;Team&quot;,
            &quot;team_title&quot;: title,
            &quot;user&quot;: &quot;Administrator&quot;,
            &quot;enabled&quot;: 1,
            &quot;free_account&quot;: 1,
            &quot;team_members&quot;: [{&quot;user&quot;: &quot;Administrator&quot;}],
        }).insert(ignore_permissions=True)
frappe.db.commit()
</code></pre><p>Expected: exactly one new Team record for every previously missing title.</p><ul><li>[ ] <strong>Step 3: Verify ownership and isolation</strong></li></ul><p>Run this in the same console:</p><pre><code>target_teams = frappe.get_all(
    &quot;Team&quot;,
    fields=[&quot;name&quot;, &quot;team_title&quot;, &quot;user&quot;, &quot;enabled&quot;, &quot;free_account&quot;],
    filters={&quot;team_title&quot;: [&quot;in&quot;, [&quot;Dehati&quot;, &quot;Denroom&quot;, &quot;Veederakht&quot;]]},
    order_by=&quot;team_title asc&quot;,
)
assert len(target_teams) == 3, target_teams
for team in target_teams:
    members = frappe.get_all(
        &quot;Team Member&quot;, fields=[&quot;user&quot;], filters={&quot;parent&quot;: team.name}, order_by=&quot;idx asc&quot;
    )
    assert team.user == &quot;Administrator&quot;, team
    assert team.enabled == 1 and team.free_account == 1, team
    assert members == [{&quot;user&quot;: &quot;Administrator&quot;}], (team, members)
print([(team.team_title, team.name) for team in target_teams])
</code></pre><p>Expected: the three names and Press IDs print without assertion errors.</p><ul><li><p>[ ] <strong>Step 4: Commit this plan only</strong></p><p>git add docs/superpowers/plans/2026-08-31-asumi-client-teams.md git commit -m &quot;docs: plan Asumi client team creation&quot;</p></li></ul><p>Expected: source control contains the execution plan; database records remain runtime state.</p>`,26)])])}const q=t(n,[["render",s]]);export{p as __pageData,q as default};
