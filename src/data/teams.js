/**
 * Public roster facts are separated from game-balance ratings.
 * China starting XI & formation (4-4-2): FIFA Women's World Cup 2023 squad list
 * https://fdp.fifa.org/assetspublic/ce93/pdf/SquadLists-English.pdf
 * plus the FIFA post-match summary and BBC line-up (formation 4-4-2) for
 * China PR vs England, 2023-08-01:
 * https://www.fifatrainingcentre.com/media/native/tournaments/womens-world-cup/2023/report_131895.pdf
 * https://www.bbc.com/sport/football/66369572
 * China tactical profile (mid/low block, counters through quick wingers):
 * https://totalfootballanalysis.com/article/fifa-womens-world-cup-2023-china-pr-tactical-analysis-tactics
 * Cape Verde starting XI & formation (4-3-3): BBC Sport live page and
 * Sky Sports team sheet for the AFCON 2024 quarter-final vs South Africa
 * (2024-02-03), Bubista's usual system per afrik-foot:
 * https://www.bbc.com/sport/football/live/cp07ypde098t
 * https://www.skysports.com/football/cape-verde-vs-south-africa/teams/500693
 * https://www.afrik-foot.com/en-ng/ghana-vs-cape-verde-afcon-prediction-lineups-and-where-to-watch-live
 * Cape Verde squad cross-check: CAF AFCON announcement & Reuters, 2023-12-29
 * https://www.cafonline.com/afcon2025/news/the-27-blue-sharks-selected-by-cape-verde-coach-bubista/
 * https://www.reuters.com/sports/soccer/cape-verde-name-veterans-mendes-vozinha-african-cup-nations-squad-2023-12-29/
 *
 * speed/stamina/control/power/defense are 1–10 GAME DESIGN estimates.
 * They are relative archetypes inferred mainly from listed position, role and
 * broad public playing style; they are not measurements, scouting grades, or
 * claims of current form. Visual traits are simplified pixel-art identifiers.
 * tactics values (0–1) are gameplay encodings of publicly described team
 * styles, not official coaching data.
 */

const p = (number, name, position, role, ratings, visual) => ({
  number, name, position, role, ratings, visual
});
/** Formation slot: normalized pitch coords (x: 0 own goal → 1 opposing goal) + tactical role. */
const s = (x, y, role) => ({ x, y, role });

