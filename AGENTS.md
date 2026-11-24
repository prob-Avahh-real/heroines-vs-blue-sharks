# heroines-vs-blue-sharks

铿锵玫瑰 VS 蓝鲨 移动端优先的 11 人制像素足球游戏，只有两支球队：中国女足（4-4-2 低位防反）与佛得角男足（4-3-3 高压快攻）。球场为 1280×720 加长画布（草皮约 1180×640），单局实时 5 分钟，映射为完整 90 分钟比赛时钟（上半场 0–45' / 下半场 45–90'，含短暂中场休息），完整包含开球、移动、传球、射门、抢断、守门、进球、正式死球规则（边线球、门球、角球、任意球、点球、越位）、边裁跑动、比赛时钟、暂停、重开、战术 AI 与胜负结算。

## 用途与 Target 判定

女足 vs 蓝鲨像素足球，触屏主操作

- 移动端：需要
- 智能硬件：可选（可搁置）

## 目标平台

| 平台 | 方式 | 产出 |
|------|------|------|
| 🤖 Android | Capacitor → Gradle | APK |
| 🍎 iOS | Capacitor（若已加 ios/） | IPA |
| 智能硬件 | 可选（非当前里程碑硬门槛） | 戒指/手杖/手表 |

## 技术栈信号

- 检测到：android, capacitor, node

## 命令

```bash
npm install
npm test
npm run build
npm run start
npm run dev
```

## 同步说明

改 Web 源码后执行 `npm run build`（或 `build:web`），再 `npx cap sync android`。打 APK 建议使用 **JDK 17**（`JAVA_HOME` 指向 openjdk@17）。

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `AGENTS.md`：通用性/扩展性、分阶段里程碑、默认双 Target（**仅当用途适合**）
- 可选 Target 未做时可搁置；不要为不适用形态硬加 APK/穿戴
- 改动保持聚焦；公共逻辑抽到 shared/`tools/`，禁止静默失败

## 验证环 / Done

```bash
npm install
npm test          # 若有
npm run build     # 或 build:web
npx cap sync android   # 若有 android/
# 可选：JAVA_HOME=…/openjdk@17 npm run apk:debug
```

**Done 示例**：测试通过（若有）+ web 产物进 `www/`/`dist/` + `cap sync` 无报错。可选穿戴未做可搁置，不纳入强制 Done。
