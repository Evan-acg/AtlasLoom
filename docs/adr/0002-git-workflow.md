# ADR 0002: Adopt a Two-Branch Git Workflow

## Status

Accepted

## Context

The repository has a `dev` branch with ongoing integration work and a `master` branch used as the GitHub default branch. It previously had commit message validation but no enforced branch, pull request, verification, release, or rollback workflow.

The project is small, so requiring a second reviewer for every change would add friction. At the same time, direct changes to the stable branch and unverified changes entering either shared branch need to be prevented.

## Decision

Use `dev` as the integration branch and `master` as the stable release branch. Ordinary work starts from `dev` and enters it through pull requests. Releases use a dedicated `dev -> master` pull request. Urgent fixes start from `master`, enter it through a pull request, and then return to `dev` through a synchronization pull request.

Require pull requests and passing CI for both shared branches, forbid force pushes and branch deletion, and use squash merges. Do not require a non-author approval count in branch protection; the author may self-review and merge. High-risk changes should receive an additional review through the documented process.

## Consequences

The shared history remains reviewable and the stable branch receives only verified changes. Hotfixes have an explicit path and cannot silently diverge from ongoing development. The workflow relies on maintainers to apply additional review for high-risk changes because that policy is intentionally not enforced as a platform approval count.
