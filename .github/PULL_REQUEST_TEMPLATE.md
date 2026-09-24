## 关联 Issue

Closes #

## 变更摘要

<!-- 说明变更内容和原因。 -->

## 验证

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] 已完成必要的人工验证

## 风险与回滚

<!-- 说明潜在风险、回滚方式和后续补修 Issue（如有）。 -->

## Hotfix

- [ ] 这不是 hotfix
- [ ] 这是 hotfix，已从 `master` 派生
- [ ] Hotfix 合并到 `master` 后，将创建 `master -> dev` 同步 PR

## 审查

- [ ] 已评估是否需要额外审查者
- [ ] 架构、数据模型或破坏性变更已邀请额外审查者（如适用）

## 分支生命周期

- [ ] 本次修改未直接发生在 `dev` 或 `master`，工作分支从正确的基准分支派生
- [ ] PR 合并后将切回目标分支并删除本地工作分支

合并完成后执行：

```bash
git fetch origin --prune
git switch <base-branch>
git pull --ff-only
git branch -d <work-branch>
```
