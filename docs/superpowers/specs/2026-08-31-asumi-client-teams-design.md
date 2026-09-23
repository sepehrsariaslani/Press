# Asumi client teams

## Objective

Represent the three existing managed customer sites as separate Press teams on
`asumi.ir`, while keeping the Administrator account as the only member and
manager for now.

## Scope

Create exactly three enabled, free teams:

| Team title | Customer site |
| --- | --- |
| Dehati | dehati.ir |
| Denroom | denroom.ir |
| Veederakht | veederakht.ir |

Each team will have `Administrator` as its owner and sole team member. No
customer user, billing information, server, bench, or site record will be
created or changed in this step.

## Safety and verification

Creation is idempotent: an existing team with the same title is retained
rather than duplicated. After creation, verify that exactly the three target
teams exist, are enabled, and have only `Administrator` as a member.

## Follow-up

The existing Frappe sites will be imported and assigned to their respective
teams only after the current server and bench have been formally registered in
Press. That separate step must not fabricate site records.
