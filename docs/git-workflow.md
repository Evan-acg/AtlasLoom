# Git 工作流

## 分支职责

仓库长期保留两个主分支：

- `dev`：日常开发集成线。
- `master`：稳定发布线，也是 GitHub 默认分支。

禁止直接在 `dev` 或 `master` 上开发、修改代码或提交代码。开始任何开发或修改前，必须先更新对应基准分支，再从它派生工作分支：

- 普通功能、缺陷修复、文档和维护：从 `dev` 派生。
- 已发布内容的紧急修复：从 `master` 派生。

普通变更必须从 `dev` 派生：

- `feature/<issue>-<short-name>`：功能
- `fix/<issue>-<short-name>`：缺陷修复
- `docs/<issue>-<short-name>`：文档
- `chore/<issue>-<short-name>`：维护
- `revert/<issue>-<short-name>`：回滚

紧急修复从 `master` 派生：

- `hotfix/<issue>-<short-name>`：已发布内容的紧急修复

上述工作分支在 PR 合并后删除。`dev` 和 `master` 不得删除、改写历史或 force push。

远端工作分支由 GitHub 在 PR 合并后自动删除。本地工作分支不会被远程自动删除，开发者必须在 PR 合并后切回基准分支并删除本地工作分支：

```bash
gh pr view <pr-number> --json state,mergedAt,headRefOid
git fetch origin --prune
git switch <base-branch>
git pull --ff-only
git rev-parse <work-branch>
git branch -D <work-branch>
```

其中 `<pr-number>` 是本次 PR 编号；只有输出的 `state` 为 `MERGED`，且 `headRefOid` 与 `git rev-parse <work-branch>` 输出的 SHA 完全一致时才继续清理。`<base-branch>` 是本次 PR 的目标分支，`<work-branch>` 是已合并的本地工作分支。仓库使用 Squash merge，工作分支提交通常不会成为目标分支的祖先，因此必须先完成上述核对，再使用 `-D` 删除。PR 未合并或本地工作分支 SHA 不一致时，禁止删除该分支。

## Issue 与 PR

除纯格式化外，所有变更必须先有 GitHub Issue。分支名称必须包含 Issue 编号，PR 必须使用 `Closes #123` 或 `Refs #123` 关联 Issue。

所有进入 `dev` 或 `master` 的变更都必须通过 PR，不允许直接推送。PR 必须说明：

- 变更摘要和关联 Issue
- 执行过的验证命令与结果
- 风险、回滚方式和人工验证结果（如适用）
- 是否为 hotfix
- hotfix 是否以及如何回流到 `dev`

作者可以自审并作为唯一批准者合并。架构、数据模型、破坏性变更和其他高风险变更应增加至少一名其他审查者；这是流程要求，不作为 GitHub 的强制审批数量。

## Issue 标签生命周期

`ready-for-agent` 只表示 Issue 已准备好、尚未开始实施。领取 Issue 后立即移除该标签，避免它继续出现在可领取工作列表中：

```bash
gh issue edit <issue-number> --remove-label ready-for-agent
```

实现 PR 合并后，关闭 Issue 前必须再次确认标签已经移除；GitHub 关闭 Issue 不会自动清理标签。关闭操作完成后复核状态和标签：

```bash
gh issue close <issue-number>
gh issue view <issue-number> --json state,labels,url
```

复核的完成条件是 `state` 为 `CLOSED`，且 `labels` 不再包含 `ready-for-agent`。发现已关闭但仍带该标签的历史 Issue 时，使用同一 `gh issue edit ... --remove-label` 命令清理，并在 Issue 留下清理说明。

## 合并规则

- 普通工作分支通过 PR 合并到 `dev`。
- 发布通过单独的 `dev -> master` 发布 PR。
- PR 使用 Squash merge，避免把工作分支历史带入主线。
- PR 合并后自动删除远端工作分支，并按本节步骤删除本地工作分支。
- 合并前必须通过 `lint`、`typecheck`、`test` 和 `build`。
- CI 失败时不得绕过合并。只有基础设施故障或已确认的测试环境问题可以由维护者临时豁免，并在 PR 中记录原因、影响和后续补修 Issue。

## Hotfix 与回流

Hotfix 从 `master` 派生，仍然必须关联 Issue、通过 PR、完成审查并通过全部自动检查。Hotfix 合并到 `master` 后，必须创建 `master -> dev` 同步 PR，确保修复回到开发集成线。

## 发布与版本

发布 PR 合并到 `master` 后，由维护者根据变更影响决定 SemVer：

- 破坏性变更递增 Major
- 向后兼容的功能递增 Minor
- 向后兼容的修复递增 Patch

正式发布使用 `v<major>.<minor>.<patch>` tag 和 GitHub Release。发布必须基于已经合并且检查通过的 `master` 提交；tag 创建后不得移动或覆盖。普通合并不创建 tag。

## 回滚与例外

发布后的回滚必须从 `master` 创建 `revert/<issue>-<short-name>` 分支，通过 PR 合并。紧急问题也可以按 hotfix 流程修复，不得直接修改或改写 `master`。

依赖升级、GitHub Actions、分支保护规则和其他仓库治理变更同样必须通过 PR；tag 和 Release 必须引用对应的发布 PR。

## 强制检查

`.github/workflows/ci.yml` 在指向或推送到 `dev`、`master` 时执行：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

`dev` 和 `master` 的 GitHub 分支保护要求 `quality` 检查通过、禁止强推和删除，并要求通过 PR 进入。由于项目允许作者自审，分支保护不设非作者审批数量；高风险变更的额外复核由 PR 流程负责。