export const TEAMS = {
  china: {
    id: "china",
    short: "中国女足",
    nickname: "铿锵玫瑰",
    side: "left",
    colors: { shirt: "#d9272e", trim: "#ffd54a", shorts: "#d9272e", socks: "#f2d84b", skin: "#e8ad79" },
    formation: {
      name: "4-4-2",
      slots: [
        s(.045, .50, "GK"),
        s(.175, .18, "FB"), s(.15, .385, "CB"), s(.15, .615, "CB"), s(.175, .82, "FB"),
        s(.40, .15, "WM"), s(.33, .40, "CM"), s(.33, .60, "CM"), s(.40, .85, "WM"),
        s(.47, .40, "ST"), s(.47, .60, "ST")
      ]
    },
    // 中低位防守 + 边路速度反击（见 totalfootballanalysis 战术分析）
    tactics: { style: "低位防反", pressing: .4, line: .35, width: .55, directness: .75 },
    roster: [
      p(1, "朱钰", "GK", "门线守门员", { speed: 5, stamina: 7, control: 6, power: 7, defense: 9 }, { hair: "bun", hairColor: "#17110d", height: 1.10 }),
      p(2, "李梦雯", "DF", "边路推进", { speed: 8, stamina: 8, control: 7, power: 5, defense: 7 }, { hair: "ponytail", hairColor: "#241713", height: .99 }),
      p(11, "王珊珊", "DF", "后场领袖", { speed: 7, stamina: 8, control: 8, power: 9, defense: 8 }, { hair: "ponytail", hairColor: "#1a1110", height: 1.01 }),
      p(8, "姚伟", "DF", "多面防守", { speed: 7, stamina: 8, control: 7, power: 6, defense: 8 }, { hair: "bun", hairColor: "#241714", height: 1.0 }),
      p(15, "陈巧珠", "DF", "边路防守", { speed: 7, stamina: 8, control: 6, power: 6, defense: 8 }, { hair: "ponytail", hairColor: "#1b1210", height: 1.0 }),
      p(19, "张琳艳", "MF", "灵巧突破", { speed: 9, stamina: 8, control: 9, power: 5, defense: 5 }, { hair: "bob", hairColor: "#1a1110", height: .91 }),
      p(13, "杨莉娜", "MF", "拦截中场", { speed: 6, stamina: 9, control: 7, power: 7, defense: 8 }, { hair: "ponytail", hairColor: "#211511", height: 1.04 }),
      p(16, "姚凌薇", "MF", "后腰扫荡", { speed: 6, stamina: 8, control: 7, power: 6, defense: 7 }, { hair: "bun", hairColor: "#1b1210", height: 1.0 }),
      p(17, "吴澄舒", "MF", "边路串联", { speed: 8, stamina: 8, control: 7, power: 6, defense: 6 }, { hair: "ponytail", hairColor: "#17110d", height: .99 }),
      p(7, "王霜", "FW", "左脚组织核心", { speed: 8, stamina: 8, control: 9, power: 8, defense: 5 }, { hair: "short", hairColor: "#241714", height: .98 }),
      p(14, "娄佳惠", "FW", "支援前锋", { speed: 7, stamina: 8, control: 7, power: 7, defense: 6 }, { hair: "short", hairColor: "#1b1210", height: 1.0 }),
      p(5, "吴海燕", "DF", "防线领袖", { speed: 6, stamina: 8, control: 7, power: 7, defense: 9 }, { hair: "short", hairColor: "#15100d", height: .99 }),
      p(9, "沈梦雨", "MF", "前场串联", { speed: 7, stamina: 8, control: 8, power: 6, defense: 6 }, { hair: "ponytail", hairColor: "#1b1210", height: 1.01 }),
      p(18, "唐佳丽", "FW", "强力突击", { speed: 8, stamina: 7, control: 8, power: 8, defense: 5 }, { hair: "bob", hairColor: "#211511", height: .98 }),
      p(20, "肖裕仪", "FW", "禁区跑位", { speed: 8, stamina: 7, control: 7, power: 7, defense: 4 }, { hair: "ponytail", hairColor: "#17110d", height: .99 })
    ]
  },
  capeVerde: {
    id: "capeVerde",
    short: "佛得角男足",
    nickname: "蓝鲨",
    side: "right",
    colors: { shirt: "#1459a6", trim: "#f2f4f7", shorts: "#f5f5f2", socks: "#d62f3b", skin: "#754326" },
    formation: {
      name: "4-3-3",
      slots: [
        s(.045, .50, "GK"),
        s(.19, .16, "FB"), s(.16, .38, "CB"), s(.16, .62, "CB"), s(.19, .84, "FB"),
        s(.31, .50, "DM"), s(.40, .32, "CM"), s(.40, .68, "CM"),
        s(.46, .14, "WG"), s(.485, .50, "ST"), s(.46, .86, "WG")
      ]
    },
    // 紧凑防守 + 高强度逼抢与快速转换（Bubista 的 4-3-3）
    tactics: { style: "高压快攻", pressing: .65, line: .55, width: .85, directness: .55 },
    roster: [
      p(1, "Vozinha", "GK", "经验型门将", { speed: 4, stamina: 7, control: 6, power: 8, defense: 9 }, { hair: "bald", hairColor: "#24150e", height: 1.08 }),
      p(23, "Steven Moreira", "DF", "边路往返", { speed: 8, stamina: 8, control: 7, power: 6, defense: 8 }, { hair: "crop", hairColor: "#16100c", height: 1.02 }),
      p(5, "Logan Costa", "DF", "机动中卫", { speed: 7, stamina: 8, control: 7, power: 8, defense: 8 }, { hair: "fade", hairColor: "#120d0a", height: 1.12 }),
      p(4, "Roberto Lopes", "DF", "强硬中卫", { speed: 6, stamina: 8, control: 6, power: 8, defense: 9 }, { hair: "crop", hairColor: "#16100c", height: 1.08 }),
      p(8, "João Paulo", "DF", "左路防守", { speed: 7, stamina: 8, control: 7, power: 6, defense: 8 }, { hair: "fade", hairColor: "#130e0b", height: 1.03 }),
      p(26, "Kevin Pina", "MF", "后腰屏障", { speed: 6, stamina: 9, control: 7, power: 6, defense: 8 }, { hair: "locs", hairColor: "#14100d", height: 1.0 }),
      p(18, "Kenny Rocha", "MF", "覆盖型中场", { speed: 7, stamina: 9, control: 7, power: 7, defense: 7 }, { hair: "locs", hairColor: "#14100d", height: 1.02 }),
      p(10, "Jamiro Monteiro", "MF", "技术组织", { speed: 8, stamina: 8, control: 9, power: 7, defense: 6 }, { hair: "crop", hairColor: "#16100d", height: .99 }),
      p(11, "Garry Rodrigues", "FW", "快速边锋", { speed: 9, stamina: 7, control: 8, power: 8, defense: 4 }, { hair: "fade", hairColor: "#120d0a", height: 1.01 }),
      p(20, "Ryan Mendes", "FW", "队长型攻击手", { speed: 8, stamina: 8, control: 8, power: 8, defense: 5 }, { hair: "crop", hairColor: "#17100c", height: 1.03 }),
      p(7, "Jovane Cabral", "FW", "内切攻击", { speed: 9, stamina: 7, control: 8, power: 8, defense: 4 }, { hair: "locs", hairColor: "#14100d", height: 1.01 }),
      p(16, "Dylan Tavares", "DF", "左路防守", { speed: 8, stamina: 8, control: 7, power: 6, defense: 8 }, { hair: "fade", hairColor: "#130e0b", height: 1.04 }),
      p(6, "Patrick Andrade", "MF", "攻守平衡", { speed: 6, stamina: 8, control: 8, power: 7, defense: 7 }, { hair: "crop", hairColor: "#15100c", height: 1.0 }),
      p(21, "Bebé", "FW", "远射突击", { speed: 8, stamina: 7, control: 7, power: 9, defense: 4 }, { hair: "fade", hairColor: "#120d0a", height: 1.08 })
    ]
  }
};

/** 11 人制：场上每队 11 人，名单其余为替补席。 */
export const ACTIVE_COUNT = 11;
/** Real-time length of one match session (5 minutes). */
export const MATCH_SECONDS = 300;
/** Football match minutes displayed on the HUD (0' → 90'). */
export const MATCH_DISPLAY_MINUTES = 90;
/** Real seconds per half; first half ends at MATCH_SECONDS - HALF_SECONDS remaining. */
export const HALF_SECONDS = MATCH_SECONDS / 2;
/** Brief pause at half-time before the second half resumes. */
export const HALF_TIME_PAUSE = 2.5;

export function activeRoster(team) {
  return team.roster.slice(0, ACTIVE_COUNT);
}
