# 铿锵玫瑰 VS 蓝鲨

移动端优先的 11 人制像素足球游戏，只有两支球队：中国女足（4-4-2 低位防反）与佛得角男足（4-3-3 高压快攻）。球场为 1280×720 加长画布（草皮约 1180×640），单局实时 5 分钟，映射为完整 90 分钟比赛时钟（上半场 0–45' / 下半场 45–90'，含短暂中场休息），完整包含开球、移动、传球、射门、抢断、守门、进球、正式死球规则（边线球、门球、角球、任意球、点球、越位）、边裁跑动、比赛时钟、暂停、重开、战术 AI 与胜负结算。

## 启动

要求 Node.js 20+（或 Bun）。

```bash
npm install   # 或 bun install
npm run dev   # 或 bun run dev（与 npm start 相同）
```

浏览器打开 Vite 输出的本机地址（通常是 `http://localhost:5173`）。

> **不要直接双击 `index.html`。** 项目使用 ES 模块与 Vite 开发服务器，用 `file://` 打开会空白或报错。本地游玩请始终通过 `npm run dev`；生产预览可先 `npm run build` 再 `npm run preview`，或打开 `dist/index.html` 经任意静态服务器托管。

生产构建与测试：

```bash
npm test
npm run build
npm run preview   # 预览 dist/ 生产构建
```

## 玩法

- **半自动（默认）**：队友自动跑位和防守；持球队员接受摇杆微调，传球与射门辅助瞄准。
- **手动**：虚拟摇杆完全控制黄色框选球员；“切换”选择队友；动作沿当前输入方向执行。
- **全自动**：双方均由 AI 驱动，自动采用各自的真实常用阵型与技战术（中国女足 4-4-2 低位防反、佛得角 4-3-3 高压快攻），可纯观看比赛；移动/传球/射门无效，仍可暂停、重开与切模式。半自动/手动下 AI 队友同样按阵型与战术跑位。
- **触屏**：左侧摇杆移动；右侧「传/射」短按传球（无球时抢断）、连按或长按射门；「射门」仍可直接射门。
- **键盘**：WASD/方向键移动；**空格**短按传球/抢断，350ms 内连按或按住约 300ms 蓄力射门；J 传球、K 射门；L 切换，P 暂停，M 切模式（半自动→手动→全自动循环）。
- **手表/体感**：点击“⌚ 体感”并授权；设备前后/左右倾斜移动，快速摇动传球或抢断。小于 280px 或低于 300px 的界面会隐藏摇杆和工具栏，保留体感与动作键。

## 比赛规则（已实现）

- **开球 / 进球后开球**：中场开球与进球后由失球方开球；中场休息交换场地后，由上半场未开球队开球。
- **边线球（界外球）**：球完全越过边线，由未触球方在出界点掷界外球；HUD 显示「边线球」。
- **门球**：进攻方最后触球且球越过底线（非进球），守方在球门区开球门球。
- **角球**：防守方最后触球越过底线，进攻方在对应角旗区开角球；进攻球员前点、防守球员盯防。
- **任意球**：背后铲球、撞停静止持球人、门将在禁区外抱球等犯规，判给对方任意球；禁区前沿有防守人墙。
- **点球**：守方在禁区内对进攻方犯规（禁区内的背后铲球、撞停持球人等），判给进攻方点球；球放在点球点，守门员门线站位，其余球员在禁区外；中国女足获点球时半自动/手动由玩家主罚，否则 AI 主罚；打进判进球，射偏或射高出底线判门球。
- **越位**：向前传球瞬间，接球人比倒数第二名对方球员（通常为最后一名后卫）更靠近对方球门、且比球更靠前时，判越位；边裁举旗，HUD 显示「越位」，守方在越位地点间接任意球；与最后一名后卫平行的直塞球不吹，避免过度严苛。
- **边裁**：两名女性边裁沿左右边线跟随足球 Y 坐标移动（带滞后），界外球/死球/越位时举旗。
- **半自动 / 手动**：中国女足获得定位球或点球时，由玩家控制主罚；其余情况 AI 开球。全自动模式下全部由 AI 主罚。

## Android（Capacitor）

仓库包含原生 Android 工程。修改前端后同步并构建：

```bash
npm run cap:sync
cd android
./gradlew assembleDebug
```

调试 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。也可执行 `npm run android` 在 Android Studio 中打开。方向与运动传感器使用 WebView 标准事件，不需要额外 Android 危险权限；具体可用性取决于设备硬件和 WebView。

## 阵容、阵型、参数与真实性边界

