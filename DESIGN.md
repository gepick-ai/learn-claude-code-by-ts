# Gepick 设计说明

## 工程设计

整个工程基于Vibecoding实现，在工程中使用`specs`作为工程设计把控和Bugfix的真相来源。从整个工程的交付流水线，到基于工程实现的coding业务都有各自的`specs`文件夹。其中`design`用于存放工程或者业务相关的设计版本文件，`bugfix`用于存放修复工程或者业务bug的bugfix记录文件。

工程层面主要就是交付流水线的设计，放在`gepick/specs/delivery/design`。它用来搭建整个项目工程的交付流水线的搭建，包括“整个monorepo项目要如何进行包管理？”、“项目开发完成如何进行CI？”、“项目selfhost的产物来源及环境配置如何进行管理？”等。并额外针对交付流水线做了一个交付保障的Checklist文件`specs/delivery/checklist.md`，用三条路径来测试项目服务host正常。工程流水线只保证工程软件Devops质量，不保证业务运行问题，这个是业务设计的范围。

针对`bugfix`我还实现了一个bug记录skill(`.cursor/skills/bugfix-rca-record`)用来在与AI协作完成bug修复后，让它能够固定按照一套记录模板来将bug修复的过程、思路和解决方案记录下来。

## 业务设计

Gepick的业务设计也是使用`specs`作为业务设计的把控和bug修复的真相来源，其中也是分`specs/bugfix`和`specs/design`。业务设计到业务实现的一个流程是：
- 按照我设计的业务架构，找到当前需要实现的业务，切入`cursor`的plan模式，跟AI讨论这个业务块当前版本的设计目标、实现效果（贴图、描述需求）以及覆盖范围。版本设计的第一要义就是“跑通最小业务闭环，通过多次版本设计更新迭代”。**这一步的核心是讨论技术需求**。
- 比如code业务的v1版本的设计目标就是“实现agent驱动页面生成和渲染“，那么针对“实现agent驱动页面生成和渲染“就需要进一步拆分能力。”agent驱动部分“属于server端能力，”页面渲染部分“属于client端能力，那么我会在`packages/app`和`packages/client`各自进一步创建`specs/design/code/v1.md`，继续基于这个上下文来讨论server端要如何实现以及client端要如何实现。并根据AI给出的方案审核和微调，最终让AI落地`specs/design/code/v1.md`到各自端中。**这一步的核心是讨论技术方案**。
- 让agent基于各自端的`specs/design/code/v1.md`生成执行方案，我继续审核和调整。那么如果有执行方案对不上技术方案的地方，我会进一步与AI进行讨论，如果有调整，那么应该让AI先调整技术方案，然后再重新生成执行方案。**这一步的核心是讨论执行方案**
- 确认AI讨论的执行方案无误后，让AI开始落地代码实现，将v1版本的业务实现出来，然后我进行功能验证以及代码review。
    - 此时如果出现bug，切入`cursor`的debug模式，将bug描述以及截图交给AI并将可能排查链路方向告知AI辅助进行排查。AI修复bug后进行回归验证，并让AI调用bug记录skill记下当前bugfix的整个过程以便后续追溯，或者遇到相关bug可以让AI快速浏览`specs/bugfix`找思路而不是让AI读代码库，加速bug排查。
- 当前v1版本实现没问题后，按照技术需求找出推进方向，比如code业务v1版本只有一个html，但是在跑通流程以后，后续版本我们就演进到了client工程。基于此继续出`v2`、`v3`版本...

## 当前完成度

- [x] 已建立工程与业务双层 `specs` 体系（`design` / `bugfix`）作为设计与修复真相来源。
- [x] 已完成交付流水线设计主线（monorepo 包管理、构建与 selfhost 路径）并沉淀 `specs/delivery/checklist.md`。
- [x] 已落地 bugfix 记录 skill（`.cursor/skills/bugfix-rca-record`）用于固定模板归档修复过程。
- [x] 已形成业务从技术需求讨论、技术方案输出、执行方案审核到代码落地与回归验证的协作流程。
- [x] `agent` 业务：版本化设计仍在持续迭代（`v2`/`v3`/...）。
- [x] `session` 业务：版本化设计仍在持续迭代（`v2`/`v3`/...）。
- [x] `code` 业务：版本化设计仍在持续迭代（`v2`/`v3`/...）。

## 优先扩展

- [ ] agent业务：完善agent的错误处理
- [ ] agent业务：新增agent todo write让agent处理code业务更稳
- [ ] code业务：代码导出
- [ ] code业务：仓储整理和环境端扩展
- [ ] code业务：文件树展示