`src/data/teams.js` 保存两队阵容、位置、角色、阵型槽位、战术画像、游戏数值和像素视觉标签。场上使用各队名单前 11 人（首发），文件另含轮换球员，便于后续加入换人。

阵型与首发依据：

- 中国女足 4-4-2 首发：2023 女足世界杯小组赛对英格兰（2023-08-01）的 FIFA 赛后报告与 BBC 阵容页（朱钰；李梦雯、王珊珊、姚伟、陈巧珠；张琳艳、杨莉娜、姚凌薇、吴澄舒；王霜、娄佳惠）  
  https://www.fifatrainingcentre.com/media/native/tournaments/womens-world-cup/2023/report_131895.pdf  
  https://www.bbc.com/sport/football/66369572
- 中国女足战术风格（中低位 4-4-2 防守 + 边路速度反击）：Total Football Analysis 2023 世界杯战术分析  
  https://totalfootballanalysis.com/article/fifa-womens-world-cup-2023-china-pr-tactical-analysis-tactics
- 佛得角 4-3-3 首发：2024 非洲杯 1/4 决赛对南非（2024-02-03）的 BBC 直播页与 Sky Sports 阵容（Vozinha；S. Moreira、L. Costa、R. Lopes、João Paulo；K. Pina、K. Rocha、J. Monteiro；G. Rodrigues、R. Mendes、J. Cabral），Bubista 常用 4-3-3 另见 afrik-foot 赛前分析  
  https://www.bbc.com/sport/football/live/cp07ypde098t  
  https://www.skysports.com/football/cape-verde-vs-south-africa/teams/500693

其它公开事实来源：

- 中国女足姓名、号码、位置、身高基础：FIFA《FIFA Women’s World Cup Australia & New Zealand 2023 — Squad Lists》  
  https://fdp.fifa.org/assetspublic/ce93/pdf/SquadLists-English.pdf
- 中国女足名单交叉核验：新华社，2023-07-05  
  https://english.news.cn/20230705/0389a64249b94617abb4d35c6d86e71f/c.html
- 佛得角男足名单与位置：CAF，非洲杯 2023 公布名单  
  https://www.cafonline.com/afcon2025/news/the-27-blue-sharks-selected-by-cape-verde-coach-bubista/
- 佛得角名单交叉核验：Reuters，2023-12-29  
  https://www.reuters.com/sports/soccer/cape-verde-name-veterans-mendes-vozinha-african-cup-nations-squad-2023-12-29/

**免责声明：** 速度、体能、控球、力量、防守均为 1–10 的玩法平衡估值，只依据公开位置、常见角色和广义比赛风格形成，不是官方测量、球探评分或当前状态，也不代表男女球员之间的科学比较。战术画像（逼抢强度、防线高度、宽度、直接性）是对公开战术描述的游戏化编码，不是教练组数据。发型、肤色、身形是低分辨率识别符号，不是肖像级还原。阵容取自明确日期的赛事名单，不声称是 2026 年最新首发；真实名单、号码和状态会变化。

裁判组为女性视觉角色：一名主裁与两名边裁，均以黑色裁判服、马尾像素造型呈现；边裁沿边线跑动并可在死球时举旗。

## 架构

- `src/game.js`：无 DOM 的确定性比赛状态、物理、正式死球规则（边线球/门球/角球/任意球/点球/越位）、犯规判定、定位球流程、战术 AI（阵型跑位、无球移动、逼抢/联防/反抢）与边裁状态，便于单元测试
- `src/render.js`：原生 Canvas 像素球场、球员、女性裁判组绘制
- `src/input.js`：触摸摇杆、键盘、方向/运动传感器
- `src/data/teams.js`：阵容、阵型槽位、战术画像、游戏参数、来源及免责声明
- `src/main.js`：游戏循环与 UI 连接
- `test/game.test.js`：生命周期、得分、动作、阵型与战术、阵容参数测试
- `scripts/simulate.js`：无头全自动比赛模拟器（`node scripts/simulate.js 20`），用于平衡性调参
- `android/`：Capacitor Android 原生壳

## 已知限制

- 这是 11 人制街机化玩法：有阵型、无球跑位、球队战术画像与正式死球规则，但不模拟换人、黄牌/红牌或 VAR。
- AI 使用轻量本地规则，不是历史比赛模型；守门和碰撞刻意偏街机。
- iOS 13+ 首次体感授权必须由按钮点击触发；桌面或无传感器设备会保留触屏/键盘控制。
- 像素人物仅抓取队服配色、发型和身形轮廓等代表性特征，不保证个人肖像相似度。
