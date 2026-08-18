'use strict';

/* ============================================================
 * 《临别叹息》 —— 高自由度丧尸末世生存模拟器（浏览器单机版）
 * 依据设计文档实现的简化可玩版本：
 * 角色创建 / 时间与世界阶段 / 生存属性 / 地图探索 / 搜刮 /
 * 战斗与噪音 / 感染 / 异能 / 基地建设 / 幸存者群像 / 随机事件 /
 * 阵营与贸易 / 尸潮 / 存档读档 / 多种结局。
 * ============================================================ */

/* ==================== 基础常量 ==================== */

const PHASES = ['清晨', '白天', '黄昏', '夜晚'];
const PHASE_EMOJI = ['🌅', '☀️', '🌇', '🌙'];

const WORLD_STAGES = [
  { name: '异常期', desc: '社会尚在运转，大多数人还不知道灾难将至。' },
  { name: '爆发期', desc: '感染迅速扩散，城市陷入混乱。' },
  { name: '崩坏期', desc: '水电、通讯与秩序陆续瘫痪。' },
  { name: '失序期', desc: '地方组织断裂，幸存者各自为战。' },
  { name: '割据期', desc: '各方势力割据，新秩序在废墟中萌芽。' },
  { name: '进化期', desc: '丧尸与病毒发生显著变异，更危险的存在出现。' },
  { name: '重建期', desc: '人类重新组织生产与定居，文明缓慢抬头。' },
  { name: '新世界', desc: '人类与丧尸形成新的生态平衡，或爆发新的战争。' }
];

const WEATHER_DEFS = {
  clear:  { name: '晴',   temp: 4,  travel: 0, danger: 0,  desc: '阳光明媚，适合外出。' },
  cloudy: { name: '阴',   temp: 0,  travel: 0, danger: 0,  desc: '云层低垂，光线昏暗。' },
  rain:   { name: '小雨', temp: -7, travel: 1, danger: -1, desc: '细雨绵绵，道路湿滑，声音被掩盖。' },
  storm:  { name: '暴雨', temp: -13, travel: 2, danger: -1, desc: '暴雨倾盆，能见度极低。' },
  snow:   { name: '大雪', temp: -18, travel: 2, danger: -2, desc: '大雪封路，严寒彻骨。' },
  heat:   { name: '酷热', temp: 14, travel: 1, danger: 1,  desc: '烈日暴晒，水分流失加快。' },
  cold:   { name: '严寒', temp: -22, travel: 2, danger: -2, desc: '极寒天气，暴露在外十分危险。' }
};

/* ==================== 物品 ==================== */

const ITEMS = {
  '罐头':     { cat: 'food',     food: 38, water: 0, weight: 0.5, desc: '保质期长，末世里的硬通货。' },
  '压缩饼干': { cat: 'food',     food: 28, weight: 0.3, desc: '干硬，但顶饿。' },
  '方便面':   { cat: 'food',     food: 20, weight: 0.3, desc: '干吃也行，泡水更佳。' },
  '面包':     { cat: 'food',     food: 18, weight: 0.3, spoil: 4, desc: '松软，但很快会变质。' },
  '水果':     { cat: 'food',     food: 12, water: 10, weight: 0.3, spoil: 3, desc: '补充水分与维生素。' },
  '蔬菜':     { cat: 'food',     food: 14, water: 6, weight: 0.4, spoil: 2, desc: '基地菜园的新鲜产出。' },
  '鸡蛋':     { cat: 'food',     food: 10, water: 0, weight: 0.2, spoil: 3, desc: '鸡舍的产出，珍贵的蛋白质来源。' },
  '军粮':     { cat: 'food',     food: 46, weight: 0.7, desc: '军用口粮，热量极高。' },
  '变质食品': { cat: 'food',     food: 6, weight: 0.4, rotten: true, desc: '已经腐烂发臭，吃下去有风险。' },
  '瓶装水':   { cat: 'drink',    water: 45, weight: 0.6, desc: '干净的饮用水。' },
  '净水':     { cat: 'drink',    water: 35, weight: 0.6, desc: '基地水井产出的净化水。' },
  '能量饮料': { cat: 'drink',    water: 20, stamina: 28, weight: 0.5, desc: '提神补水，但不可当水喝。' },
  '绷带':     { cat: 'med',      heal: 22, treatWound: true, weight: 0.15, desc: '包扎伤口，止血防感染。' },
  '医疗包':   { cat: 'med',      heal: 55, treatWound: true, weight: 0.8, desc: '完整的急救套装。' },
  '消毒剂':   { cat: 'med',      disinfect: true, weight: 0.3, desc: '处理新伤口，降低感染风险。' },
  '止痛药':   { cat: 'med',      painkiller: true, weight: 0.05, desc: '缓解疼痛，改善状态。' },
  '抗生素':   { cat: 'med',      antibiotic: true, weight: 0.05, desc: '延缓感染恶化，弥足珍贵。' },
  '维生素':   { cat: 'med',      immune: true, weight: 0.05, desc: '提升一段时间内的免疫力。' },
  '工具组':   { cat: 'tool',     weight: 2.5, desc: '扳手、螺丝刀等，建造与维修必备。' },
  '收音机':   { cat: 'tool',     weight: 0.5, desc: '可以收听外界广播与求救信号。' },
  '旧衣服':   { cat: 'misc',     weight: 0.8, desc: '可以拆成布条，也能保暖。' },
  '种子':     { cat: 'misc',     weight: 0.2, desc: '建立菜园的必需品。' },
  '电池':     { cat: 'misc',     weight: 0.3, desc: '给小型设备供电。' },
  '现金':     { cat: 'money',    weight: 0, desc: '末世前期或许还有用，越往后越像废纸。' },
  '菜刀':     { cat: 'weapon',   dmg: 9,  noise: 1, dur: 30, weight: 0.5, desc: '厨房里最常见，也最顺手。' },
  '棒球棍':   { cat: 'weapon',   dmg: 13, noise: 2, dur: 45, weight: 1.2, desc: '抡起来有安全感。' },
  '撬棍':     { cat: 'weapon',   dmg: 12, noise: 2, dur: 60, weight: 1.5, tool: true, desc: '既是武器，也是开门神器。' },
  '警棍':     { cat: 'weapon',   dmg: 11, noise: 1, dur: 50, weight: 0.8, desc: '结实耐用，几乎无声。' },
  '消防斧':   { cat: 'weapon',   dmg: 19, noise: 3, dur: 75, weight: 2.2, tool: true, desc: '劈开门板与颅骨都很好用。' },
  '砍刀':     { cat: 'weapon',   dmg: 17, noise: 3, dur: 60, weight: 1.6, desc: '锋利的冷兵器。' },
  '手枪':     { cat: 'gun',      dmg: 30, noise: 9,  ammo: '手枪弹', weight: 0.9, desc: '射程近，但关键时刻能救命。' },
  '步枪':     { cat: 'gun',      dmg: 42, noise: 12, ammo: '步枪弹', weight: 3.2, desc: '威力大，噪音也大得可怕。' },
  '手枪弹':   { cat: 'ammo',     weight: 0.02, desc: '手枪弹药。' },
  '步枪弹':   { cat: 'ammo',     weight: 0.03, desc: '步枪弹药。' },
  '木板':     { cat: 'material', weight: 3, desc: '建造与加固的基础材料。' },
  '金属':     { cat: 'material', weight: 4, desc: '坚固的结构材料。' },
  '零件':     { cat: 'material', weight: 1.5, desc: '修理设备与机械。' },
  '电线':     { cat: 'material', weight: 1, desc: '电力设施需要它。' },
  '燃油':     { cat: 'fuel',     weight: 6, desc: '发电、车辆与生火都离不开的战略资源。' },
  '背包':     { cat: 'equip',    carry: 12, weight: 1, desc: '大幅提升负重上限。' },
  '随身无线电': { cat: 'tool',   weight: 0.4, desc: '联系阵营、接取任务、与结识的人保持联络。' },
  '快速修理套件': { cat: 'tool', weight: 1.2, desc: '一次性用品：立刻把载具修理到完好状态。' },
  '铁管':     { cat: 'weapon',   dmg: 10, noise: 2, dur: 40, weight: 1.0, tier: 1, price: 500, desc: '随处可见，也足够硬。' },
  '长矛':     { cat: 'weapon',   dmg: 15, noise: 2, dur: 35, weight: 1.8, tier: 1, price: 800, desc: '一寸长，一寸强，保持距离。' },
  '武士刀':   { cat: 'weapon',   dmg: 24, noise: 2, dur: 55, weight: 1.2, tier: 2, price: 8000, desc: '锋利而稀有，冷兵器的巅峰。' },
  '电锯':     { cat: 'weapon',   dmg: 32, noise: 8, dur: 40, weight: 4.0, tier: 3, price: 12000, desc: '杀伤力恐怖，噪音也恐怖。' },
  '左轮':     { cat: 'gun',      dmg: 28, noise: 8,  ammo: '手枪弹', weight: 1.0, tier: 2, price: 6000, desc: '六发，可靠，声音大得吓人。' },
  '冲锋枪':   { cat: 'gun',      dmg: 20, noise: 7,  ammo: '手枪弹', burst: 2, weight: 3.0, tier: 2, price: 16000, desc: '近距离火力压制，耗弹极快。' },
  '霰弹枪':   { cat: 'gun',      dmg: 48, noise: 11, ammo: '步枪弹', weight: 3.4, tier: 3, price: 22000, desc: '一枪能把丧尸轰成两截。' },
  '狙击枪':   { cat: 'gun',      dmg: 65, noise: 12, ammo: '步枪弹', weight: 4.5, tier: 3, price: 40000, desc: '千里之外，取人性命。' }
  ,
  '军魂·赤焰': { cat: 'gun',    dmg: 95, noise: 9,  ammo: '步枪弹', burst: 3, aoe: 2, weight: 4.2, legend: true, desc: '军方最精锐的突击武器，一次点射就是一片火海。' },
  '万商来朝': { cat: 'gun',    dmg: 85, noise: 8,  ammo: '步枪弹', burst: 2, aoe: 2, weight: 3.8, legend: true, desc: '商队定制的双管连发枪，用钱堆出来的暴力。' },
  '血宴断头刀': { cat: 'weapon', dmg: 82, noise: 5,  dur: 60, aoe: 2, weight: 3.0, legend: true, desc: '掠夺者的镇帮之宝，一刀下去，血如盛宴。' },
  '晨曦裁决锤': { cat: 'weapon', dmg: 88, noise: 4,  dur: 65, aoe: 2, weight: 4.5, legend: true, desc: '守望者教会的圣器，据说能听见晨钟的回响。' },
  '造物主零号': { cat: 'gun',    dmg: 110, noise: 10, ammo: '电池', burst: 1, aoe: 2, weight: 3.5, legend: true, desc: '企业避难所的秘密武器，用电池驱动的脉冲枪。' }
  ,
  '玉米':     { cat: 'food',     food: 22, weight: 0.4, desc: '耐储存的粮食作物。' },
  '小麦':     { cat: 'food',     food: 18, weight: 0.3, desc: '磨成面粉就是主食，也是饲料原料。' },
  '土豆':     { cat: 'food',     food: 24, weight: 0.4, desc: '饱腹感十足的块茎。' },
  '猪肉':     { cat: 'food',     food: 40, weight: 0.6, spoil: 2, desc: '新鲜的肉，末世里的奢侈品。' },
  '牛奶':     { cat: 'drink',    water: 15, food: 10, weight: 0.5, spoil: 2, desc: '营养丰富的鲜奶。' },
  '羊毛':     { cat: 'misc',     weight: 0.4, desc: '保暖、制衣的材料。' },
  '鸡':       { cat: 'animal',   weight: 1.0, desc: '活的家禽，可放入牧场养殖。' },
  '猪':       { cat: 'animal',   weight: 3.0, desc: '活的猪崽，可放入牧场养殖。' },
  '牛':       { cat: 'animal',   weight: 5.0, desc: '活的牛，可放入牧场养殖。' },
  '羊':       { cat: 'animal',   weight: 3.0, desc: '活的羊，可放入牧场养殖。' },
  '肥料':     { cat: 'misc',     weight: 0.5, desc: '能显著加速农作物生长。' },
  '饲料':     { cat: 'misc',     weight: 0.5, desc: '能显著加速牲畜生长。' }
};

/* ==================== 职业 ==================== */

const PROFESSIONS = [
  { id: 'student',  name: '大学生',     desc: '年轻，学习能力强，但对末世毫无准备。', skills: { 搜索: 15, 心理: 10 }, items: [], money: 600 },
  { id: 'office',   name: '上班族',     desc: '朝九晚五的普通人，有一点积蓄。',       skills: { 谈判: 10 }, items: [], money: 3200 },
  { id: 'doctor',   name: '医生',       desc: '救死扶伤的手艺，在末世是稀缺资源。',   skills: { 医疗: 55, 心理: 20 }, items: [['医疗包', 1], ['绷带', 2]], money: 1800 },
  { id: 'nurse',    name: '护士',       desc: '护理经验丰富，胆大心细。',             skills: { 医疗: 40, 烹饪: 15 }, items: [['绷带', 3], ['消毒剂', 1]], money: 1200 },
  { id: 'coder',    name: '程序员',     desc: '懂系统与电路，动手能力尚可。',         skills: { 电力: 25, 搜索: 10 }, items: [['电池', 2]], money: 2500 },
  { id: 'engineer', name: '工程师',     desc: '建造、电力与机械样样通。',             skills: { 建造: 40, 电力: 30, 机械: 20 }, items: [['工具组', 1]], money: 2200 },
  { id: 'teacher',  name: '教师',       desc: '擅长沟通与组织，也懂人心。',           skills: { 领导: 25, 心理: 25, 谈判: 15 }, items: [], money: 1600 },
  { id: 'police',   name: '警察',       desc: '受过训练，会用枪，也有纪律。',         skills: { 近战: 25, 远程: 35, 驾驶: 15 }, items: [['警棍', 1]], money: 1500 },
  { id: 'soldier',  name: '军人',       desc: '职业军人，战斗能力远超常人。',         skills: { 近战: 40, 远程: 50, 驾驶: 20, 医疗: 10 }, items: [['手枪', 1], ['手枪弹', 14], ['军粮', 2]], money: 900 },
  { id: 'repair',   name: '维修工',     desc: '没有他修不好的机器。',                 skills: { 机械: 45, 电力: 25, 建造: 15 }, items: [['工具组', 1]], money: 1400 },
  { id: 'driver',   name: '卡车司机',   desc: '会开车、会修车，走南闯北。',           skills: { 驾驶: 50, 机械: 25 }, items: [['工具组', 1]], money: 1800 },
  { id: 'chef',     name: '厨师',       desc: '能把有限的食材变成一顿好饭。',         skills: { 烹饪: 50 }, items: [['菜刀', 1], ['罐头', 3]], money: 1200 },
  { id: 'farmer',   name: '农民',       desc: '种地、养殖，与土地打交道。',           skills: { 种植: 55, 烹饪: 15 }, items: [['种子', 4], ['罐头', 2]], money: 800 },
  { id: 'merchant', name: '商人',       desc: '精于算计与谈判，现金流充裕。',         skills: { 谈判: 45, 领导: 15 }, items: [], money: 9000 },
  { id: 'creator',  name: '自媒体创作者', desc: '消息灵通，表达能力强。',             skills: { 谈判: 15, 心理: 10 }, items: [['收音机', 1]], money: 2000 },
  { id: 'pharma',   name: '医药从业者', desc: '懂药品，也懂一点科研。',               skills: { 医疗: 30, 科研: 15 }, items: [['抗生素', 2], ['绷带', 2]], money: 1600 },
  { id: 'scientist', name: '科研人员',  desc: '头脑是他在末世里最大的武器。',         skills: { 科研: 50, 电力: 15 }, items: [['维生素', 2]], money: 1800 },
  { id: 'custom',   name: '普通市民',   desc: '没有特长，只有活下去的本能。',         skills: {}, items: [], money: 800 }
];

/* ==================== 异能 ==================== */

const ABILITIES = {
  danger: { name: '危险感知', desc: '能隐约察觉即将到来的危险，侦察时看得更远。' },
  heal:   { name: '快速愈合', desc: '伤口愈合更快，对感染有天然抗性。' },
  strength: { name: '力量强化', desc: '肉体力量远超常人，近战威力大增。' },
  calm:   { name: '冷静心智', desc: '恐惧很难击垮你，精神世界坚如磐石。' },
  mechanic: { name: '机械亲和', desc: '机械在他手中像有生命，能自动接管载具的修理与保养。' },
  farmer:  { name: '绿手指', desc: '自动打理农场：每天浇水、成熟即收、自动补种，作物长得更快。' },
  herder:  { name: '牧语者', desc: '自动照料牧场：喂水喂食、收集产出，牲畜长得更快。' }
};

/* ==================== 搜刮掉落池 ==================== */

const LOOT_POOLS = {
  food: [
    ['罐头', 28], ['压缩饼干', 20], ['瓶装水', 18], ['方便面', 12], ['面包', 9], ['水果', 7], ['能量饮料', 5], ['玉米', 8], ['小麦', 7], ['土豆', 7], ['猪肉', 2], ['军粮', 1]
  ],
  med: [
    ['绷带', 32], ['消毒剂', 18], ['止痛药', 18], ['抗生素', 14], ['维生素', 8], ['医疗包', 10]
  ],
  weapon: [
    ['棒球棍', 22], ['菜刀', 18], ['撬棍', 16], ['警棍', 8], ['消防斧', 10], ['砍刀', 10], ['手枪', 9], ['步枪', 7]
  ],
  material: [
    ['木板', 28], ['金属', 20], ['零件', 20], ['电线', 16], ['工具组', 8], ['旧衣服', 8]
  ],
  fuel: [
    ['燃油', 62], ['零件', 22], ['工具组', 10], ['电池', 6]
  ],
  misc: [
    ['种子', 14], ['电池', 13], ['旧衣服', 14], ['收音机', 8], ['现金', 18], ['能量饮料', 6], ['维生素', 5], ['肥料', 6], ['饲料', 6], ['羊毛', 4], ['随身无线电', 5], ['快速修理套件', 4]
  ]
};

const SPECIAL_POOLS = {
  farm:    [['种子', 30], ['蔬菜', 18], ['鸡蛋', 15], ['肥料', 12], ['玉米', 15], ['鸡', 10]],
  village: [['种子', 25], ['小麦', 25], ['玉米', 18], ['饲料', 15], ['土豆', 17]],
  pasture:[['羊毛', 18], ['土豆', 22], ['肥料', 14], ['饲料', 16], ['羊', 10], ['牛奶', 12], ['牛', 8]],
  wharf:   [['瓶装水', 22], ['罐头', 28], ['零件', 20], ['燃油', 15], ['金属', 15]],
  corp:    [['电池', 25], ['维生素', 20], ['抗生素', 15], ['零件', 25], ['电线', 15]],
  church:  [['维生素', 25], ['净水', 25], ['罐头', 20], ['旧衣服', 15], ['种子', 15]]
};

/* ==================== 地点 ==================== */

const LOC_DEFS = {
  home:     { name: '破旧公寓',   type: '住宅', travel: 0, loot: { food: 2, misc: 2 },              baseDanger: 1.0 },
  store:    { name: '街角便利店', type: '商店', travel: 1, loot: { food: 4, misc: 1 },              baseDanger: 1.5 },
  market:   { name: '城东超市',   type: '商店', travel: 2, loot: { food: 6, misc: 2, weapon: 1 },   baseDanger: 2.5 },
  pharmacy: { name: '惠民药店',   type: '医疗', travel: 1, loot: { med: 5, misc: 1 },               baseDanger: 1.8 },
  hospital: { name: '市立医院',   type: '医疗', travel: 3, loot: { med: 7, weapon: 1, misc: 1 },    baseDanger: 3.2 },
  school:   { name: '实验中学',   type: '公共', travel: 2, loot: { food: 3, misc: 2, material: 1 }, baseDanger: 2.2 },
  police:   { name: '城西警察局', type: '公共', travel: 3, loot: { weapon: 4, misc: 1 },            baseDanger: 3.4 },
  gas:      { name: '城郊加油站', type: '燃料', travel: 2, loot: { fuel: 6, misc: 1 },              baseDanger: 2.0 },
  factory:  { name: '北郊工厂',   type: '工业', travel: 3, loot: { material: 6, weapon: 1, fuel: 1 }, baseDanger: 2.6 },
  warehouse:{ name: '物流仓库',   type: '工业', travel: 3, loot: { material: 7, misc: 2 },          baseDanger: 2.4 },
  farm:     { name: '南郊农场',   type: '农业', travel: 3, loot: { food: 5, misc: 1 }, special: 'farm', baseDanger: 0.8 },
  mall:     { name: '万象商场',   type: '商店', travel: 3, loot: { food: 5, misc: 3, weapon: 1, med: 1 }, baseDanger: 4.0 },
  station:  { name: '老火车站',   type: '公共', travel: 2, loot: { food: 2, misc: 2, material: 1 }, baseDanger: 2.6 },
  village:  { name: '柳河村',     type: '农业', travel: 3, loot: { food: 4, misc: 1 }, special: 'village', baseDanger: 1.0 },
  mil_hq:   { name: '城东军营',   type: '军事', travel: 3, city: 'A', loot: { weapon: 3, med: 1 },  baseDanger: 3.0 },
  caravan_hq: { name: '商队驿站', type: '商业', travel: 2, city: 'A', loot: { food: 2, misc: 2, material: 1 }, baseDanger: 1.5 },
  b_wharf:  { name: '滨江码头',   type: '工业', travel: 1, city: 'B', loot: { material: 4, food: 2, misc: 1 }, special: 'wharf', baseDanger: 2.2 },
  b_college:{ name: '临江大学城', type: '公共', travel: 2, city: 'B', loot: { food: 3, misc: 2, material: 1 }, baseDanger: 2.4 },
  b_town:   { name: '山城小镇',   type: '农业', travel: 3, city: 'B', loot: { food: 4, misc: 1 }, special: 'pasture', baseDanger: 1.0 },
  raider_hq:{ name: '掠夺者营地', type: '军事', travel: 3, city: 'B', loot: { weapon: 3, fuel: 1 }, baseDanger: 3.6 },
  church_hq:{ name: '大教堂',     type: '公共', travel: 2, city: 'B', loot: { food: 2, med: 1, misc: 1 }, special: 'church', baseDanger: 1.8 },
  corp_hq:  { name: '企业避难所', type: '工业', travel: 3, city: 'B', loot: { med: 2, material: 2, food: 1 }, special: 'corp', baseDanger: 2.0 }
};
for (const k of Object.keys(LOC_DEFS)) if (!LOC_DEFS[k].city) LOC_DEFS[k].city = 'A';

const CITIES = { A: '平阳市', B: '临江市' };
const FACTION_HQ = { military: 'mil_hq', caravan: 'caravan_hq', raiders: 'raider_hq', church: 'church_hq', corp: 'corp_hq' };

const LOC_EMOJI = {
  home: '🏚', store: '🏪', market: '🛒', pharmacy: '💊', hospital: '🏥', school: '🏫',
  police: '👮', gas: '⛽', factory: '🏭', warehouse: '📦', farm: '🌾', mall: '🏬',
  station: '🚉', village: '🏡',
  mil_hq: '🪖', caravan_hq: '🐫', b_wharf: '⚓', b_college: '🎓', b_town: '🏘',
  raider_hq: '🏴', church_hq: '⛪', corp_hq: '🏢'
};

const WEAPON_SHOP = [
  { id: '铁管', price: 500, tier: 1 },
  { id: '长矛', price: 800, tier: 1 },
  { id: '砍刀', price: 1800, tier: 1 },
  { id: '手枪', price: 4500, tier: 1, ammo: '手枪弹' },
  { id: '左轮', price: 6000, tier: 2, ammo: '手枪弹' },
  { id: '武士刀', price: 8000, tier: 2 },
  { id: '电锯', price: 12000, tier: 3 },
  { id: '步枪', price: 14000, tier: 2, ammo: '步枪弹' },
  { id: '冲锋枪', price: 16000, tier: 2, ammo: '手枪弹' },
  { id: '霰弹枪', price: 22000, tier: 3, ammo: '步枪弹' },
  { id: '狙击枪', price: 40000, tier: 3, ammo: '步枪弹' }
];

const TASK_TEMPLATES = {
  military: [
    { id: 'mil_patrol', type: 'kill', count: 8, name: '清剿巡逻区', reward: { rep: 2, items: [['步枪弹', 12]] } },
    { id: 'mil_supply', type: 'items', need: { 医疗包: 1, 绷带: 2 }, name: '军需药品', reward: { rep: 2, items: [['手枪弹', 16]], money: 1500 } },
    { id: 'mil_hunt', type: 'kill', count: 18, name: '猎杀变异体', reward: { rep: 4, items: [['步枪', 1]], money: 3000 } }
  ],
  caravan: [
    { id: 'cv_food', type: 'items', need: { 罐头: 4 }, name: '粮食补给', reward: { rep: 1, money: 1200 } },
    { id: 'cv_escort', type: 'kill', count: 6, name: '清通商路', reward: { rep: 2, items: [['燃油', 2]], money: 2000 } },
    { id: 'cv_weapon', type: 'items', need: { 燃油: 3, 零件: 2 }, name: '护送军火', reward: { rep: 3, items: [['冲锋枪', 1]], money: 5000 } }
  ],
  raiders: [
    { id: 'rd_tribute', type: 'items', need: { 罐头: 4 }, name: '上贡口粮', reward: { rep: 1, items: [['手枪弹', 10]] } },
    { id: 'rd_raid', type: 'kill', count: 10, name: '替我们“讨债”', reward: { rep: 2, items: [['砍刀', 1]], money: 2500 } },
    { id: 'rd_hard', type: 'kill', count: 20, name: '血洗街区', reward: { rep: 4, items: [['霰弹枪', 1]], money: 8000 } }
  ],
  church: [
    { id: 'ch_food', type: 'items', need: { 罐头: 3, 净水: 2 }, name: '布施给难民', reward: { rep: 2, items: [['维生素', 2]], money: 800 } },
    { id: 'ch_med', type: 'items', need: { 绷带: 3, 抗生素: 1 }, name: '药品救助', reward: { rep: 3, items: [['医疗包', 1]], money: 2000 } },
    { id: 'ch_visit', type: 'visit', target: 'school', name: '寻找失散的孩子', reward: { rep: 3, items: [['净水', 3]], money: 1500 } }
  ],
  corp: [
    { id: 'cp_sample', type: 'kill', count: 6, name: '采集样本', reward: { rep: 2, items: [['维生素', 2]], money: 1800 } },
    { id: 'cp_part', type: 'items', need: { 零件: 4, 电池: 2 }, name: '回收设备', reward: { rep: 2, items: [['燃油', 2]], money: 2200 } },
    { id: 'cp_tech', type: 'items', need: { 工具组: 2, 电线: 3 }, name: '尖端设备', reward: { rep: 4, items: [['狙击枪', 1]], money: 12000 } }
  ]
};

/* ==================== 阵营传奇任务线 ==================== */

const LEGEND_CHAINS = {
  military: {
    weapon: '军魂·赤焰',
    stages: [
      { name: '忠诚考验', type: 'kill', count: 10, desc: '在巡逻区清剿 10 只丧尸，证明你的枪口值得托付。', reward: { rep: 2, items: [['步枪弹', 20]] } },
      { name: '孤军深入', type: 'visit', target: 'police', desc: '深入城西警察局，取回失联小队的加密电台。', reward: { rep: 3, items: [['手枪弹', 30]] } },
      { name: '最终战役', type: 'kill', count: 30, desc: '配合军方发动一次大规模清剿。', reward: { rep: 5, items: [['军魂·赤焰', 1]], money: 8000 } }
    ]
  },
  caravan: {
    weapon: '万商来朝',
    stages: [
      { name: '开市', type: 'items', need: { 罐头: 6 }, desc: '为商队的集市补足口粮。', reward: { rep: 2, money: 1500 } },
      { name: '商路守护', type: 'kill', count: 12, desc: '清通被尸群堵住的商路。', reward: { rep: 3, items: [['燃油', 3]] } },
      { name: '黄金航线', type: 'items', need: { 燃油: 5, 零件: 4 }, desc: '为武装商队提供远航补给。', reward: { rep: 5, items: [['万商来朝', 1]], money: 10000 } }
    ]
  },
  raiders: {
    weapon: '血宴断头刀',
    stages: [
      { name: '投名状', type: 'kill', count: 8, desc: '用 8 只丧尸的头颅，换一张入伙的门票。', reward: { rep: 2, items: [['砍刀', 1]] } },
      { name: '立威', type: 'kill', count: 18, desc: '让整条街记住你的名字。', reward: { rep: 3, items: [['手枪弹', 20]] } },
      { name: '血宴', type: 'kill', count: 35, desc: '血洗尸群，办一场只属于强者的盛宴。', reward: { rep: 5, items: [['血宴断头刀', 1]], money: 12000 } }
    ]
  },
  church: {
    weapon: '晨曦裁决锤',
    stages: [
      { name: '布施', type: 'items', need: { 罐头: 5, 净水: 3 }, desc: '为难民营送去食物与净水。', reward: { rep: 2, items: [['维生素', 2]] } },
      { name: '护佑', type: 'visit', target: 'church_hq', desc: '护送朝圣者安全抵达大教堂。', reward: { rep: 3, items: [['净水', 4]] } },
      { name: '审判', type: 'kill', count: 25, desc: '在教堂的钟声里，审判 25 只丧尸。', reward: { rep: 5, items: [['晨曦裁决锤', 1]], money: 9000 } }
    ]
  },
  corp: {
    weapon: '造物主零号',
    stages: [
      { name: '样本回收', type: 'kill', count: 8, desc: '为避难所采集 8 份变异样本数据。', reward: { rep: 2, items: [['维生素', 2]] } },
      { name: '设备抢修', type: 'items', need: { 零件: 5, 电线: 4 }, desc: '为实验室送去维修部件。', reward: { rep: 3, items: [['燃油', 3]] } },
      { name: '零号实验', type: 'kill', count: 28, desc: '完成零号武器的实战数据采集。', reward: { rep: 5, items: [['造物主零号', 1]], money: 15000 } }
    ]
  }
};

/* ==================== 丧尸类型 ==================== */

const ZOMBIES = {
  walker:  { name: '普通感染者', hp: 22, dmg: 8,  spd: 2, perc: 1, stage: 0, evo: 0, w: 55 },
  roamer:  { name: '游荡者',     hp: 28, dmg: 9,  spd: 3, perc: 2, stage: 0, evo: 0, w: 22 },
  runner:  { name: '冲击型',     hp: 20, dmg: 7,  spd: 5, perc: 2, stage: 1, evo: 1, w: 12 },
  brute:   { name: '强化型',     hp: 55, dmg: 16, spd: 2, perc: 1, stage: 1, evo: 1, w: 8 },
  sensor:  { name: '感知型',     hp: 26, dmg: 8,  spd: 3, perc: 5, stage: 2, evo: 2, w: 6 },
  special: { name: '特殊变异体', hp: 80, dmg: 22, spd: 4, perc: 3, stage: 3, evo: 4, w: 3 }
};

const ZOMBIE_EMOJI = { walker: '🧟', roamer: '🚶', runner: '🏃', brute: '💪', sensor: '👁', special: '👹' };

/* ==================== 基地设施 ==================== */

const FACILITIES = {
  wall:      { name: '加固围墙', icon: '🧱', desc: '大幅提升基地防御。', req: { 木板: 4, 金属: 2 }, days: 2 },
  garden:    { name: '菜园',     icon: '🌱', desc: '每日产出蔬菜，需安排种植人手。', req: { 种子: 3, 木板: 2 }, days: 1 },
  well:      { name: '水井净水器', icon: '💧', desc: '每日产出干净饮水。', req: { 金属: 2, 零件: 2, 电线: 1 }, days: 1 },
  medbay:    { name: '医务室',   icon: '🩺', desc: '治疗伤员、延缓感染，需药品与医护。', req: { 木板: 2, 零件: 1 }, days: 1 },
  workshop:  { name: '工坊',     icon: '🔧', desc: '解锁制作、修理与改造。', req: { 金属: 2, 零件: 2, 工具组: 1 }, days: 1 },
  generator: { name: '发电机',   icon: '⚡', desc: '开关开启后自动消耗仓库燃油供电，缺油自动暂停、有油自动重启。', req: { 零件: 3, 金属: 1, 电线: 1 }, days: 1 },
  tower:     { name: '瞭望塔',   icon: '🔭', desc: '提前预警尸潮与人类袭击。', req: { 木板: 3 }, days: 1 },
  radio:     { name: '广播电台', icon: '📻', desc: '接收信息、招募幸存者、回应求救信号。', req: { 零件: 2, 电线: 2 }, days: 1 },
  barn:      { name: '鸡舍',     icon: '🐔', desc: '养鸡产蛋，稳定补充少量食物。', req: { 木板: 3, 种子: 1 }, days: 1 },
  farm:      { name: '农场',     icon: '🌾', desc: '种植农作物：一键浇水（自来水无限），肥料可加速。', req: { 种子: 4, 木板: 4, 金属: 2 }, days: 2 },
  ranch:     { name: '牧场',     icon: '🐄', desc: '养殖牲畜：一键喂水（自来水无限），饲料可加速。', req: { 木板: 4, 金属: 2, 零件: 1 }, days: 2 },
  compost:   { name: '堆肥桶',   icon: '🪣', desc: '把食物投入桶中，发酵 2 个时段后变成肥料。', req: { 木板: 2, 金属: 1 }, days: 1 },
  school:    { name: '学堂',     icon: '📚', desc: '提升士气，让下一代重新学习知识。', req: { 木板: 2, 金属: 1 }, days: 2 },
  lab:       { name: '病毒实验室', icon: '🧪', desc: '研究疫苗的核心设施，解药主线的关键。', req: { 金属: 2, 零件: 3, 电线: 2, 工具组: 1 }, days: 2 }
};

const BASE_TIERS = [
  { pop: 0,   name: '临时避难点', desc: '只有一个落脚的地方。' },
  { pop: 5,   name: '小型营地',   desc: '开始有了组织与分工。' },
  { pop: 12,  name: '防御基地',   desc: '围墙、岗哨与稳定的补给。' },
  { pop: 30,  name: '城镇',       desc: '市场、学校与新家庭相继出现。' },
  { pop: 60,  name: '新城市',     desc: '文明的火种，重新在这片土地上燃烧。' }
];

const ROLES = [
  { id: 'idle', name: '待命' },
  { id: 'guard', name: '守卫' },
  { id: 'follower', name: '跟随' },
  { id: 'scavenge', name: '拾荒' },
  { id: 'farm', name: '种植' },
  { id: 'medic', name: '医护' },
  { id: 'repair', name: '维修' }
];

const RECIPES = [
  { id: 'bandage', name: '简易绷带', desc: '用旧衣服撕成布条。', need: { 旧衣服: 1 }, out: [['绷带', 1]], workshop: false },
  { id: 'repair',  name: '修理武器', desc: '恢复当前武器一半耐久。', need: { 零件: 1 }, special: 'repair', workshop: true },
  { id: 'trap',    name: '制作陷阱', desc: '基地防御 +4。', need: { 木板: 2, 零件: 1 }, special: 'trap', workshop: true },
  { id: 'fertilizer', name: '沤制肥料', desc: '用变质食物与旧衣服堆肥。', need: { 变质食品: 2, 旧衣服: 1 }, out: [['肥料', 1]], workshop: false },
  { id: 'feed',    name: '配制饲料', desc: '用玉米和小麦磨制。', need: { 玉米: 2, 小麦: 1 }, out: [['饲料', 2]], workshop: true }
];

const CROPS = { 玉米: { days: 4, min: 2, max: 3 }, 小麦: { days: 5, min: 2, max: 3 }, 土豆: { days: 4, min: 2, max: 4 } };
const ANIMALS = {
  鸡: { days: 3, produce: '鸡蛋' },
  猪: { days: 6, produce: '猪肉' },
  牛: { days: 9, produce: '牛奶' },
  羊: { days: 7, produce: '羊毛' }
};
const FARM_SHOP = [
  ['种子', 200], ['肥料', 150], ['饲料', 120],
  ['玉米', 300], ['小麦', 350], ['土豆', 280], ['猪肉', 600], ['牛奶', 450], ['羊毛', 500],
  ['鸡', 500], ['猪', 1200], ['牛', 2500], ['羊', 1800]
];

/* ==================== 姓名库 ==================== */

const SURNAMES = ['林', '陈', '周', '王', '李', '张', '刘', '赵', '吴', '徐', '孙', '黄', '许', '何', '沈', '顾', '罗', '苏', '钟', '叶', '方', '夏', '谭', '蒋', '韩', '曹', '谢', '廖', '汪', '戴'];
const GIVEN_M = ['建国', '志强', '伟', '磊', '军', '峰', '海', '涛', '铭', '哲', '浩然', '子轩', '明', '勇', '凯', '鹏', '宇', '俊', '杰', '天佑'];
const GIVEN_F = ['秀兰', '丽', '静', '敏', '雪', '婷', '晓芳', '文静', '雅', '欣', '雨桐', '梦瑶', '佳', '兰', '慧', '红', '芳', '琳', '晨', '若彤'];

/* ==================== 工具函数 ==================== */

const $ = (id) => document.getElementById(id);

function rand(a, b) {
  if (b === undefined) { b = a; a = 0; }
  return a + Math.random() * (b - a);
}
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function chance(p) { return Math.random() < p; }
function rollCash() {
  return chance(0.8) ? randInt(50, 100) : randInt(100, 500);
}
function weightPick(entries) {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e[1];
    if (r <= 0) return e[0];
  }
  return entries[entries.length - 1][0];
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtTime(day) {
  const d = day >= 0 ? day : -day;
  if (day >= 0) return `爆发第 ${d} 天`;
  return `爆发前 ${d} 天`;
}
function stageIndex(day) {
  if (day <= 0) return 0;
  if (day < 3) return 0;
  if (day < 15) return 1;
  if (day < 61) return 2;
  if (day < 181) return 3;
  if (day < 366) return 4;
  if (day < 731) return 5;
  if (day < 1461) return 6;
  return 7;
}
function stageFactor(day) {
  if (day <= 0) return 0;
  return [0.12, 0.55, 1.0, 1.25, 1.45, 1.7, 1.4, 1.6][stageIndex(day)];
}

/* ==================== 全局状态 ==================== */

let S = null;           // 完整游戏状态（可序列化）
let log = [];           // 运行日志（不随存档导出）
let ui = { tab: 'actions' };

const SAVE_KEY = 'moshi_canxiang_save_v1';
const SETTINGS_KEY = 'moshi_canxiang_settings_v1';
const ACHIEVE_KEY = 'moshi_canxiang_achieve_v1';
const SLOT_KEYS = { auto: SAVE_KEY, s1: SAVE_KEY + '_s1', s2: SAVE_KEY + '_s2', s3: SAVE_KEY + '_s3' };
const GAME_VERSION = '1.6.0';

/* ==================== 季节 / 进化 / 成就 ==================== */

const SEASONS = {
  spring: { name: '春', temp: 0, desc: '万物复苏' },
  summer: { name: '夏', temp: 8, desc: '酷暑难耐' },
  autumn: { name: '秋', temp: -2, desc: '凉爽干燥' },
  winter: { name: '冬', temp: -14, desc: '严寒彻骨' }
};

const EVO_WAVES = [
  { day: 90, level: 1, name: '第一次变异', density: 0.15, desc: '强化型与冲击型丧尸开始大量出现。' },
  { day: 180, level: 2, name: '第二次变异', density: 0.15, war: true, desc: '感知型丧尸出现，夜间更危险；各方势力开始互相攻伐。' },
  { day: 300, level: 3, name: '尸潮季', density: 0, horde: true, desc: '大规模尸潮将每隔 60-90 天冲击一次。' },
  { day: 365, level: 4, name: '进化期', density: 0.2, desc: '特殊变异体出现，高阶威胁浮出水面。' },
  { day: 540, level: 5, name: '势力大战', density: 0, war: true, desc: '幸存者势力爆发全面冲突。' },
  { day: 730, level: 6, name: '高阶变异', density: 0.25, desc: '高阶变异体开始在核心区域游荡。' }
];

const ACHIEVEMENTS = [
  { id: 'd7', icon: '🕯', name: '第一周', desc: '存活 7 天' },
  { id: 'd30', icon: '🌒', name: '一个月', desc: '存活 30 天' },
  { id: 'd365', icon: '🌅', name: '周年', desc: '活过整整一年' },
  { id: 'k1', icon: '⚔', name: '初次击杀', desc: '击杀第一只丧尸' },
  { id: 'k100', icon: '💀', name: '百人斩', desc: '累计击杀 100 只丧尸' },
  { id: 'base', icon: '🏠', name: '安家', desc: '建立第一个安全屋' },
  { id: 'recruit10', icon: '👥', name: '十人小队', desc: '团队达到 10 人' },
  { id: 'city', icon: '🏙', name: '新城市', desc: '基地人口达到 60' },
  { id: 'npcall', icon: '🧭', name: '群像', desc: '结识全部 22 位特殊人物' },
  { id: 'arc10', icon: '📖', name: '十段人生', desc: '完成 10 条人物支线' },
  { id: 'cure', icon: '🧬', name: '解药', desc: '完成解药主线' },
  { id: 'car', icon: '🚙', name: '座驾', desc: '获得第一辆车' },
  { id: 'tycoon', icon: '💰', name: '巨贾', desc: '现金达到 20 万' },
  { id: 'end3', icon: '📜', name: '三种人生', desc: '达成 3 种结局' },
  { id: 'endall', icon: '🏆', name: '全部人生', desc: '达成全部结局' },
  { id: 'ability', icon: '⚡', name: '觉醒', desc: '拥有异能' }
];

function defaultSettings() {
  return { adventureRate: 0.05, sound: false };
}
function loadSettings() {
  try {
    return Object.assign(defaultSettings(), JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch (e) { return defaultSettings(); }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* 忽略 */ }
}
let SETTINGS = loadSettings();

function seasonOf(day) {
  if (day <= 0) return 'spring';
  return ['spring', 'summer', 'autumn', 'winter'][Math.floor((day - 1) / 90) % 4];
}

function evolutionOf(day) {
  let level = 0, density = 0;
  for (const w of EVO_WAVES) {
    if (day >= w.day) { level = w.level; density += w.density; }
  }
  return { level, density };
}

function loadAch() {
  try { return JSON.parse(localStorage.getItem(ACHIEVE_KEY) || '{}'); }
  catch (e) { return {}; }
}
let ACHIEVES = loadAch();
function saveAch() {
  try { localStorage.setItem(ACHIEVE_KEY, JSON.stringify(ACHIEVES)); } catch (e) { /* 忽略 */ }
}
function unlockAch(id) {
  if (ACHIEVES[id]) return;
  ACHIEVES[id] = Date.now();
  saveAch();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a) {
    addLog(`【成就】${a.icon} 「${a.name}」——${a.desc}`, 'sys');
    if (typeof document !== 'undefined') toast(`🏅 成就解锁：${a.name}`);
  }
}

function makeSurvivor(extra) {
  const sex = extra && extra.sex ? extra.sex : pick(['男', '女']);
  const surname = pick(SURNAMES);
  const given = sex === '男' ? pick(GIVEN_M) : pick(GIVEN_F);
  const prof = pick(PROFESSIONS.filter(p => p.id !== 'custom'));
  const age = randInt(18, 58);
  const skills = {};
  for (const [k, v] of Object.entries(prof.skills)) skills[k] = v + randInt(-5, 8);
  for (const k of ['近战', '远程', '搜索', '医疗', '驾驶', '机械', '电力', '种植', '烹饪', '建造', '谈判', '领导', '科研', '心理', '潜行']) {
    if (skills[k] === undefined) skills[k] = randInt(0, 12);
  }
  return {
    id: 'npc_' + Math.random().toString(36).slice(2, 9),
    name: surname + given,
    sex, age, profession: prof.name, profId: prof.id,
    skills,
    health: randInt(60, 100),
    morale: randInt(40, 70),
    loyalty: randInt(35, 70),
    role: 'idle',
    traits: pick([['谨慎', '悲观'], ['乐观', '冲动'], ['忠诚', '沉默'], ['精明', '多疑'], ['善良', '软弱'], ['坚韧', '固执'], ['胆怯', '细心'], ['豪爽', '重情']]),
    ability: null,
    weapon: null,
    inv: {},
    alive: true,
    spouse: null,
    child: null,
    joinedDay: S && S.world ? S.world.day : 0,
    story: pick(['只想找到失散的家人。', '曾在超市被丧尸围困。', '见过太多死亡，变得沉默。', '相信人类能重建文明。', '在找一种特效药。', '以前是一名普通的城市居民。'])
  };
}

function makeLocation(id, day) {
  const def = LOC_DEFS[id];
  const factor = stageFactor(day);
  let danger = def.baseDanger * factor;
  if (day > 0) danger *= rand(0.7, 1.3);
  danger = clamp(danger, 0, 10);
  const zombieCount = Math.round(danger * rand(4, 8));
  return {
    id, danger, zombieCount,
    searched: 0,
    loot: Object.assign({}, def.loot),
    survivors: [],
    npcs: [],
    note: '',
    lootedOut: false
  };
}

function makeSpecialNpcs() {
  return SPECIAL_NPC_TEMPLATES.map(t => {
    const npc = JSON.parse(JSON.stringify(t));
    const inv = {};
    for (const [id, qty] of Object.entries(t.inv)) {
      inv[id] = { n: qty, spoil: ITEMS[id].spoil || null };
    }
    npc.inv = inv;
    npc.favor = t.favorStart;
    npc.met = false;
    npc.location = null;
    npc.recruited = false;
    npc.alive = true;
    npc.lastTalkDay = -99;
    npc.quest.done = false;
    npc.quest.progress = false;
    npc.quest.start = 0;
    return npc;
  });
}

function ensureSaveCompat(state) {
  if (!state.world.specialNpcs) state.world.specialNpcs = makeSpecialNpcs();
  for (const npc of state.world.specialNpcs) {
    const keys = Object.keys(npc.inv || {});
    if (keys.length && typeof npc.inv[keys[0]] === 'number') {
      const inv = {};
      for (const [id, qty] of Object.entries(npc.inv)) inv[id] = { n: qty, spoil: (ITEMS[id] && ITEMS[id].spoil) || null };
      npc.inv = inv;
    }
  }
  if (!state.world.flags.adventure) state.world.flags.adventure = {};
  if (!state.world.flags.endingsAchieved) state.world.flags.endingsAchieved = [];
  if (!state.world.flags.acceptedEnding) state.world.flags.acceptedEnding = null;
  for (const loc of Object.values(state.world.locations)) {
    if (!loc.npcs) loc.npcs = [];
  }
  if (state.base) {
    if (!state.base.crops) state.base.crops = [];
    if (!state.base.livestock) state.base.livestock = [];
    if (!state.base.compost) state.base.compost = [];
    for (const c of state.base.compost) if (!c.qty) c.qty = 1;
    if (state.base.powerWaiting === undefined) state.base.powerWaiting = false;
    for (const n of state.base.population) if (!n.inv) n.inv = {};
  }
  if (state.world.factions.church === undefined) state.world.factions.church = 0;
  if (state.world.factions.corp === undefined) state.world.factions.corp = 0;
  if (state.world.vehicle === undefined) state.world.vehicle = null;
  if (!state.world.flags.arcs) state.world.flags.arcs = {};
  if (!state.world.flags.arcVisited) state.world.flags.arcVisited = {};
  if (!state.world.flags.arcStart) state.world.flags.arcStart = {};
  if (state.world.flags.cure === undefined) state.world.flags.cure = null;
  if (!state.world.flags.camp) state.world.flags.camp = {};
  if (state.world.flags.factionJoined === undefined) state.world.flags.factionJoined = null;
  if (state.world.flags.hordeNext === undefined) state.world.flags.hordeNext = null;
  if (state.world.flags.warStarted === undefined) state.world.flags.warStarted = false;
  if (state.world.flags.lastWarDay === undefined) state.world.flags.lastWarDay = 0;
  if (!state.world.radioTasks) state.world.radioTasks = [];
  if (!state.world.radioOffers) state.world.radioOffers = [];
  if (!state.world.legendChains) {
    state.world.legendChains = {};
    for (const f of Object.keys(LEGEND_CHAINS)) state.world.legendChains[f] = { stage: 0, done: false };
  }
  if (state.world.flags.lastNpcCall === undefined) state.world.flags.lastNpcCall = 0;
  // 老档补齐：按当前世界天数回溯进化阶段与战争状态
  const e = evolutionOf(state.world.day);
  if (!state.world.flags.evo) {
    state.world.flags.evo = { level: e.level, density: e.density };
    if (e.level > 0) {
      state.world.history.push(`${fmtTime(state.world.day)}：在你沉睡的这段时间，世界经历了 ${e.level} 轮变异——尸群与势力早已今非昔比。`);
    }
  } else {
    state.world.flags.evo.level = e.level;
    state.world.flags.evo.density = e.density;
  }
  if (state.world.day >= 180) state.world.flags.warStarted = true;
  // 兼容旧存档里已经显示过的结局标记
  if (state.world.flags.ending) {
    for (const [id, v] of Object.entries(state.world.flags.ending)) {
      if (v && ENDINGS.some(e => e.id === id) && !state.world.flags.endingsAchieved.includes(id)) {
        state.world.flags.endingsAchieved.push(id);
      }
    }
  }
  return state;
}

function freshState(creation) {
  const world = {
    day: creation.startDay,
    phase: 0,
    location: 'home',
    weather: 'cloudy',
    weatherLeft: randInt(1, 3),
    stageNewsIdx: 0,
    factions: { military: 0, caravan: 0, raiders: -2, camp: 0, church: 0, corp: 0 },
    history: [],
    flags: {},
    stat: { daysSurvived: 0, kills: 0, humansKilled: 0, rescued: 0, scavenges: 0 },
    signal: null,
    vehicle: null,
    radioTasks: [],
    radioOffers: [],
    legendChains: (() => {
      const c = {};
      for (const f of Object.keys(LEGEND_CHAINS)) c[f] = { stage: 0, done: false };
      return c;
    })()
  };
  world.locations = {};
  for (const id of Object.keys(LOC_DEFS)) world.locations[id] = makeLocation(id, creation.startDay);
  world.specialNpcs = makeSpecialNpcs();
  world.flags.endingsAchieved = [];
  world.flags.acceptedEnding = null;
  world.flags.adventure = {};
  world.flags.evo = { level: 0, density: 0 };
  world.flags.arcs = {};
  world.flags.arcVisited = {};
  world.flags.arcStart = {};
  world.flags.cure = null;
  world.flags.camp = {};
  world.flags.factionJoined = null;
  world.flags.hordeNext = null;
  world.flags.warStarted = false;
  world.flags.lastWarDay = 0;
  world.flags.lastNpcCall = 0;

  const prof = PROFESSIONS.find(p => p.id === creation.profession);
  const body = { good: { hp: 10, st: 5, imm: 12 }, normal: {}, weak: { hp: -15, st: -10, imm: -12 } }[creation.body];

  let ability = null;
  let abilityMode = creation.ability;
  if (creation.ability === 'awakened') ability = creation.abilityType;
  if (creation.ability === 'random') { ability = pick(Object.keys(ABILITIES)); abilityMode = 'awakened'; }

  const player = {
    name: creation.name || '无名者',
    sex: creation.sex,
    age: creation.age,
    profession: prof.name,
    professionId: prof.id,
    deathMode: creation.deathMode,
    health: clamp(100 + (body.hp || 0), 0, 100),
    stamina: 90 + (body.st || 0),
    hunger: 10, thirst: 10, fatigue: 15, temp: 78, mental: 90, morale: 55,
    infection: 0, infectionControlled: false,
    immune: 15 + (body.imm || 0),
    skills: {},
    wounds: [],
    effects: [],
    ability, abilityMode, abilityUses: 0, abilityLevel: ability ? 1 : 0,
    money: 0,
    inventory: {},       // {id: {n, spoil}}
    weapon: null,
    tags: [],
    kills: 0,
    hungerDays: 0, thirstDays: 0
  };

  for (const [k, v] of Object.entries(prof.skills)) player.skills[k] = v;
  for (const k of ['近战', '远程', '搜索', '医疗', '驾驶', '机械', '电力', '种植', '烹饪', '建造', '谈判', '领导', '科研', '心理', '潜行']) {
    if (player.skills[k] === undefined) player.skills[k] = randInt(0, 8);
  }

  addItems(player.inventory, prof.items, world.day);
  const supply = {
    poor:     { items: [['压缩饼干', 1], ['瓶装水', 1]], money: 200 },
    normal:   { items: [['压缩饼干', 2], ['瓶装水', 2], ['罐头', 1]], money: 800 },
    prepared: { items: [['压缩饼干', 3], ['瓶装水', 3], ['罐头', 2], ['绷带', 2], ['旧衣服', 1]], money: 1800 },
    rich:     { items: [['压缩饼干', 4], ['瓶装水', 4], ['罐头', 3], ['绷带', 3], ['抗生素', 1], ['背包', 1], ['棒球棍', 1], ['随身无线电', 1], ['快速修理套件', 1]], money: 4000 }
  }[creation.supply];
  addItems(player.inventory, supply.items, world.day);
  player.money = (prof.money || 0) + supply.money;

  const base = null;
  const state = { version: 1, world, player, base };
  return state;
}

function addItems(inv, list, day) {
  for (const [id, qty] of list) {
    if (!ITEMS[id]) continue;
    if (id === '现金') continue; // 现金单独计数
    const def = ITEMS[id];
    if (!inv[id]) inv[id] = { n: 0, spoil: def.spoil || null };
    const cur = inv[id];
    if (def.spoil && cur.spoil !== null) {
      cur.spoil = Math.ceil((cur.n * cur.spoil + qty * def.spoil) / Math.max(1, cur.n + qty));
    }
    cur.n += qty;
  }
}
function addItem(inv, id, qty) {
  addItems(inv, [[id, qty]], S ? S.world.day : 0);
}
function countInv(inv, id) { return inv[id] ? inv[id].n : 0; }
function removeItem(inv, id, qty) {
  if (!inv[id]) return false;
  if (inv[id].n < qty) return false;
  inv[id].n -= qty;
  if (inv[id].n <= 0) delete inv[id];
  return true;
}
function totalWeight(inv) {
  let w = 0;
  for (const [id, st] of Object.entries(inv)) w += (ITEMS[id].weight || 0) * st.n;
  return Math.round(w * 10) / 10;
}
function carryCap(p) {
  let cap = 14;
  if (countInv(p.inventory, '背包') > 0) cap += ITEMS['背包'].carry;
  return cap;
}
function invList(inv) {
  return Object.keys(inv).map(id => ({ id, ...inv[id], def: ITEMS[id] }));
}
function itemName(id) {
  const it = ITEMS[id];
  return (it && it.name) ? it.name : id;
}

/* ==================== 日志 ==================== */

function addLog(text, cls) {
  const t = `${fmtTime(S.world.day)} ${PHASES[S.world.phase]}`;
  log.unshift({ t, text, cls: cls || 'info' });
  if (log.length > 500) log.pop();
  if (ENC) {
    ENC.battleLog = ENC.battleLog || [];
    ENC.battleLog.push({ text, cls: cls || 'info' });
    if (ENC.battleLog.length > 6) ENC.battleLog.shift();
  }
  if (typeof document !== 'undefined' && !document.getElementById('gameScreen').classList.contains('hidden')) {
    renderLogSide();
  }
}

/* ==================== 存档系统 ==================== */

function saveToStorage() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function exportSave() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}
function importSave(code) {
  const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (!data || !data.player || !data.world) throw new Error('存档内容无效');
  return data;
}
function autosave() {
  saveToStorage();
  addLog('【系统】世界已自动记录。', 'sys');
}

/* ==================== 状态描述 ==================== */

function infectionStage(inf) {
  if (inf <= 0) return '未感染';
  if (inf < 20) return '暴露';
  if (inf < 40) return '潜伏';
  if (inf < 60) return '初期感染';
  if (inf < 80) return '中期感染';
  if (inf < 95) return '重度感染';
  return '临界';
}

function bodyStatus() {
  const p = S.player;
  const parts = [];
  if (p.health <= 25) parts.push('濒死');
  else if (p.health <= 55) parts.push('重伤');
  else if (p.health <= 80) parts.push('轻伤');
  if (p.wounds.length > 0) parts.push(`有 ${p.wounds.length} 处伤口`);
  if (p.infection > 0) parts.push(infectionStage(p.infection));
  if (p.fatigue >= 75) parts.push('极度疲劳');
  else if (p.stamina <= 25) parts.push('体力透支');
  if (p.hunger >= 75) parts.push('饥饿');
  if (p.thirst >= 75) parts.push('缺水');
  if (p.temp <= 35) parts.push('失温');
  if (p.temp >= 85) parts.push('中暑');
  if (p.mental <= 35) parts.push('精神濒临崩溃');
  return parts.length ? parts.join('、') : '状态正常';
}

function currentWeapon(p) {
  if (p.weapon && countInv(p.inventory, p.weapon) > 0) return ITEMS[p.weapon];
  if (p.weapon && countInv(p.inventory, p.weapon) <= 0) {
    p.weapon = null;
  }
  return { dmg: 4, noise: 0, dur: 99, name: '拳头' };
}

function combatPower(p) {
  const w = currentWeapon(p);
  let score = 10 + (p.skills.近战 + p.skills.远程) * 0.32 + p.skills.潜行 * 0.15 + p.skills.医疗 * 0.08;
  score += (w.dmg || 4) * 1.1;
  if (p.ability === 'strength') score *= 1.15 + p.abilityLevel * 0.05;
  if (p.health < 70) score *= 0.75;
  if (p.wounds.length) score *= Math.max(0.5, 1 - p.wounds.length * 0.08);
  const v = Math.round(score);
  let label = '普通人';
  if (v >= 45) label = '训练有素';
  if (v >= 70) label = '老练的战士';
  if (v >= 95) label = '危险人物';
  return `${v}（${label}）`;
}

/* ==================== 感染 / 伤势 ==================== */

function gainInfection(amount, source) {
  const p = S.player;
  let v = amount;
  v *= clamp(1 - p.immune / 110, 0.4, 1);
  if (p.ability === 'heal') v *= 0.6;
  p.infection = clamp(p.infection + v, 0, 100);
  addLog(`你受到了${source || '感染源'}的影响（感染 ${Math.round(v)}%）。`, 'bad');
  if (p.infection >= 100) die('感染恶化，你终究没能挺过去。');
}

function addWound(kind, sev, infected) {
  const p = S.player;
  p.wounds.push({ kind, sev, treated: false, day: S.world.day });
  addLog(`你受了${sev >= 3 ? '重伤' : sev === 2 ? '中等伤势' : '轻伤'}：${kind}。`, 'bad');
  if (infected) {
    let amt = kind === '咬伤' ? rand(22, 42) : kind === '抓伤' ? rand(10, 22) : rand(6, 16);
    if (countInv(p.inventory, '消毒剂') > 0) {
      removeItem(p.inventory, '消毒剂', 1);
      amt *= 0.45;
      addLog('你立刻用消毒剂处理了伤口。', 'good');
    }
    gainInfection(amt, kind);
  }
}

function treatWound(itemId) {
  const p = S.player;
  const untreated = p.wounds.filter(w => !w.treated);
  if (!untreated.length) return addLog('你没有需要处理的伤口。', 'info');
  const it = ITEMS[itemId];
  const target = untreated.sort((a, b) => b.sev - a.sev)[0];
  target.treated = true;
  p.health = clamp(p.health + (it.heal || 0), 0, 100);
  p.morale = clamp(p.morale + 4, 0, 100);
  if (p.skills.医疗) p.skills.医疗 = clamp(p.skills.医疗 + 1, 0, 100);
  addLog(`你处理了${target.kind}的伤口，感觉好多了。`, 'good');
  renderAll();
}

function painLevel(p) {
  return p.wounds.reduce((s, w) => s + (w.treated ? 0.5 : 1) * w.sev, 0);
}

/* ==================== 死亡 ==================== */

function die(reason) {
  if (S.world.flags.dead) return;
  S.world.flags.dead = true;
  addLog(`【死亡】${reason}`, 'bad');
  const p = S.player;
  const days = S.world.stat.daysSurvived;
  const d = S.world.day;
  const pop = S.base ? S.base.population.filter(n => n.alive).length : 0;
  let html = `<p class="narrative">你的名字是 <b>${escapeHtml(p.name)}</b>，一名${escapeHtml(p.profession)}。</p>`;
  html += `<p class="narrative">你从${d <= 0 ? '灾难来临前' : fmtTime(d)}活到了${fmtTime(d + 1)}，共存活 <b>${days}</b> 天，亲手击杀了 <b>${p.kills}</b> 个感染者。</p>`;
  html += `<p class="narrative">死因：${escapeHtml(reason)}</p>`;
  if (p.tags.length) html += `<p class="narrative">人们会如何评价你：${p.tags.map(t => '#' + t).join(' ')}</p>`;
  if (S.world.history.length) {
    html += `<p class="narrative" style="margin-top:12px;">这一世，世界记住了：</p><p class="narrative">${S.world.history.slice(-6).map(escapeHtml).join('<br>')}</p>`;
  }
  const foot = [];
  if (pop > 0 && !p.deathUsedInherit) {
    foot.push(`<button class="btn" onclick="inheritContinue()">以幸存者的身份继续</button>`);
  }
  if (p.deathMode === 'forgiving') {
    foot.push(`<button class="btn" onclick="loadDeathCheckpoint()">回到死亡前（回档）</button>`);
  }
  foot.push(`<button class="btn danger" onclick="confirmNewGame()">结束这一世，重新开始</button>`);
  openModal('☠ 死亡', html, foot.join(''));
}

function inheritContinue() {
  const pop = S.base.population.filter(n => n.alive);
  if (!pop.length) return;
  const chosen = pop[0];
  pop.splice(pop.indexOf(chosen), 1);
  const oldName = S.player.name;
  const p = {
    name: chosen.name,
    sex: chosen.sex,
    age: chosen.age,
    profession: chosen.profession,
    professionId: chosen.profId,
    deathMode: S.player.deathMode,
    health: clamp(chosen.health, 20, 100),
    stamina: 80, hunger: 15, thirst: 15, fatigue: 30, temp: 78, mental: 80, morale: chosen.morale,
    infection: 0, infectionControlled: false,
    immune: randInt(5, 30),
    skills: Object.assign({}, chosen.skills),
    wounds: [], effects: [],
    ability: null, abilityMode: 'none', abilityUses: 0, abilityLevel: 0,
    money: 0,
    inventory: {},
    weapon: null,
    tags: [],
    kills: 0,
    hungerDays: 0, thirstDays: 0
  };
  addItems(p.inventory, [['压缩饼干', 2], ['瓶装水', 2]], S.world.day);
  S.player = p;
  S.world.flags.dead = false;
  S.world.location = S.base.locId;
  addLog(`【继承】${oldName} 死了，但 ${chosen.name} 接过了活下去的责任。世界继续运转。`, 'sys');
  S.world.history.push(`${fmtTime(S.world.day)}：${oldName} 死亡，${chosen.name} 继承了他的遗志。`);
  closeModal();
  renderAll();
}

function loadDeathCheckpoint() {
  const data = loadFromStorage();
  if (data) {
    S = ensureSaveCompat(data);
    log = [];
    closeModal();
    addLog('【系统】你回到了死亡之前的那个清晨。', 'sys');
    renderAll();
  } else {
    toast('没有可用的回档存档。');
  }
}

function confirmNewGame() {
  openModal('重新开始', '<p class="narrative">这一世的一切都将被抹去。确定要结束它吗？</p>',
    '<button class="btn danger" onclick="wipeAndReturn()">确定，重新开始</button><button class="btn" onclick="closeModal()">继续这一世</button>');
}

function wipeAndReturn() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
  S = null;
  log = [];
  closeModal();
  showTitle();
}

/* ==================== 时间推进 ==================== */

function weatherTarget() {
  const w = WEATHER_DEFS[S.world.weather];
  let base = 76;
  base += SEASONS[seasonOf(S.world.day)].temp;
  if (S.base && S.base.locId === S.world.location && countInv(S.base.inv, '燃油') >= 0) base += 6;
  return clamp(base + w.temp, 0, 100);
}

function advancePhase(n) {
  if (n === undefined) n = 1;
  maybeAdventure();
  const p = S.player;
  for (let i = 0; i < n; i++) {
    S.world.phase++;
    compostTick();
    // 每阶段基础消耗
    const w = WEATHER_DEFS[S.world.weather];
    const outdoor = !S.base || S.base.locId !== S.world.location;
    const season = seasonOf(S.world.day);
    p.hunger = clamp(p.hunger + (4.2 + (w.name === '酷热' ? 1 : 0) + (season === 'winter' ? 0.8 : 0)), 0, 100);
    p.thirst = clamp(p.thirst + (5.0 + (w.name === '酷热' || season === 'summer' ? 1.5 : 0)), 0, 100);
    p.fatigue = clamp(p.fatigue + (outdoor ? 1.8 : 0.8) + painLevel(p) * 0.4, 0, 100);
    p.stamina = clamp(p.stamina - (outdoor ? 1.4 : 0.7) - painLevel(p) * 0.3, 0, 100);
    const target = weatherTarget();
    p.temp = clamp(p.temp + (target - p.temp) * 0.12, 0, 100);
    if (p.temp <= 30) p.health = clamp(p.health - 1.5, 0, 100);
    if (p.temp >= 88) { p.health = clamp(p.health - 1, 0, 100); p.thirst = clamp(p.thirst + 2, 0, 100); }
    if (p.mental <= 50) p.morale = clamp(p.morale - 0.4, 0, 100);
    if (S.world.phase >= 4) {
      S.world.phase -= 4;
      newDay();
    }
    // 饥饿/口渴致命检查
    if (p.hunger >= 100) {
      p.hungerDays++;
      p.health = clamp(p.health - 7, 0, 100);
      addLog('你已经饿得快要撑不住了……', 'bad');
      if (p.hungerDays >= 3) return die('长期的饥饿夺走了你的生命。');
    } else p.hungerDays = 0;
    if (p.thirst >= 100) {
      p.thirstDays++;
      p.health = clamp(p.health - 9, 0, 100);
      addLog('严重缺水让你的身体迅速崩溃。', 'bad');
      if (p.thirstDays >= 2) return die('严重脱水夺走了你的生命。');
    } else p.thirstDays = 0;
    if (p.health <= 0) return die('你的身体再也撑不住了。');
    if (p.stamina <= 0) {
      p.fatigue = clamp(p.fatigue + 8, 0, 100);
      p.health = clamp(p.health - 2, 0, 100);
      addLog('体力完全透支，你几乎要晕过去。', 'warn');
    }
  }
  renderAll();
}

/* ==================== 新的一天 ==================== */

function rollWeather() {
  S.world.weatherLeft--;
  if (S.world.weatherLeft <= 0) {
    const stage = stageIndex(S.world.day);
    const season = seasonOf(S.world.day);
    const pool = ['clear', 'cloudy', 'rain'];
    if (stage >= 2) pool.push('storm');
    if (season === 'summer') pool.push('heat', 'heat');
    if (season === 'winter') pool.push('snow', 'cold', 'snow');
    if (stage >= 3 && season !== 'summer') pool.push('snow', 'cold');
    const candidates = pool.filter(w => w !== S.world.weather || chance(0.3));
    S.world.weather = pick(candidates.length ? candidates : pool);
    S.world.weatherLeft = randInt(1, 3);
    addLog(`天气转为【${WEATHER_DEFS[S.world.weather].name}】。${WEATHER_DEFS[S.world.weather].desc}`, 'info');
  }
}

function spoilTick(inv, powered) {
  for (const [id, st] of Object.entries(inv)) {
    const def = ITEMS[id];
    if (!def.spoil || st.spoil === null) continue;
    if (powered) continue;
    st.spoil--;
    if (st.spoil <= 0) {
      const n = st.n;
      delete inv[id];
      if (inv['变质食品']) inv['变质食品'].n += n;
      else inv['变质食品'] = { n, spoil: null };
    }
  }
}

function zombieDrift() {
  const factor = stageFactor(S.world.day);
  const densityMult = 1 + (S.world.flags.evo ? S.world.flags.evo.density : 0);
  for (const [id, loc] of Object.entries(S.world.locations)) {
    if (S.world.day <= 0) {
      loc.danger = 0; loc.zombieCount = 0;
      continue;
    }
    const def = LOC_DEFS[id];
    loc.zombieCount = Math.round(loc.zombieCount * rand(0.88, 1.14));
    const target = def.baseDanger * factor * densityMult * rand(4, 7);
    loc.zombieCount += (target - loc.zombieCount) * 0.08;
    loc.zombieCount = Math.max(0, loc.zombieCount);
    loc.danger = clamp(loc.zombieCount / 6, 0, 10);
  }
}

function dailyInfectionTick() {
  const p = S.player;
  if (p.infection <= 0 || p.infectionControlled) return;
  let growth = 2.2 + rand(0, 2.6);
  if (p.effects.includes('antibiotic')) {
    growth -= 9;
    addLog('抗生素压制了体内的病毒。', 'good');
  }
  if (p.ability === 'heal') growth *= 0.6;
  if (S.base && S.base.locId === S.world.location && hasFacility('medbay')) {
    const medic = S.base.population.filter(n => n.alive && n.role === 'medic').length;
    if (medic > 0) {
      growth *= 0.65;
      addLog('医务室的治疗延缓了感染。', 'good');
    }
  }
  growth *= clamp(1 - p.immune / 140, 0.72, 1);
  p.infection = clamp(p.infection + growth, 0, 100);
  if (p.infection > 0) addLog(`感染在体内蔓延（当前 ${Math.round(p.infection)}%）。`, 'bad');
  if (p.infection >= 100) return die('病毒彻底侵蚀了你的身体，你变成了它们的一员。');
  if (p.infection < 18 && p.immune > 45 && chance(0.12)) {
    p.infectionControlled = true;
    addLog('奇迹般地，你的身体压制住了病毒。感染暂时稳定了下来。', 'good');
    S.world.history.push(`${fmtTime(S.world.day)}：${p.name} 控制住了体内的感染。`);
  }
}

function dailyWoundTick() {
  const p = S.player;
  let drained = false;
  for (const w of p.wounds) {
    if (!w.treated) {
      p.health = clamp(p.health - w.sev * 1.1, 0, 100);
      drained = true;
    }
  }
  if (drained) addLog('未处理的伤口仍在恶化。', 'bad');
  if (p.health <= 0) return die('伤势过重，你没能熬过这个夜晚。');
}

function dailyAbilityTick() {
  const p = S.player;
  if (p.ability === 'heal') {
    p.health = clamp(p.health + 5, 0, 100);
    p.wounds.forEach(w => { if (!w.treated && S.world.day - w.day > 2) w.treated = true; });
  }
  if (p.ability === 'calm') {
    p.mental = clamp(p.mental + 2, 0, 100);
    p.morale = clamp(p.morale + 1, 0, 100);
  }
  // 尚未觉醒：在危机与时间的催化下，可能突然觉醒
  if (p.abilityMode === 'latent' && S.world.day > 0 && chance(0.018 + stageIndex(S.world.day) * 0.006)) {
    p.ability = pick(Object.keys(ABILITIES));
    p.abilityLevel = 1;
    p.abilityMode = 'awakened';
    addLog(`生死之间，你的身体突然发生了变化——你觉醒了【${ABILITIES[p.ability].name}】！`, 'sys');
    S.world.history.push(`${fmtTime(S.world.day)}：${p.name} 觉醒了异能【${ABILITIES[p.ability].name}】。`);
  }
  if (p.ability && p.abilityUses >= p.abilityLevel * 4 && p.abilityLevel < 6) {
    p.abilityLevel++;
    p.abilityUses = 0;
    addLog(`你对【${ABILITIES[p.ability].name}】的理解更深了（${'I'.repeat(p.abilityLevel)}级）。`, 'good');
  }
}

function newDay() {
  S.world.day++;
  const p = S.player;
  S.world.stat.daysSurvived++;
  rollWeather();
  zombieDrift();
  dailyInfectionTick();
  if (S.world.flags.dead) return renderAll();
  p.effects = [];
  dailyWoundTick();
  if (S.world.flags.dead) return renderAll();
  dailyAbilityTick();
  if (S.base) baseDaily();
  if (S.base) farmDailyTick();
  if (S.base) ranchDailyTick();
  const powered = hasFacility('generator') && S.base && !!S.base.power && countInv(S.base.inv, '燃油') > 0;
  spoilTick(p.inventory, false);
  if (S.base) spoilTick(S.base.inv, powered);
  specialNpcDaily();
  mechanicAutoRepair();
  taskDailyTick();
  npcRadioInbound();
  checkEvoMilestones();
  factionGifts();
  rollWorldEvents();
  stageNews();
  checkAch();
  checkEndings();
  autosave();
  renderAll();
}

function checkEvoMilestones() {
  const evo = S.world.flags.evo;
  if (!evo) return;
  const next = EVO_WAVES.filter(w => S.world.day >= w.day && w.level > evo.level)[0];
  if (!next) return;
  evo.level = next.level;
  evo.density += next.density || 0;
  if (next.war) S.world.flags.warStarted = true;
  if (next.horde) S.world.flags.hordeNext = S.world.day + randInt(60, 90);
  addLog(`【世界】${next.name}：${next.desc}`, 'bad');
  S.world.history.push(`${fmtTime(S.world.day)}：世界进入${next.name}。`);
  openModal(`🧟 ${next.name}`,
    `<div class="narrative">${next.desc}</div>${next.horde ? '<p class="narrative" style="margin-top:8px;">尸潮的季节开始了。加固你的基地。</p>' : ''}`,
    '<button class="btn" onclick="closeModal()">明白</button>');
}

function factionGifts() {
  const f = S.world.flags.factionJoined;
  if (!f || S.world.day % 15 !== 0) return;
  const gifts = {
    military: { items: [['步枪弹', 12], ['绷带', 3]], name: '军方' },
    caravan: { items: [['罐头', 4], ['瓶装水', 4]], name: '商队' },
    raiders: { items: [['罐头', 3], ['燃油', 2]], name: '掠夺者' },
    church: { items: [['蔬菜', 3], ['净水', 3]], name: '守望者' },
    corp: { items: [['抗生素', 2], ['维生素', 2]], name: '企业避难所' }
  };
  const g = gifts[f];
  if (!g) return;
  const inv = S.base ? S.base.inv : S.player.inventory;
  for (const [id, n] of g.items) addItem(inv, id, n);
  addLog(`【阵营】${g.name}送来了补给：${g.items.map(x => `${itemName(x[0])}×${x[1]}`).join('、')}。`, 'good');
}

function checkAch() {
  const p = S.player;
  const pop = S.base ? S.base.population.filter(n => n.alive).length : 0;
  if (S.world.stat.daysSurvived >= 7) unlockAch('d7');
  if (S.world.stat.daysSurvived >= 30) unlockAch('d30');
  if (S.world.day >= 366) unlockAch('d365');
  if (S.world.stat.kills >= 1) unlockAch('k1');
  if (S.world.stat.kills >= 100) unlockAch('k100');
  if (S.base) unlockAch('base');
  if (pop >= 10) unlockAch('recruit10');
  if (pop >= 60) unlockAch('city');
  if (S.world.specialNpcs.every(n => n.met || n.recruited)) unlockAch('npcall');
  if (Object.keys(S.world.flags.arcs).length >= 10) unlockAch('arc10');
  if (S.world.flags.cure && S.world.flags.cure.choice) unlockAch('cure');
  if (S.world.vehicle) unlockAch('car');
  if (p.money >= 200000) unlockAch('tycoon');
  if (S.world.flags.endingsAchieved.length >= 3) unlockAch('end3');
  if (S.world.flags.endingsAchieved.length >= ENDINGS.length) unlockAch('endall');
  if (p.ability) unlockAch('ability');
}

function stageNews() {
  const stage = stageIndex(S.world.day);
  const news = [
    ['网络上有零星传言：多地出现“狂犬病人”伤人的消息，官方称正在调查。', '城市一切照旧，只是救护车的警笛声越来越频繁。'],
    ['【紧急广播】多地出现暴乱，官方建议居民不要外出，囤积食物与饮水。', '军方已经接管了部分城区，街上不时传来枪声。'],
    ['【广播】国家进入紧急状态，电网与通讯开始中断。', '自来水断断续续，超市已经被人群搬空。'],
    ['【短波电台】“如果你还能听到这段话……不要相信任何自称政府的人。”', '各大势力的电台开始争夺频道，世界正在割裂。'],
    ['【地下电台】粮食、药品与燃油成为硬通货，货币正在失去意义。', '有传闻说南边出现了成建制的幸存者武装。'],
    ['【短波】越来越多的目击者称，出现了从未见过的“变异体”。', '旧日的规则正在失效，新的秩序缓慢成形。'],
    ['【广播】几个大型聚落宣布结盟，承诺恢复农业与贸易。', '孩子们重新坐进了教室，文明的火种没有熄灭。'],
    ['【电台】新成立的联合政府呼吁各地幸存者前往登记。', '人类与尸群形成了新的边界，世界进入未知的新时代。']
  ];
  if (stage >= 1 && stage !== S.world.stageNewsIdx) {
    S.world.stageNewsIdx = stage;
    addLog(`【世界】${pick(news[stage - 1])}`, 'warn');
    S.world.history.push(`${fmtTime(S.world.day)}：世界进入${WORLD_STAGES[stage].name}。`);
  }
}

/* ==================== 出行与侦察 ==================== */

function travelCost(locId) {
  const from = S && S.world && S.world.location ? LOC_DEFS[S.world.location] : null;
  const def = LOC_DEFS[locId];
  const cross = from && from.city !== def.city ? 2 : 0;
  const extra = WEATHER_DEFS[S.world.weather].travel;
  return clamp(def.travel + cross + extra, 1, 4);
}

function travelTo(locId) {
  if (locId === S.world.location) { toast('你已经在这里了。'); return; }
  const def = LOC_DEFS[locId];
  const p = S.player;
  let cost = travelCost(locId);
  let driving = false;
  if (S.world.vehicle && S.world.vehicle.fuel > 0) {
    driving = true;
    cost = 1;
  }
  if (p.stamina < cost * 4) { toast('你太累了，没有力气走这么远。'); return; }
  if (carryWeightOK() === false) { toast('背包太重，行动迟缓，先处理掉一些东西吧。'); return; }
  const from = S.world.location;
  if (driving) {
    const v = S.world.vehicle;
    const cross = LOC_DEFS[from].city !== def.city;
    const use = Math.round(5 + WEATHER_DEFS[S.world.weather].travel * 0.5 + rand(0, 4) + (cross ? 6 : 0));
    v.fuel = Math.max(0, v.fuel - use);
    S.world.locations[from].danger = clamp(S.world.locations[from].danger + randInt(1, 2), 0, 10);
    S.world.locations[locId].danger = clamp(S.world.locations[locId].danger + randInt(1, 3), 0, 10);
    if (v.cond < 50 ? chance(0.16) : chance(0.03)) {
      const mechanics = S.base ? S.base.population.filter(n => n.alive && (n.role === 'follower' || n.role === 'repair') && n.ability === 'mechanic') : [];
      if (mechanics.length) {
        v.cond = clamp(v.cond + 10, 0, 100);
        addLog(`车在半路抛锚了，但${mechanics[0].name} 三两下就把它修好了。`, 'good');
      } else {
        v.cond = Math.max(0, v.cond - randInt(15, 30));
        addLog('车在半路抛锚了。你捣鼓了半天才重新打着火。', 'bad');
      }
    } else {
      addLog(`你开车前往【${def.name}】。引擎声在废墟里传出很远。`, 'info');
    }
    p.skills.驾驶 = clamp(p.skills.驾驶 + 0.5, 0, 100);
  } else {
    addLog(`你前往【${def.name}】。`, 'info');
  }
  S.world.location = locId;
  npcVisitProgress(locId);
  taskVisitProgress(locId);
  checkAutoTurnIn(locId);
  p.stamina = clamp(p.stamina - (driving ? 2 : cost * 4), 0, 100);
  p.fatigue = clamp(p.fatigue + (driving ? 1 : cost * 3), 0, 100);
  advancePhase(cost);
  if (S.world.flags.dead) return;
  // 跟随者：离开基地时从仓库带口粮，途中消耗，回基地后清空随身
  const followers = S.base ? S.base.population.filter(n => n.alive && n.role === 'follower') : [];
  if (followers.length) {
    if (S.base && S.base.locId === from) followers.forEach(n => npcPackForTrip(n, Math.max(1, Math.round(cost / 4))));
    followers.forEach(n => npcConsumeTrip(n));
    if (S.base && S.base.locId === locId) followers.forEach(n => npcReturnToBase(n));
  }
  const loc = S.world.locations[locId];
  const w = WEATHER_DEFS[S.world.weather];
  let encChance = clamp(loc.danger / 11 + (S.world.phase === 3 ? 0.15 : 0) + w.danger * 0.01, 0.05, 0.9);
  if (p.ability === 'danger' && loc.danger >= 1) {
    addLog('危险感知提醒你：附近有感染者活动的痕迹。', 'warn');
    encChance += 0.05; // 提前警觉，绕开的成功率会更高
  }
  if (loc.zombieCount > 0 && chance(encChance)) {
    startEncounter(locId, { origin: from, surprise: chance(0.25) });
    return;
  }
  if (loc.survivors.length) {
    startHumanEncounter(locId, from);
    return;
  }
  renderAll();
}

function carryWeightOK() {
  return totalWeight(S.player.inventory) <= carryCap(S.player) * 1.35;
}

function scoutArea() {
  const p = S.player;
  if (p.stamina < 4) { toast('太累了，无法集中精神侦察。'); return; }
  p.stamina = clamp(p.stamina - 4, 0, 100);
  p.skills.潜行 = clamp(p.skills.潜行 + 1, 0, 100);
  const cur = S.world.locations[S.world.location];
  let info = [];
  const nearby = Object.entries(S.world.locations).filter(([id]) => LOC_DEFS[id].travel <= 2);
  for (const [id, loc] of nearby) {
    const def = LOC_DEFS[id];
    const z = loc.zombieCount;
    let zt = z === 0 ? '没有丧尸的痕迹' : z < 5 ? `零星的丧尸（约${z}）` : z < 12 ? `成群的丧尸（约${z}）` : `大群丧尸（约${z}）`;
    if (p.ability === 'danger') zt = `精确感知：约 ${z} 只丧尸`;
    info.push(`<b>${def.name}</b>：${zt}${loc.survivors.length ? '，有幸存者活动的迹象' : ''}${specialText(def) ? '，' + specialText(def) : ''}`);
  }
  addLog(`你观察了周围的情况。`, 'info');
  advancePhase(1);
  openModal('🔍 侦察结果', `<div class="narrative">${info.map(i => `<p>${i}</p>`).join('')}</div>`, '<button class="btn" onclick="closeModal()">明白</button>');
}

/* ==================== 搜刮 ==================== */

function scavenge() {
  const loc = S.world.locations[S.world.location];
  const p = S.player;
  const def = LOC_DEFS[S.world.location];
  if (p.stamina < 6) { toast('你太累了，搜不动了。'); return; }
  p.stamina = clamp(p.stamina - 6, 0, 100);
  p.fatigue = clamp(p.fatigue + 3, 0, 100);
  S.world.stat.scavenges++;
  loc.searched++;
  advancePhase(1);
  if (S.world.flags.dead) return;

  const found = [];
  const cats = Object.keys(loc.loot).filter(c => loc.loot[c] > 0);
  const catWeights = cats.map(c => [c, Math.max(1, loc.loot[c])]);
  const n = 1 + (chance(0.25 + p.skills.搜索 * 0.004) ? 1 : 0) + (chance(0.08) ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const cat = weightPick(catWeights);
    const itemId = weightPick(LOOT_POOLS[cat]);
    let qty = 1;
    if (itemId === '现金') { const m = rollCash(); p.money += m; found.push(`现金¥${m}`); continue; }
    if (itemId === '手枪弹' || itemId === '步枪弹') qty = randInt(4, 12);
    if (itemId === '手枪') { addItem(p.inventory, '手枪弹', randInt(4, 10)); found.push('手枪 + 少量子弹'); }
    else if (itemId === '步枪') { addItem(p.inventory, '步枪弹', randInt(3, 8)); found.push('步枪 + 少量子弹'); }
    else { addItem(p.inventory, itemId, qty); found.push(`${itemName(itemId)}×${qty}`); }
  }
  // 地区特产
  if (def.special && SPECIAL_POOLS[def.special] && chance(0.35)) {
    const spId = weightPick(SPECIAL_POOLS[def.special]);
    const sq = (spId === '鸡' || spId === '牛' || spId === '羊') ? 1 : (spId === '种子' ? randInt(1, 2) : randInt(1, 2));
    addItem(p.inventory, spId, sq);
    found.push(`特产·${itemName(spId)}×${sq}`);
  }
  // 现金是通用物资，任何地区都可能翻到
  if (chance(0.4)) {
    const m = rollCash();
    p.money += m;
    found.push(`现金¥${m}`);
  }
  addLog(`你在【${def.name}】搜到了：${found.join('、')}。`, 'good');
  if (p.skills.搜索) p.skills.搜索 = clamp(p.skills.搜索 + 1, 0, 100);

  // 搜刮的动静可能引来丧尸
  if (loc.danger > 0.8 && chance(clamp(loc.danger / 16, 0.05, 0.45))) {
    addLog('翻找东西的声音惊动了附近的丧尸……', 'bad');
    startEncounter(S.world.location, { origin: S.world.location, surprise: chance(0.35) });
    return;
  }
  renderAll();
}

function specialText(def) {
  if (!def || !def.special || !SPECIAL_POOLS[def.special]) return '';
  const names = SPECIAL_POOLS[def.special].slice(0, 3).map(e => itemName(e[0])).join('、');
  return `特产：${names}等`;
}

/* ==================== 遭遇系统 ==================== */

let ENC = null;

function rollEncounterGroups(loc) {
  const stage = stageIndex(S.world.day);
  const evo = S.world.flags.evo ? S.world.flags.evo.level : 0;
  const total = clamp(Math.round(loc.zombieCount * rand(0.6, 1.2)), 1, 6 + stage * 2);
  const pool = Object.entries(ZOMBIES).filter(([, z]) => z.stage <= stage && z.evo <= evo).map(([id, z]) => [id, z.w]);
  const groups = {};
  for (let i = 0; i < total; i++) {
    const t = weightPick(pool);
    if (!groups[t]) groups[t] = { type: t, count: 0, hp: 0 };
    groups[t].count++;
    groups[t].hp += ZOMBIES[t].hp;
  }
  return Object.values(groups).sort((a, b) => ZOMBIES[b.type].spd - ZOMBIES[a.type].spd);
}

function startEncounter(locId, opts) {
  const loc = S.world.locations[locId];
  ENC = {
    locId,
    origin: (opts && opts.origin) || locId,
    groups: rollEncounterGroups(loc),
    noise: 0,
    round: 0,
    surprise: !!(opts && opts.surprise),
    fleeing: false
  };
  showEncounterModal(false);
}

function encounterNarrative() {
  const gs = ENC.groups.map(g => `${ZOMBIES[g.type].name}×${g.count}`).join('、');
  return `<p class="narrative">${ENC.surprise ? '毫无预兆地，' : ''}你撞上了${gs}。空气里满是腐烂的气味。</p>`;
}

function showEncounterModal(afterRound) {
  if (typeof document !== 'undefined') { renderStatus(); renderHud(); }
  const foot = [];
  if (!afterRound && ENC.round === 0) {
    foot.push('<button class="choice" onclick="encounterChoice(\'stealth\')"><span class="t">🥷 潜行绕开</span><span class="d">屏住呼吸，借地形避开它们。失败会被围攻。</span></button>');
    foot.push('<button class="choice" onclick="encounterChoice(\'fight\')"><span class="t">⚔ 正面迎战</span><span class="d">正面击退它们，但战斗会制造噪音，引来更多。</span></button>');
  } else {
    foot.push('<button class="choice" onclick="encounterChoice(\'fight\')"><span class="t">⚔ 继续攻击</span><span class="d">你已经无路可退，只能战斗。</span></button>');
  }
  foot.push('<button class="choice" onclick="encounterChoice(\'flee\')"><span class="t">🏃 转身逃跑</span><span class="d">拼速度撤离，可能被追上咬伤。</span></button>');
  openModal('⚠ 遭遇丧尸', `<div id="encStatus">${encounterNarrative()}${encounterStatusHtml()}</div>`, foot.join(''), false);
}

function encounterStatusHtml() {
  if (!ENC) return '';
  const p = S.player;
  const w = currentWeapon(p);
  const ammoText = w.cat === 'gun' ? ` · 弹药 ${countInv(p.inventory, w.ammo)}` : '';
  const followers = S.base ? S.base.population.filter(n => n.alive && n.role === 'follower') : [];
  const mobs = ENC.groups.map(g => {
    const z = ZOMBIES[g.type];
    const full = g.count * z.hp;
    const pct = full > 0 ? clamp(Math.round((g.hp || full) / full * 100), 0, 100) : 0;
    return `<div class="mob">
      <div class="mob-top"><span>${ZOMBIE_EMOJI[g.type] || '🧟'} ${z.name}</span><span>×${g.count}</span></div>
      <div class="bar"><div class="fill bad" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  const feed = (ENC.battleLog || [])
    .filter(l => l.cls !== 'sys' && !String(l.text).startsWith('【人生】'))
    .slice(-5)
    .map(l => `<div class="battle-line ${l.cls}">${escapeHtml(l.text)}</div>`).join('');
  const noiseBar = '▰'.repeat(Math.min(10, Math.round(ENC.noise))) + '▱'.repeat(Math.max(0, 10 - Math.round(ENC.noise)));
  return `<div class="battle">
    <div class="battle-side">
      <div class="battle-title">🧟 敌人 ${ENC.surprise ? '· 突袭！' : ''}</div>
      ${mobs}
      <div class="row" style="margin-top:6px;"><span class="k">噪音</span><span class="v" style="color:${ENC.noise >= 8 ? 'var(--bad)' : 'var(--warn)'};">${noiseBar}</span></div>
    </div>
    <div class="battle-side">
      <div class="battle-title">🛡 ${escapeHtml(p.name)}</div>
      <div class="mob">
        <div class="mob-top"><span>生命</span><span>${Math.round(p.health)} / 100</span></div>
        <div class="bar"><div class="fill hp" style="width:${clamp(p.health, 0, 100)}%"></div></div>
      </div>
      <div class="row"><span class="k">武器</span><span class="v">${escapeHtml(w.name)}${ammoText}</span></div>
      ${followers.length ? `<div class="battle-title" style="margin-top:8px;">🤝 并肩作战</div>` + followers.map(f =>
        `<div class="row"><span class="k">${f.sex === '男' ? '🧔' : '👩'} ${escapeHtml(f.name)}</span><span class="v">${npcWeaponName(f)} · HP ${Math.round(f.health)}</span></div>`).join('') : ''}
    </div>
    ${feed ? `<div class="battle-feed">${feed}</div>` : ''}
  </div>`;
}

function stealthCheck() {
  const p = S.player;
  const maxPerc = Math.max(...ENC.groups.map(g => ZOMBIES[g.type].perc));
  let c = 0.48 + p.skills.潜行 * 0.0035;
  c -= maxPerc * 0.06;
  if (S.world.phase === 3) c -= 0.1;
  if (WEATHER_DEFS[S.world.weather].name.includes('雨')) c += 0.12;
  if (p.ability === 'danger') { c += 0.12; p.abilityUses++; }
  return clamp(c, 0.08, 0.92);
}

function fleeCheck() {
  const p = S.player;
  const maxSpd = Math.max(...ENC.groups.map(g => ZOMBIES[g.type].spd));
  let c = 0.5 + (p.stamina / 100) * 0.18 + p.skills.潜行 * 0.001;
  c -= maxSpd * 0.07 - (p.fatigue / 100) * 0.15;
  return clamp(c, 0.1, 0.9);
}

function encounterChoice(choice) {
  if (!ENC) return;
  if (ENC.human) { humanChoice('talk'); return; }
  const p = S.player;
  if (choice === 'stealth') {
    advancePhase(1);
    if (S.world.flags.dead) return;
    if (chance(stealthCheck())) {
      addLog('你屏住呼吸，贴着墙根缓缓移动，最终没有惊动它们。', 'good');
      p.skills.潜行 = clamp(p.skills.潜行 + 2, 0, 100);
      addTag('谨慎');
      clearEncounter();
    } else {
      ENC.surprise = true;
      addLog('你的动作惊动了它们——它们朝你扑了过来！', 'bad');
      showEncounterModal(true);
    }
    return;
  }
  if (choice === 'flee') {
    advancePhase(1);
    if (S.world.flags.dead) return;
    if (chance(fleeCheck())) {
      addLog('你甩开脚步狂奔，把它们远远抛在了身后。', 'good');
      p.skills.潜行 = clamp(p.skills.潜行 + 1, 0, 100);
      const back = ENC.origin;
      clearEncounter();
      S.world.location = back;
      addLog(`你回到了【${LOC_DEFS[back].name}】。`, 'info');
    } else {
      addLog('你没能跑掉，被它们截住了！', 'bad');
      zombieAttack(0.6);
      if (S.world.flags.dead) return;
      showEncounterModal(true);
    }
    return;
  }
  if (choice === 'fight') {
    addTag('求生者');
    fightRound();
  }
}

function playerDamageRoll() {
  const p = S.player;
  const w = currentWeapon(p);
  let dmg;
  let noise = 0;
  if (w.cat === 'gun') {
    const shots = w.burst || 1;
    if (countInv(p.inventory, w.ammo) < shots) {
      addLog('没有子弹了！你只能用枪托砸。', 'bad');
      dmg = 8 * rand(0.7, 1.2);
    } else {
      removeItem(p.inventory, w.ammo, shots);
      dmg = w.dmg * (0.5 + p.skills.远程 * 0.004) * rand(0.75, 1.25);
      if (w.burst) dmg *= 1.6;
      noise = w.noise;
      p.skills.远程 = clamp(p.skills.远程 + 0.5, 0, 100);
      addLog(`你扣动扳机，枪声在废墟间回荡（用掉了 ${shots} 发子弹）。`, 'warn');
    }
  } else {
    dmg = w.dmg * (0.5 + p.skills.近战 * 0.004 + (p.ability === 'strength' ? 0.15 + p.abilityLevel * 0.04 : 0)) * rand(0.72, 1.2);
    noise = (w.noise || 0) * 0.5;
    p.skills.近战 = clamp(p.skills.近战 + 0.5, 0, 100);
    if (p.weapon && ITEMS[p.weapon].dur) {
      p.weaponDur = (p.weaponDur === undefined ? ITEMS[p.weapon].dur : p.weaponDur) - 1;
      if (p.weaponDur <= 0) {
        removeItem(p.inventory, p.weapon, 1);
    addLog(`你的【${itemName(p.weapon)}】在战斗中折断了！`, 'bad');
        p.weapon = null;
      }
    }
  }
  if (p.fatigue > 70) dmg *= 0.72;
  if (p.stamina < 25) dmg *= 0.68;
  if (painLevel(p) > 3) dmg *= 0.8;
  ENC.noise += noise;
  if (p.ability === 'strength') p.abilityUses++;
  return dmg;
}

function fightRound() {
  if (!ENC || !ENC.groups || !ENC.groups.length) { clearEncounter(); return; }
  const p = S.player;
  ENC.round++;
  if (ENC.round === 1 && ENC.surprise) {
    addLog('你被打了个措手不及！', 'bad');
  } else {
    // 玩家攻击：优先攻击速度最快的威胁
    const target = ENC.groups.slice().sort((a, b) => ZOMBIES[b.type].spd - ZOMBIES[a.type].spd)[0];
    const w = currentWeapon(p);
    const dmg = playerDamageRoll();
    const killed = attackGroup(target, dmg);
    if (killed > 0) {
      addLog(`你击倒了 ${killed} 只${ZOMBIES[target.type].name}。`, 'good');
      p.kills += killed;
      S.world.stat.kills += killed;
    } else {
      addLog(`你的攻击命中了${ZOMBIES[target.type].name}，但它仍在挣扎。`, 'info');
    }
    if (w.aoe && ENC.groups.length > 1) {
      const others = ENC.groups.filter(g => g !== target).slice(0, w.aoe);
      let splashKills = 0;
      for (const g of others) splashKills += attackGroup(g, dmg * 0.6);
      if (splashKills > 0) {
        addLog(`【溅射】余波又重创了 ${splashKills} 只丧尸！`, 'good');
        p.kills += splashKills;
        S.world.stat.kills += splashKills;
      }
    }
    ENC.groups = ENC.groups.filter(g => g.count > 0);
    if (ENC.groups.length) followerAssist();
  }

  if (!ENC.groups.length) {
    addLog('最后一只丧尸倒下了，四周重归寂静——但刚刚的动静，可能已经传得很远。', 'good');
    const loc = S.world.locations[ENC.locId];
    loc.zombieCount = Math.max(0, loc.zombieCount - Math.round(loc.zombieCount * 0.8));
    loc.danger = clamp(loc.danger - 5, 0, 10);
    // 枪声引来的后续尸群
    if (ENC.noise >= 8 && chance(0.5)) {
      loc.zombieCount += randInt(2, 5);
      loc.danger = clamp(loc.zombieCount / 6, 0, 10);
      addLog('果然，更多丧尸正朝枪声的方向汇聚而来。此地不宜久留。', 'warn');
    }
    const loot = rollCorpseLoot();
    if (loot) addLog(loot, 'good');
    clearEncounter();
    return;
  }

  zombieAttack(1);
  if (S.world.flags.dead) return;
  if (ENC.noise >= 10) {
    ENC.noise = 4;
    const extra = randInt(2, 4);
    if (ENC.groups.find(g => g.type === 'walker')) ENC.groups.find(g => g.type === 'walker').count += extra;
    else ENC.groups.push({ type: 'walker', count: extra, hp: extra * ZOMBIES.walker.hp });
    addLog('噪音引来了更多的丧尸！', 'bad');
  }
  showEncounterModal(true);
}

function attackGroup(g, dmg) {
  const hpEach = ZOMBIES[g.type].hp;
  const total = g.count * hpEach;
  const left = Math.max(0, total - dmg);
  g.count = Math.max(0, Math.floor(left / hpEach));
  g.hp = left;
  return Math.round((total - left) / hpEach) || 0;
}

function followerAssist() {
  if (!S.base || !ENC || !ENC.groups.length) return;
  const followers = S.base.population.filter(n => n.alive && n.role === 'follower');
  if (!followers.length) return;
  let dmg = 0;
  for (const f of followers) {
    const w = npcWeapon(f);
    const wd = w ? w.dmg : 4;
    dmg += wd * (0.5 + (f.skills.近战 + f.skills.远程) * 0.004) * (f.ability === 'strength' ? 1.3 : 1) * rand(0.7, 1.2);
  }
  const target = ENC.groups.slice().sort((a, b) => ZOMBIES[b.type].spd - ZOMBIES[a.type].spd)[0];
  const killed = attackGroup(target, dmg);
  ENC.groups = ENC.groups.filter(g => g.count > 0);
  const names = followers.map(f => f.name).join('、');
  if (killed > 0) {
    addLog(`${names} 与你并肩作战，又击倒了 ${killed} 只丧尸。`, 'good');
    S.player.kills += killed;
    S.world.stat.kills += killed;
  } else {
    addLog(`${names} 在旁协助你压制尸群。`, 'info');
  }
}

function npcWeapon(n) {
  return (n && n.weapon && ITEMS[n.weapon]) ? ITEMS[n.weapon] : null;
}

function npcWeaponName(n) {
  const w = npcWeapon(n);
  return w ? itemName(n.weapon) : '拳头';
}

function zombieAttack(mult) {
  const p = S.player;
  const stage = stageIndex(S.world.day);
  let hits = 0;
  let dodge = p.skills.潜行 * 0.001 + (p.ability === 'danger' ? 0.08 + p.abilityLevel * 0.01 : 0) + (p.stamina / 100) * 0.05;
  for (const g of ENC.groups) {
    const z = ZOMBIES[g.type];
    const hitChance = clamp(0.22 + z.perc * 0.03 + stage * 0.015 - dodge, 0.08, 0.7);
    hits += Math.round(g.count * hitChance * mult);
  }
  if (!hits) {
    addLog('你闪转腾挪，躲开了它们的扑咬。', 'good');
    if (p.ability === 'danger') p.abilityUses++;
    return;
  }
  let totalDmg = 0;
  let wounded = false;
  for (let i = 0; i < hits; i++) {
    const src = pick(ENC.groups);
    const z = ZOMBIES[src.type];
    const dmg = Math.max(2, z.dmg * rand(0.6, 1.3));
    totalDmg += dmg;
    if (!wounded && chance(0.2 + stage * 0.01)) {
      const kind = pick(['咬伤', '抓伤', '抓伤', '咬伤']);
      const sev = dmg > 14 ? 3 : dmg > 8 ? 2 : 1;
      addWound(kind, sev, chance(0.62));
      wounded = true;
    }
  }
  p.health = clamp(p.health - totalDmg, 0, 100);
  p.mental = clamp(p.mental - hits * 0.8, 0, 100);
  addLog(`你被击中了 ${hits} 次，生命 -${Math.round(totalDmg)}。`, 'bad');
  if (S.base && chance(0.12)) {
    const followers = S.base.population.filter(n => n.alive && n.role === 'follower');
    if (followers.length) {
      const f = pick(followers);
      f.health = clamp(f.health - randInt(6, 22), 0, 100);
      addLog(`${f.name} 在混战中也受了伤（生命 ${Math.round(f.health)}）。`, 'warn');
      if (f.health <= 0) {
        f.alive = false;
        addLog(`${f.name} 没能挺过这场战斗……`, 'bad');
      }
    }
  }
  if (p.health <= 0) die('你被丧尸撕成了碎片。');
}

function rollCorpseLoot() {
  const p = S.player;
  const roll = Math.random();
  if (roll < 0.28) {
    const id = pick(['罐头', '绷带', '现金', '瓶装水']);
    if (id === '现金') { const m = rollCash(); p.money += m; return `你在丧尸身上找到了一些现金（¥${m}）。`; }
    addItem(p.inventory, id, 1);
    return `你在尸体旁找到了【${id}】。`;
  }
  if (roll < 0.45) {
    const id = pick(['手枪弹', '消毒剂', '止痛药']);
    addItem(p.inventory, id, randInt(2, 5));
    return `你在尸体附近搜到了【${id}】。`;
  }
  return null;
}

function clearEncounter() {
  ENC = null;
  closeModal();
  renderAll();
}

/* ==================== 人类遭遇 ==================== */

function startHumanEncounter(locId, from) {
  const loc = S.world.locations[locId];
  const n = loc.survivors.length;
  const desc = loc.survivors.map(sv => `${sv.name}（${sv.profession}）`).join('、');
  const body = `<p class="narrative">你发现这里有 ${n} 名幸存者：${escapeHtml(desc)}。他们看起来既警惕又疲惫。</p>`;
  const foot = [
    '<button class="choice" onclick="humanChoice(\'talk\')"><span class="t">上前交谈</span><span class="d">释放善意，了解他们，或许能一起走。</span></button>',
    '<button class="choice" onclick="humanChoice(\'observe\')"><span class="t">保持距离观察</span><span class="d">先看清他们手里有什么、是否可信。</span></button>',
    '<button class="choice" onclick="humanChoice(\'leave\')"><span class="t">悄悄离开</span><span class="d">末世里，陌生人不一定都是朋友。</span></button>',
    '<button class="choice" onclick="humanChoice(\'rob\')"><span class="t">抢劫他们</span><span class="d">为了活下去，有时必须做坏人。</span></button>'
  ].join('');
  ENC = { locId, from, human: true };
  openModal('👥 遇到幸存者', body, foot);
}

function humanChoice(choice) {
  const loc = S.world.locations[ENC.locId];
  const p = S.player;
  if (choice === 'leave') {
    addLog('你压低身子，没有惊动任何人，悄悄离开了。', 'info');
    addTag('谨慎');
    S.world.location = ENC.from;
    clearEncounter();
    return;
  }
  if (choice === 'observe') {
    addLog('你在暗处观察了一会儿，大致摸清了他们的装备和人数。', 'info');
    p.skills.潜行 = clamp(p.skills.潜行 + 1, 0, 100);
    // 观察后仍可再选择
    const body = `<p class="narrative">他们一共 ${loc.survivors.length} 人，没有重武器，但有人握着一把砍刀。他们似乎也在提防着四周。</p>`;
    const foot = [
      '<button class="choice" onclick="humanChoice(\'talk\')"><span class="t">上前交谈</span></button>',
      '<button class="choice" onclick="humanChoice(\'leave\')"><span class="t">悄悄离开</span></button>',
      '<button class="choice" onclick="humanChoice(\'rob\')"><span class="t">抢劫他们</span></button>'
    ].join('');
    openModal('👥 观察幸存者', body, foot);
    return;
  }
  if (choice === 'talk') {
    const attitude = rand(0, 1) + p.skills.谈判 * 0.003 + (p.tags.includes('仁慈') ? 0.1 : 0);
    if (attitude < 0.38) {
      addLog('对方拒绝交流，举起了武器把你逼退。', 'bad');
      S.world.location = ENC.from;
      clearEncounter();
      return;
    }
    if (attitude < 0.68) {
      // 中立：交易或情报
      const info = pick([
        '他们说北郊工厂还有物资，但那里的丧尸很多。',
        '他们警告你：西边有一伙人专门抢劫落单的幸存者。',
        '他们说最近尸群正在向城南聚集，劝你别往那边去。',
        '他们提到军队残部在高速收费站附近建立了检查站。'
      ]);
      addLog('他们和你保持距离，交换了一点情报。', 'info');
      openModal('👥 幸存者', `<p class="narrative">对方看起来不算友好，但也没有敌意。他们告诉你：</p><p class="narrative">“${info}”</p>`,
        '<button class="btn" onclick="closeModal()">离开</button>');
      return;
    }
    // 友好
    const hasBase = !!S.base;
    const first = loc.survivors[0];
    if (hasBase) {
      const joinChance = 0.45 + p.skills.谈判 * 0.004 + (p.tags.includes('仁慈') ? 0.2 : 0);
      if (chance(joinChance)) {
        const sv = loc.survivors.shift();
        S.base.population.push(sv);
        S.world.stat.rescued++;
        addTag('仁慈');
        addLog(`【幸存者】${sv.name}（${sv.profession}）感激你的善意，决定跟你回基地。`, 'good');
        S.world.history.push(`${fmtTime(S.world.day)}：${p.name} 收留了幸存者 ${sv.name}。`);
      } else {
        addLog('他们感谢你的善意，但还不想把命运交给陌生人。临走前，他们分给你一点食物。', 'info');
        addItem(p.inventory, '罐头', 1);
        addTag('仁慈');
      }
    } else {
      addLog('他们没有跟你走——连你自己都还没有一个安全的落脚点。但他们分给你一点物资。', 'info');
      addItem(p.inventory, pick(['罐头', '压缩饼干', '瓶装水']), 1);
      addTag('仁慈');
    }
    clearEncounter();
    return;
  }
  if (choice === 'rob') {
    addTag('冷血');
    addTag('机会主义');
    openModal('⚠ 抢劫', `<p class="narrative">你决定先下手为强。对方似乎没想到你会突然发难。</p>`,
      '<button class="choice" onclick="humanRobbery()"><span class="t">动手</span><span class="d">末世没有怜悯。</span></button>' +
      '<button class="choice" onclick="humanChoice(\'leave\')"><span class="t">……还是算了</span><span class="d">你犹豫了。</span></button>');
  }
}

function humanRobbery() {
  const p = S.player;
  const loc = S.world.locations[ENC.locId];
  const n = loc.survivors.length;
  const followers = S.base ? S.base.population.filter(x => x.alive && x.role === 'follower').length : 0;
  const myPower = (p.skills.近战 + p.skills.远程) / 2 + (currentWeapon(p).dmg || 4) + followers * 6;
  const theirPower = rand(30, 60) + n * 8;
  advancePhase(1);
  if (myPower + rand(0, 25) >= theirPower) {
    const gain = [];
    for (const sv of loc.survivors) {
      const id = pick(['罐头', '压缩饼干', '瓶装水', '绷带', '现金']);
      if (id === '现金') p.money += randInt(100, 400);
      else addItem(p.inventory, id, 1);
      gain.push(id);
    }
    loc.survivors = [];
    S.world.stat.humansKilled += n;
    p.mental = clamp(p.mental - 12, 0, 100);
    p.morale = clamp(p.morale - 8, 0, 100);
    addLog(`你抢走了他们的物资（${gain.join('、')}），把他们赶走了。他们的眼神让你久久无法忘记。`, 'bad');
    S.world.history.push(`${fmtTime(S.world.day)}：${p.name} 在${LOC_DEFS[ENC.locId].name}抢劫了一群幸存者。`);
  } else {
    p.health = clamp(p.health - rand(25, 45), 0, 100);
    addWound(pick(['割伤', '骨折', '抓伤']), randInt(1, 3), false);
    addLog('他们比你想象中更难对付，你被打伤了，不得不撤退。', 'bad');
    if (p.health <= 0) return die('你在抢劫中被对方反杀。');
  }
  S.world.location = ENC.from;
  clearEncounter();
}

/* ==================== 标签（道德画像） ==================== */

function addTag(tag) {
  const p = S.player;
  if (!p.tags.includes(tag)) {
    p.tags.push(tag);
    addLog(`【人生】你的行为正在塑造别人眼中的你：#${tag}`, 'sys');
  }
}

/* ==================== 基地 ==================== */

function hasFacility(id) {
  return !!(S.base && S.base.facilities[id] === 'built');
}

function baseTier() {
  if (!S.base) return null;
  const pop = S.base.population.filter(n => n.alive).length;
  let tier = BASE_TIERS[0];
  for (const t of BASE_TIERS) if (pop >= t.pop) tier = t;
  return tier;
}

function establishBase() {
  const p = S.player;
  const loc = S.world.locations[S.world.location];
  if (S.base) { toast('你已经有一个基地了。'); return; }
  if (loc.danger >= 1.5 || loc.zombieCount > 2) { toast('这里不安全，先清理附近的丧尸，或换个地方。'); return; }
  const def = LOC_DEFS[S.world.location];
  S.base = {
    locId: S.world.location,
    name: `${def.name}·安全屋`,
    inv: {},
    facilities: {},
    buildQueue: [],
    defense: 3,
    morale: 55,
    population: [],
    power: false,
    powerWaiting: false,
    foundedDay: S.world.day,
    starveDays: 0,
    crops: [],
    livestock: [],
    compost: []
  };
  loc.zombieCount = 0;
  loc.danger = 0;
  addLog(`你在【${def.name}】建立了一个安全屋。从此，你有了一个可以回去的地方。`, 'good');
  S.world.history.push(`${fmtTime(S.world.day)}：${p.name} 在${def.name}建立了第一个安全屋。`);
  addTag('定居者');
  checkAch();
  advancePhase(1);
}

function canBuild(id) {
  const f = FACILITIES[id];
  if (!f || !S.base) return { ok: false, why: '需要先建立基地' };
  if (S.base.facilities[id] === 'built') return { ok: false, why: '已经建好了' };
  if (S.base.buildQueue.some(q => q.id === id)) return { ok: false, why: '正在建造中' };
  for (const [item, n] of Object.entries(f.req)) {
    if (countInv(S.base.inv, item) < n) return { ok: false, why: `缺少 ${item}×${n}` };
  }
  return { ok: true };
}

function buildFacility(id) {
  const check = canBuild(id);
  if (!check.ok) { toast(check.why); return; }
  const f = FACILITIES[id];
  for (const [item, n] of Object.entries(f.req)) removeItem(S.base.inv, item, n);
  S.base.buildQueue.push({ id, remaining: f.days });
  addLog(`【基地】开始建造${f.name}，预计 ${f.days} 天完成。`, 'info');
  advancePhase(1);
}

function buildProgressDaily() {
  const b = S.base;
  if (!b) return;
  for (const q of b.buildQueue) {
    const builders = 1 + b.population.filter(n => n.alive && (n.role === 'repair' || n.role === 'idle')).length * 0.3;
    q.remaining -= builders;
    if (q.remaining <= 0) {
      b.facilities[q.id] = 'built';
      addLog(`【基地】${FACILITIES[q.id].name}建成！`, 'good');
      S.world.history.push(`${fmtTime(S.world.day)}：基地建成了${FACILITIES[q.id].name}。`);
    }
  }
  S.base.buildQueue = S.base.buildQueue.filter(q => q.remaining > 0);
}

function depositItem(id, qty) {
  if (!S.base || S.base.locId !== S.world.location) { toast('回到基地才能存取物资。'); return; }
  const p = S.player;
  const cur = p.inventory[id];
  if (!cur || cur.n < qty) { toast('背包里没有这么多。'); return; }
  removeItem(p.inventory, id, qty);
  if (!S.base.inv[id]) S.base.inv[id] = { n: 0, spoil: ITEMS[id].spoil || null };
  const st = S.base.inv[id];
  if (ITEMS[id].spoil && st.spoil !== null && cur.spoil !== null) {
    st.spoil = Math.ceil((st.n * st.spoil + qty * cur.spoil) / Math.max(1, st.n + qty));
  }
  st.n += qty;
  addLog(`你把【${itemName(id)}】×${qty} 存进了基地仓库。`, 'info');
  renderAll();
}

function takeItem(id, qty) {
  if (!S.base || S.base.locId !== S.world.location) { toast('回到基地才能存取物资。'); return; }
  const p = S.player;
  const cur = S.base.inv[id];
  if (!cur || cur.n < qty) { toast('仓库里没有这么多。'); return; }
  const def = ITEMS[id];
  if (totalWeight(p.inventory) + def.weight * qty > carryCap(p) * 1.3) { toast('背包装不下这么多。'); return; }
  removeItem(S.base.inv, id, qty);
  if (!p.inventory[id]) p.inventory[id] = { n: 0, spoil: def.spoil || null };
  const st = p.inventory[id];
  if (def.spoil && st.spoil !== null && cur.spoil !== null) {
    st.spoil = Math.ceil((st.n * st.spoil + qty * cur.spoil) / Math.max(1, st.n + qty));
  }
  st.n += qty;
  addLog(`你从基地仓库取出了【${itemName(id)}】×${qty}。`, 'info');
  renderAll();
}

/* ==================== 饮食 / 药物 ==================== */

function consumeItem(inv, id, ownerLabel) {
  const def = ITEMS[id];
  if (!def) return;
  if (!removeItem(inv, id, 1)) { toast('没有这个物品。'); return; }
  const p = S.player;
  const eat = () => {
    if (def.rotten && chance(0.4)) {
      p.health = clamp(p.health - randInt(8, 18), 0, 100);
      p.morale = clamp(p.morale - 5, 0, 100);
      addLog('变质食物让你的胃一阵翻腾，你吐了出来。', 'bad');
    } else if (def.rotten) {
      addLog('你强忍着恶心吃下了变质的食物，勉强填了肚子。', 'warn');
    }
    p.hunger = clamp(p.hunger - (def.food || 0), 0, 100);
    p.thirst = clamp(p.thirst - (def.water || 0), 0, 100);
    p.stamina = clamp(p.stamina + (def.stamina || 0), 0, 100);
    p.morale = clamp(p.morale + (def.rotten ? 0 : 2), 0, 100);
    addLog(`你吃了【${itemName(id)}】。`, 'info');
    if (p.health <= 0) die('吃了变质的食物，你的身体彻底崩溃。');
  };
  const drink = () => {
    p.thirst = clamp(p.thirst - (def.water || 0), 0, 100);
    p.stamina = clamp(p.stamina + (def.stamina || 0), 0, 100);
    addLog(`你喝了【${itemName(id)}】。`, 'info');
  };
  if (def.cat === 'food') eat();
  else if (def.cat === 'drink') drink();
  renderAll();
}

function consumeFromBase(id) {
  if (!S.base) { toast('还没有基地。'); return; }
  consumeItem(S.base.inv, id);
}

function useMed(itemId) {
  const p = S.player;
  const def = ITEMS[itemId];
  if (!def || !removeItem(p.inventory, itemId, 1)) { toast('没有这个物品。'); return; }
  if (def.treatWound) {
    treatWound(itemId);
    return;
  }
  if (def.antibiotic) {
    p.effects.push('antibiotic');
    addLog('你服下了抗生素，感染被暂时压制。', 'good');
  }
  if (def.painkiller) {
    p.morale = clamp(p.morale + 5, 0, 100);
    p.mental = clamp(p.mental + 3, 0, 100);
    addLog('止痛药起效了，疼痛减轻了一些。', 'info');
  }
  if (def.immune) {
    p.immune = clamp(p.immune + 12, 0, 60);
    addLog('你服下维生素，感觉抵抗力有所提升。', 'good');
  }
  renderAll();
}

/* ==================== 休息 ==================== */

function rest() {
  const p = S.player;
  p.stamina = clamp(p.stamina + 42, 0, 100);
  p.fatigue = clamp(p.fatigue - 28, 0, 100);
  p.temp = clamp(p.temp + 5, 0, 100);
  p.mental = clamp(p.mental + 1.5, 0, 100);
  addLog('你停下来喘了口气，恢复了一些体力。', 'info');
  advancePhase(1);
  if (S.world.flags.dead) return;
  const loc = S.world.locations[S.world.location];
  const indoor = S.base && S.base.locId === S.world.location;
  if (!indoor && S.world.phase === 3 && loc.danger > 0 && chance(clamp(loc.danger / 12, 0.05, 0.4))) {
    addLog('夜色中，你听到了由远及近的拖沓脚步声……', 'bad');
    startEncounter(S.world.location, { origin: S.world.location, surprise: true });
  }
}

function sleep() {
  const p = S.player;
  if (p.fatigue < 25) { toast('你还不困。'); return; }
  const left = 4 - S.world.phase;
  const indoor = S.base && S.base.locId === S.world.location;
  p.stamina = clamp(p.stamina + 55, 0, 100);
  p.fatigue = clamp(p.fatigue - 45, 0, 100);
  p.health = clamp(p.health + (indoor ? 4 : 1), 0, 100);
  p.mental = clamp(p.mental + 4, 0, 100);
  p.temp = clamp(p.temp + (indoor ? 8 : 0), 0, 100);
  addLog(indoor ? '你在安全屋里安稳地睡了一觉。' : '你在不安中勉强睡着了。', 'info');
  if (!indoor && chance(0.18 + S.world.locations[S.world.location].danger * 0.03)) {
    addLog('你在睡梦中被惊醒了——有东西正在靠近！', 'bad');
    advancePhase(left);
    if (!S.world.flags.dead) startEncounter(S.world.location, { origin: S.world.location, surprise: true });
    return;
  }
  advancePhase(left);
}

/* ==================== 制作 ==================== */

function craftRecipe(id) {
  const p = S.player;
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;
  if (r.workshop && !hasFacility('workshop')) { toast('需要在基地建立工坊。'); return; }
  if (!S.base || S.base.locId !== S.world.location) { toast('制作需要在基地进行。'); return; }
  for (const [item, n] of Object.entries(r.need)) {
    if (countInv(S.base.inv, item) < n) { toast(`缺少 ${item}×${n}`); return; }
  }
  for (const [item, n] of Object.entries(r.need)) removeItem(S.base.inv, item, n);
  if (r.special === 'repair') {
    if (!p.weapon) { toast('你当前没有装备武器。'); }
    else {
      p.weaponDur = clamp((p.weaponDur || 0) + Math.ceil(ITEMS[p.weapon].dur / 2), 0, ITEMS[p.weapon].dur);
      addLog(`你修理了【${itemName(p.weapon)}】，它重新变得趁手。`, 'good');
    }
  } else if (r.special === 'trap') {
    S.base.defense += 4;
    addLog('你在基地周围布置了陷阱，防御 +4。', 'good');
  } else if (r.out) {
    for (const [item, n] of r.out) {
      if (!S.base.inv[item]) S.base.inv[item] = { n: 0, spoil: ITEMS[item].spoil || null };
      S.base.inv[item].n += n;
    }
    addLog(`你制作了【${r.name}】。`, 'good');
  }
  p.skills.建造 = clamp(p.skills.建造 + 1, 0, 100);
  renderAll();
}

/* ==================== 幸存者与基地日常 ==================== */

function countRole(role) {
  return S.base.population.filter(n => n.alive && n.role === role).length;
}

function consumeBaseFood(kind, points) {
  const b = S.base;
  const entries = invList(b.inv)
    .filter(x => x.def.cat === kind && (kind !== 'food' || !x.def.rotten))
    .sort((a, b) => (a.spoil === null ? 1 : a.spoil) - (b.spoil === null ? 1 : b.spoil));
  let left = points;
  for (const e of entries) {
    if (left <= 0) break;
    const val = kind === 'food' ? (e.def.food || 0) : (e.def.water || 0);
    if (val <= 0) continue;
    while (left > 0 && countInv(b.inv, e.id) > 0) {
      left -= val;
      removeItem(b.inv, e.id, 1);
    }
  }
  return left; // 缺口
}

function npcTakeFromBase(sv, cat) {
  const b = S.base;
  if (!b || !sv) return false;
  const entries = invList(b.inv).filter(x =>
    cat === 'food' ? (x.def.cat === 'food' && !x.def.rotten)
    : cat === 'drink' ? x.def.cat === 'drink'
    : x.id === cat
  );
  for (const e of entries) {
    if (removeItem(b.inv, e.id, 1)) {
      sv.inv = sv.inv || {};
      if (!sv.inv[e.id]) sv.inv[e.id] = { n: 0, spoil: ITEMS[e.id].spoil || null };
      sv.inv[e.id].n += 1;
      return true;
    }
  }
  return false;
}

function npcPackForTrip(sv, days) {
  if (!sv) return;
  days = Math.max(1, Math.round(days || 1));
  sv.inv = sv.inv || {};
  let foodGot = 0, waterGot = 0;
  for (let i = 0; i < days; i++) if (npcTakeFromBase(sv, 'food')) foodGot++;
  for (let i = 0; i < days; i++) if (npcTakeFromBase(sv, 'drink')) waterGot++;
  if (sv.health < 70) {
    npcTakeFromBase(sv, '绷带');
    if (days >= 3) npcTakeFromBase(sv, '绷带');
  }
  if ((foodGot < days || waterGot < days) && S.base) {
    S.base.morale = clamp(S.base.morale - 1, 0, 100);
    addLog(`【团队】${sv.name} 要出门 ${days} 天，但仓库口粮带不齐，有些不安。`, 'warn');
  }
}

function npcConsumeTrip(sv) {
  if (!sv) return;
  sv.inv = sv.inv || {};
  const food = invList(sv.inv).find(x => x.def.cat === 'food');
  if (food) removeItem(sv.inv, food.id, 1);
  const drink = invList(sv.inv).find(x => x.def.cat === 'drink');
  if (drink) removeItem(sv.inv, drink.id, 1);
  if (sv.health < 70 && removeItem(sv.inv, '绷带', 1)) {
    sv.health = clamp(sv.health + randInt(8, 15), 0, 100);
    addLog(`【团队】${sv.name} 在路上用绷带处理了伤口。`, 'info');
  }
}

function npcReturnToBase(sv, rest) {
  if (!S.base || !sv || !sv.inv) return;
  for (const [id, st] of Object.entries(sv.inv)) {
    for (let i = 0; i < (st.n || 0); i++) addItem(S.base.inv, id, 1);
  }
  sv.inv = {};
  if (rest !== false) npcRestAtBase(sv);
}

function npcRestAtBase(sv) {
  if (!S.base || !sv || !sv.alive) return;
  let healed = false;
  const want = 100 - Math.round(sv.health);
  if (want >= 40 && countInv(S.base.inv, '医疗包') > 0) {
    removeItem(S.base.inv, '医疗包', 1);
    sv.health = clamp(sv.health + 55, 0, 100);
    healed = true;
  } else if (want > 0) {
    let used = 0;
    while (sv.health < 100 && countInv(S.base.inv, '绷带') > 0 && used < 3) {
      removeItem(S.base.inv, '绷带', 1);
      sv.health = clamp(sv.health + 22, 0, 100);
      healed = true;
      used++;
    }
  }
  if (sv.morale < 100) sv.morale = clamp(sv.morale + 5, 0, 100);
  if (healed) addLog(`【团队】${sv.name} 回到基地休整，用仓库药品恢复了状态。`, 'good');
}

function isCourierAway(npcId) {
  return S.world.radioTasks.some(t => !t.done && t.courier === npcId);
}

function baseDaily() {
  const b = S.base;
  if (!b) return;
  buildProgressDaily();
  const pop = b.population.filter(n => n.alive);
  // 在基地的成员不使用随身背包，物资统一回仓库
  for (const n of pop) {
    if (n.role !== 'scavenge' && !isCourierAway(n.id)) npcReturnToBase(n, false);
  }

  // 生产
  const farmers = countRole('farm');
  if (hasFacility('garden') && farmers > 0) {
    const season = seasonOf(S.world.day);
    const n = (season === 'winter' ? Math.min(3, farmers) : Math.min(6, farmers * 2)) + (season === 'summer' ? 1 : 0);
    addItem(b.inv, '蔬菜', n);
    if (n > 0) addLog(`【基地】菜园产出了蔬菜×${n}。${season === 'winter' ? '寒冬让收成少了许多。' : ''}`, 'good');
  }
  if (hasFacility('well')) {
    addItem(b.inv, '净水', 3);
  }
  if (hasFacility('barn')) {
    addItem(b.inv, '鸡蛋', 2);
  }
  if (hasFacility('generator') && b.power) {
    if (countInv(b.inv, '燃油') > 0) {
      removeItem(b.inv, '燃油', 1);
      if (b.powerWaiting) {
        b.powerWaiting = false;
        addLog('【基地】仓库里有了燃油，发电机已自动重启。', 'good');
      }
    } else {
      if (!b.powerWaiting) {
        b.powerWaiting = true;
        addLog('【基地】燃油耗尽，发电机暂停。仓库里有燃油后会自动重启。', 'bad');
      }
    }
  }

  // 拾荒者外出
  for (const sv of pop.filter(n => n.role === 'scavenge')) {
    npcPackForTrip(sv, 1);
    npcConsumeTrip(sv);
    if (chance(0.65)) {
      const id = pick(['罐头', '压缩饼干', '瓶装水', '木板', '金属', '零件', '燃油']);
      addItem(b.inv, id, randInt(1, 2));
      addLog(`【团队】${sv.name} 外出拾荒，带回了【${id}】，已放入仓库。`, 'good');
    }
    if (chance(0.15)) {
      const wid = pick(['菜刀', '棒球棍', '撬棍', '长矛', '铁管']);
      const cur = npcWeapon(sv);
      if (!cur || ITEMS[wid].dmg > cur.dmg) {
        sv.weapon = wid;
        addLog(`【团队】${sv.name} 找到了一把【${wid}】，留作自己的武器。`, 'good');
      }
    }
    if (chance(0.12 * (sv.ability === 'danger' ? 0.45 : 1))) {
      sv.health = clamp(sv.health - randInt(8, 25), 0, 100);
      addLog(`【团队】${sv.name} 外出时受了伤（生命 ${Math.round(sv.health)}）。`, 'warn');
      if (sv.health <= 0) {
        sv.alive = false;
        addLog(`【团队】${sv.name} 没能活着回来……`, 'bad');
      }
    }
    npcReturnToBase(sv);
  }

  // 人口消耗
  const needFood = pop.length * 34;
  const needWater = pop.length * 36;
  const foodGap = consumeBaseFood('food', needFood);
  const waterGap = consumeBaseFood('drink', needWater);
  if (foodGap > 0 || waterGap > 0) {
    b.starveDays++;
    b.morale = clamp(b.morale - 8, 0, 100);
    addLog(`【基地】粮食缺口 ${Math.round(foodGap)}、饮水缺口 ${Math.round(waterGap)}，大家开始不安。`, 'bad');
    pop.forEach(n => { n.health = clamp(n.health - 4, 0, 100); n.morale = clamp(n.morale - 4, 0, 100); });
    if (b.starveDays >= 3 && pop.length) {
      const leaver = pick(pop);
      leaver.alive = false;
      addLog(`【基地】${leaver.name} 忍受不了饥饿，带着自己的东西离开了。`, 'bad');
      b.starveDays = 0;
    }
  } else {
    b.starveDays = 0;
    b.morale = clamp(b.morale + 1, 0, 100);
  }

  // 医务室治疗
  if (hasFacility('medbay')) {
    const medic = countRole('medic');
    if (medic > 0) {
      const healBonus = b.population.some(x => x.alive && x.role === 'medic' && x.ability === 'heal') ? 12 : 0;
      for (const n of pop.filter(x => x.health < 100 && x.alive)) {
        if (countInv(b.inv, '绷带') > 0 || countInv(b.inv, '医疗包') > 0) {
          const id = countInv(b.inv, '绷带') > 0 ? '绷带' : '医疗包';
          removeItem(b.inv, id, 1);
          n.health = clamp(n.health + randInt(15, 30) + healBonus, 0, 100);
        } else break;
      }
    }
  }

  // 士气与设施加成
  if (hasFacility('school')) b.morale = clamp(b.morale + 2, 0, 100);
  const calmCount = pop.filter(n => n.ability === 'calm').length;
  if (calmCount > 0) b.morale = clamp(b.morale + calmCount, 0, 100);
  const cap = 20 + b.population.filter(n => n.alive).length * 2;
  if (b.morale > cap) b.morale = cap;

  // NPC 状态漂移
  for (const n of pop) {
    n.morale = clamp(n.morale + rand(-3, 2), 0, 100);
    n.loyalty = clamp(n.loyalty + rand(-2, 2), 0, 100);
  }
  npcEvents();
}

function npcEvents() {
  const b = S.base;
  const pop = b.population.filter(n => n.alive);
  if (!pop.length) return;
  if (chance(0.35)) {
    const n = pick(pop);
    const type = pick(['ill', 'conflict', 'love', 'request', 'growth', 'theft']);
    if (type === 'ill') {
      n.health = clamp(n.health - randInt(10, 30), 0, 100);
      addLog(`【团队】${n.name} 生病了，需要药品和照顾。`, 'warn');
      if (n.health <= 0) {
        n.alive = false;
        addLog(`【团队】${n.name} 没能撑过这场病。`, 'bad');
      }
    } else if (type === 'conflict') {
      const m = pick(pop.filter(x => x.id !== n.id));
      if (m) {
        n.morale = clamp(n.morale - 8, 0, 100);
        m.morale = clamp(m.morale - 8, 0, 100);
        addLog(`【团队】${n.name} 与 ${m.name} 因口粮分配发生了争执。`, 'warn');
      }
    } else if (type === 'love') {
      const candidates = pop.filter(x => x.id !== n.id && x.sex !== n.sex && !x.spouse && x.age > 17);
      const m = candidates.length ? pick(candidates) : null;
      if (m) {
        n.spouse = m.id; m.spouse = n.id;
        n.morale = clamp(n.morale + 15, 0, 100);
        m.morale = clamp(m.morale + 15, 0, 100);
        addLog(`【团队】在日复一日的相互扶持中，${n.name} 与 ${m.name} 走到了一起。`, 'good');
        if (baseTier().pop >= 12 && chance(0.5)) {
          const child = makeSurvivor({ sex: pick(['男', '女']) });
          child.age = 0;
          child.name = n.name + '与' + m.name + '的孩子';
          child.profession = '孩子';
          child.health = 100;
          child.morale = 70;
          child.loyalty = 80;
          b.population.push(child);
          n.child = child.id;
          addLog(`【文明】一个新生儿在基地里诞生了。哭声让所有人想起了“未来”这个词。`, 'sys');
          S.world.history.push(`${fmtTime(S.world.day)}：基地迎来了一个新生命。`);
        }
      }
    } else if (type === 'request') {
      if (n.loyalty < 35 && chance(0.4)) {
        n.alive = false;
        addLog(`【团队】${n.name} 决定离开基地，去寻找自己的家人。`, 'warn');
      } else {
        addLog(`【团队】${n.name} 找你倾诉：${n.story}`, 'info');
        n.loyalty = clamp(n.loyalty + 5, 0, 100);
      }
    } else if (type === 'growth') {
      const skill = pick(Object.keys(n.skills));
      n.skills[skill] = clamp(n.skills[skill] + randInt(1, 4), 0, 100);
      addLog(`【团队】${n.name} 在 ${skill} 方面有了进步。`, 'info');
    } else if (type === 'theft') {
      const ids = Object.keys(b.inv).filter(x => ITEMS[x].cat === 'food');
      if (ids.length) {
        removeItem(b.inv, pick(ids), 1);
        n.loyalty = clamp(n.loyalty - 10, 0, 100);
        addLog(`【团队】你发现仓库里的食物少了。有人私下拿走了它。`, 'bad');
      }
    }
  }
}

function assignRole(npcId, role) {
  const npc = S.base.population.find(n => n.id === npcId);
  if (!npc) return;
  npc.role = role;
  const roleName = ROLES.find(r => r.id === role).name;
  addLog(`【团队】你安排 ${npc.name} 担任「${roleName}」。`, 'info');
  renderAll();
}

function talkToNpc(npcId) {
  const npc = S.base.population.find(n => n.id === npcId);
  if (!npc) return;
  const p = S.player;
  const loyalDesc = npc.loyalty >= 70 ? '对你十分忠诚' : npc.loyalty >= 45 ? '对你还算信服' : '对你的领导有所保留';
  const moodDesc = npc.morale >= 70 ? '情绪不错' : npc.morale >= 40 ? '情绪一般' : '情绪低落';
  const best = Object.entries(npc.skills).sort((a, b) => b[1] - a[1])[0];
  const body = `<p class="narrative">${escapeHtml(npc.name)}，${npc.age} 岁，曾是${escapeHtml(npc.profession)}。${escapeHtml(npc.traits.join('、'))}。</p>
  <p class="narrative">他最擅长的是【${best[0]}】。${loyalDesc}，${moodDesc}。</p>
  ${npc.ability ? `<p class="narrative">他/她拥有异能【${ABILITIES[npc.ability].name}】。</p>` : ''}
  <p class="narrative">“${escapeHtml(npc.story)}”</p>
  <div class="row"><span class="k">忠诚度</span><span class="v">${Math.round(npc.loyalty)} / 100</span></div>
  <div class="row"><span class="k">士气</span><span class="v">${Math.round(npc.morale)} / 100</span></div>
  <div class="row"><span class="k">生命</span><span class="v">${Math.round(npc.health)} / 100</span></div>`;
  const actions = [
    `<button class="choice" onclick="npcComfort('${npc.id}')"><span class="t">给予食物安慰</span><span class="d">消耗 1 份你的食物，提升对方士气与忠诚。</span></button>`,
    `<button class="choice" onclick="npcShare('${npc.id}')"><span class="t">分享情报 / 谈心</span><span class="d">了解他的过去，拉近关系。</span></button>`
  ];
  if (npc.health < 60 && countInv(p.inventory, '绷带') > 0) {
    actions.push(`<button class="choice" onclick="npcHeal('${npc.id}')"><span class="t">用绷带为他处理伤口</span><span class="d">消耗 1 个绷带。</span></button>`);
  }
  actions.push('<button class="btn" onclick="closeModal()">离开</button>');
  openModal(`👤 ${escapeHtml(npc.name)}`, body, actions.join(''));
}

function npcComfort(id) {
  const p = S.player;
  const npc = S.base.population.find(n => n.id === id);
  if (!npc) return;
  const food = invList(p.inventory).find(x => x.def.cat === 'food' && !x.def.rotten);
  if (!food) { toast('你手头没有任何可以分享的食物。'); return; }
  removeItem(p.inventory, food.id, 1);
  npc.morale = clamp(npc.morale + 10, 0, 100);
  npc.loyalty = clamp(npc.loyalty + 6, 0, 100);
  addLog(`你把【${itemName(food.id)}】分给了 ${npc.name}。`, 'good');
  addTag('仁慈');
  closeModal();
  renderAll();
}

function npcShare(id) {
  const npc = S.base.population.find(n => n.id === id);
  if (!npc) return;
  npc.loyalty = clamp(npc.loyalty + 8, 0, 100);
  addLog(`你与 ${npc.name} 聊了很久。人与人之间的信任，就是这样一点点建立的。`, 'good');
  closeModal();
  renderAll();
}

function npcHeal(id) {
  const p = S.player;
  const npc = S.base.population.find(n => n.id === id);
  if (!npc || !removeItem(p.inventory, '绷带', 1)) return;
  npc.health = clamp(npc.health + 22, 0, 100);
  npc.loyalty = clamp(npc.loyalty + 5, 0, 100);
  addLog(`你为 ${npc.name} 处理了伤口。`, 'good');
  closeModal();
  renderAll();
}

/* ==================== 战力数值 ==================== */

function combatScore(p) {
  const w = currentWeapon(p);
  let score = 10 + (p.skills.近战 + p.skills.远程) * 0.32 + p.skills.潜行 * 0.15 + p.skills.医疗 * 0.08;
  score += (w.dmg || 4) * 1.1;
  if (p.ability === 'strength') score *= 1.15 + p.abilityLevel * 0.05;
  if (p.health < 70) score *= 0.75;
  if (p.wounds.length) score *= Math.max(0.5, 1 - p.wounds.length * 0.08);
  return score;
}

/* ==================== 基地攻防 ==================== */

function baseBattle(attackerName, strength, onLoss) {
  const b = S.base;
  let guardDef = 0;
  for (const g of b.population.filter(x => x.alive && x.role === 'guard')) {
    guardDef += 6 + (g.ability === 'strength' ? 3 : 0) + (npcWeapon(g) ? npcWeapon(g).dmg * 0.4 : 0);
  }
  let def = b.defense + guardDef + (S.world.flags.dog ? 2 : 0);
  if (S.world.location === b.locId) def += combatScore(S.player) * 0.25;
  const roll = def + rand(-8, 8);
  const attack = strength * rand(0.85, 1.2);
  if (roll >= attack) {
    b.morale = clamp(b.morale + 5, 0, 100);
    addLog(`【基地】${attackerName}被击退了！守卫们欢呼起来。`, 'good');
    if (chance(0.2)) {
      const g = b.population.find(n => n.alive && n.role === 'guard');
      if (g) { g.health = clamp(g.health - randInt(5, 20), 0, 100); addLog(`【基地】守卫 ${g.name} 在战斗中负伤。`, 'warn'); }
    }
    return true;
  } else {
    b.defense = Math.max(0, b.defense - 2);
    b.morale = clamp(b.morale - 12, 0, 100);
    addLog(`【基地】防线被突破了！`, 'bad');
    if (onLoss) onLoss();
    const g = b.population.find(n => n.alive && n.role === 'guard') || b.population.find(n => n.alive);
    if (g && chance(0.6)) {
      g.health = clamp(g.health - randInt(20, 55), 0, 100);
      addLog(`【基地】${g.name} 受了重伤。`, 'bad');
      if (g.health <= 0) {
        g.alive = false;
        addLog(`【基地】${g.name} 在袭击中丧生了。`, 'bad');
      }
    }
    return false;
  }
}

/* ==================== 世界事件 ==================== */

function rollWorldEvents() {
  // 尸潮季
  if (S.world.flags.hordeNext && S.world.day >= S.world.flags.hordeNext) {
    S.world.flags.hordeNext = S.world.day + randInt(60, 90);
    hordeAttack();
    return;
  }
  // 阵营剧情链（出现即触发，不与其他事件抢名额）
  if (chance(0.6) && maybeCampaign()) return;
  // 势力战争
  if (S.world.flags.warStarted && S.world.day - S.world.flags.lastWarDay >= 45 && chance(0.5)) {
    S.world.flags.lastWarDay = S.world.day;
    warClash();
    return;
  }
  if (!chance(0.55)) return;
  const b = S.base;
  const pool = [];
  if (S.world.day > 0 && (hasFacility('radio') || hasRadio())) pool.push('distress');
  if (b) pool.push('stranger', 'caravan');
  if (b && S.world.factions.raiders <= 0 && b.population.filter(n => n.alive).length > 0) pool.push('raiders');
  if (b && S.world.day > 10 && stageIndex(S.world.day) >= 1 && chance(0.4)) pool.push('horde');
  if (S.world.day > 3) pool.push('rumor');
  if (S.world.factions.military > -3) pool.push('military');
  pool.push('flavor', 'dog');
  runEvent(pick(pool));
}

function maybeCampaign() {
  const pool = CAMPAIGN_EVENTS.filter(e => e.cond && e.cond(S) && !S.world.flags.camp[e.id]);
  if (!pool.length) return false;
  runAdventureEvent(pick(pool));
  return true;
}

function warClash() {
  const pairs = [['military', 'raiders'], ['caravan', 'raiders'], ['church', 'corp'], ['military', 'corp'], ['camp', 'raiders'], ['caravan', 'corp']];
  const pair = pick(pairs);
  const names = { military: '军方残部', caravan: '商队', raiders: '掠夺者', church: '守望者教会', corp: '企业避难所', camp: '幸存者营地' };
  addLog(`【战争】${names[pair[0]]}与${names[pair[1]]}在你附近爆发了冲突。`, 'bad');
  openModal('⚔ 势力冲突',
    `<p class="narrative">枪声和火光就在几个街区之外。${names[pair[0]]}与${names[pair[1]]}的人正在交火。你听到有人朝你的方向跑来。</p>`,
    `<button class="choice" onclick="warHelp('${pair[0]}','${pair[1]}')"><span class="t">帮助${names[pair[0]]}</span><span class="d">博取一方好感，但可能引火烧身。</span></button>
     <button class="choice" onclick="warNeutral()"><span class="t">保持中立</span><span class="d">不站队，等风暴过去。</span></button>
     <button class="choice" onclick="warLoot()"><span class="t">趁乱捡漏</span><span class="d">风险与收益并存。</span></button>`);
}

function warHelp(a, b) {
  S.world.factions[a] = clamp(S.world.factions[a] + 2, -5, 10);
  S.world.factions[b] = clamp(S.world.factions[b] - 2, -5, 10);
  closeModal();
  if (chance(0.5)) {
    addLog('你出手相助，但也被卷入了交火——有丧尸和敌人朝你扑来！', 'bad');
    startEncounter(S.world.location, { origin: S.world.location, surprise: true });
  } else {
    addLog('你的支援帮他们稳住了阵脚。对方记住了这份人情。', 'good');
  }
}

function warNeutral() {
  closeModal();
  addLog('你压低身子，等交火声渐渐远去。世界不会在意一个旁观者。', 'info');
}

function warLoot() {
  closeModal();
  const loc = S.world.locations[S.world.location];
  loc.danger = clamp(loc.danger + 2, 0, 10);
  if (chance(0.55)) {
    const id = pick(['步枪弹', '手枪弹', '罐头', '绷带', '燃油']);
    addItem(S.player.inventory, id, randInt(2, 6));
    addLog(`你趁乱捡到了【${id}】，又溜回了暗处。`, 'good');
    addTag('机会主义');
  } else {
    addLog('流弹擦着你的头皮飞过，你什么都没捞到，只能先撤。', 'bad');
    S.player.health = clamp(S.player.health - randInt(5, 15), 0, 100);
    if (S.player.health <= 0) die('你死于一场与你无关的冲突。');
  }
  renderAll();
}

function hasRadio() {
  return countInv(S.player.inventory, '收音机') > 0 || (S.base && countInv(S.base.inv, '收音机') > 0);
}

function runEvent(type) {
  if (type === 'distress') distressSignal();
  else if (type === 'stranger') strangerKnock();
  else if (type === 'caravan') caravanVisit();
  else if (type === 'raiders') raiderDemand();
  else if (type === 'horde') hordeAttack();
  else if (type === 'rumor') survivorRumor();
  else if (type === 'military') militaryBroadcast();
  else if (type === 'dog') dogEvent();
  else flavorEvent();
}

function distressSignal() {
  const ids = Object.keys(LOC_DEFS).filter(x => x !== S.world.location);
  const target = pick(ids);
  S.world.signal = { locId: target, day: S.world.day };
  addLog('【无线电】你收到一段断断续续的求救信号：“……有人吗……我们在……坚持不了多久了……”', 'warn');
  openModal('📻 求救信号',
    `<p class="narrative">信号来源指向【${LOC_DEFS[target].name}】方向。这可能是一个真正的求救，也可能是设好的陷阱。</p>`,
    `<button class="choice" onclick="acceptSignal()"><span class="t">回应并前往</span><span class="d">在地图上找到信号源，前去一探究竟。</span></button>
     <button class="choice" onclick="ignoreSignal()"><span class="t">忽略它</span><span class="d">末世里，自顾不暇才是常态。</span></button>`);
}

function acceptSignal() {
  addLog('你决定去信号源看看。', 'info');
  addTag('冒险');
  closeModal();
  renderAll();
}

function ignoreSignal() {
  addLog('你关掉了无线电。那声音很快消失在杂音里。', 'info');
  addTag('谨慎');
  if (S.world.signal && S.world.signal.day === S.world.day) S.world.signal = null;
  closeModal();
  renderAll();
}

function resolveSignal() {
  const p = S.player;
  const loc = S.world.locations[S.world.location];
  const roll = Math.random();
  S.world.signal = null;
  if (roll < 0.32) {
    if (S.base) {
      const sv = makeSurvivor();
      S.base.population.push(sv);
      S.world.stat.rescued++;
      addLog(`【救援】你在信号源找到了奄奄一息的 ${sv.name}（${sv.profession}）。他/她愿意加入你的基地。`, 'good');
      S.world.history.push(`${fmtTime(S.world.day)}：${p.name} 响应求救信号，救回了 ${sv.name}。`);
    } else {
      addItem(p.inventory, '罐头', 2);
      addLog('【救援】你救下了一名幸存者。他没有地方可去，把最后的食物都给了你，然后独自离开了。', 'info');
    }
    addTag('仁慈');
    S.world.factions.camp = clamp(S.world.factions.camp + 2, -5, 10);
  } else if (roll < 0.55) {
    addLog('信号源空无一人，只有一台还在重复播放的录音机——这是一场针对善良的骗局。你握紧了武器。', 'bad');
    startEncounter(S.world.location, { origin: S.world.location, surprise: chance(0.5) });
  } else if (roll < 0.8) {
    addLog('你只找到一具早已冰冷的尸体。他/她生前最后写下的字条上只有一句话：“别回来找我。”', 'bad');
    p.mental = clamp(p.mental - 5, 0, 100);
    const id = pick(['绷带', '罐头', '瓶装水', '手枪弹']);
    addItem(p.inventory, id, id === '手枪弹' ? randInt(5, 10) : 1);
    addLog(`你在尸体旁找到了【${id}】。`, 'info');
  } else {
    addLog('你在信号源附近发现了一个军方遗留的补给箱。', 'good');
    const id = pick(['步枪', '手枪', '医疗包']);
    addItem(p.inventory, id, 1);
    if (id === '步枪') addItem(p.inventory, '步枪弹', randInt(6, 12));
    if (id === '手枪') addItem(p.inventory, '手枪弹', randInt(8, 14));
    S.world.factions.military = clamp(S.world.factions.military + 2, -5, 10);
    addLog(`你得到了【${id}】和配套弹药。`, 'good');
  }
  closeModal();
  renderAll();
}

function strangerKnock() {
  const b = S.base;
  if (!b) return;
  const sv = makeSurvivor();
  addLog('【基地】一名陌生的幸存者出现在基地门口，请求收留。', 'warn');
  const foodDays = baseFoodDays();
  openModal('🚪 陌生来客',
    `<p class="narrative">${sv.name}，${sv.age} 岁，自称曾是${sv.profession}。他/她衣衫褴褛，眼里满是疲惫。</p>
     <p class="narrative">${foodDays >= 3 ? '你们还有余粮。' : '但你们的口粮本来就不多了。'}</p>`,
    `<button class="choice" onclick="acceptStranger()"><span class="t">收留他/她</span><span class="d">多一个人，多一份力量，也多一张嘴。</span></button>
     <button class="choice" onclick="giveStrangerFood()"><span class="t">给他/她一点食物，让他/她离开</span><span class="d">消耗基地 30 点食物。</span></button>
     <button class="choice" onclick="rejectStranger()"><span class="t">拒绝</span><span class="d">基地容不下更多人了。</span></button>`);
  S.world.flags.pendingStranger = sv;
}

function baseFoodDays() {
  const b = S.base;
  if (!b) return 0;
  const points = invList(b.inv).filter(x => x.def.cat === 'food' && !x.def.rotten).reduce((s, x) => s + x.n * (x.def.food || 0), 0);
  const pop = b.population.filter(n => n.alive).length;
  return pop > 0 ? points / (pop * 34) : 99;
}

function acceptStranger() {
  const sv = S.world.flags.pendingStranger;
  S.base.population.push(sv);
  S.world.stat.rescued++;
  S.world.flags.pendingStranger = null;
  addLog(`【基地】你收留了 ${sv.name}。`, 'good');
  addTag('仁慈');
  closeModal();
  renderAll();
}

function giveStrangerFood() {
  if (consumeBaseFood('food', 30) > 0) {
    toast('基地里连这点食物都拿不出来了。');
    return;
  }
  S.world.flags.pendingStranger = null;
  addLog('你给了他/她一些食物。对方千恩万谢地离开了。', 'info');
  addTag('仁慈');
  closeModal();
  renderAll();
}

function rejectStranger() {
  S.world.flags.pendingStranger = null;
  S.base.morale = clamp(S.base.morale - 3, 0, 100);
  addLog('你关上了门。过了很久，门外终于没了动静。', 'info');
  addTag('冷漠');
  closeModal();
  renderAll();
}

function tradeOffers() {
  const offers = [
    { name: '4 罐头 ↔ 1 抗生素', give: { 罐头: 4 }, get: { 抗生素: 1 } },
    { name: '6 瓶装水 ↔ 10 手枪弹', give: { 瓶装水: 6 }, get: { 手枪弹: 10 } },
    { name: '3 金属 ↔ 2 燃油', give: { 金属: 3 }, get: { 燃油: 2 } },
    { name: '1 抗生素 ↔ 3 燃油', give: { 抗生素: 1 }, get: { 燃油: 3 } },
    { name: '4 木板 ↔ 4 罐头', give: { 木板: 4 }, get: { 罐头: 4 } },
    { name: '3 零件 ↔ 3 绷带', give: { 零件: 3 }, get: { 绷带: 3 } }
  ];
  if (stageIndex(S.world.day) < 3) offers.push({ name: '¥500 ↔ 2 罐头', money: 500, get: { 罐头: 2 } });
  return offers;
}

function caravanVisit() {
  addLog('【基地】一支商队来到基地外，愿意与你交换物资。', 'info');
  const offers = tradeOffers().slice(0, 4);
  const body = `<p class="narrative">商队的负责人扫了一眼你们的仓库，报出几个价格：</p>` + offers.map((o, i) =>
    `<div class="row"><span class="k">${i + 1}. ${escapeHtml(o.name)}</span><span class="v">${canAffordOffer(o) ? '✅ 可交易' : '❌ 物资不足'}</span></div>`).join('');
  const foot = offers.map((o, i) => `<button class="choice" onclick="acceptTrade(${i})"><span class="t">${escapeHtml(o.name)}</span><span class="d">${canAffordOffer(o) ? '确认交易' : '物资不足'}</span></button>`).join('') +
    '<button class="btn" onclick="closeModal()">暂不交易</button>';
  S.world.flags.tradeOffers = offers;
  openModal('💰 商队交易', body, foot);
}

function canAffordOffer(o) {
  const b = S.base;
  if (o.money) return S.player.money >= o.money;
  for (const [id, n] of Object.entries(o.give)) {
    if (countInv(b.inv, id) < n) return false;
  }
  return true;
}

function acceptTrade(i) {
  const o = (S.world.flags.tradeOffers || [])[i];
  if (!o) return;
  if (!canAffordOffer(o)) { toast('物资不足。'); return; }
  const b = S.base;
  if (o.money) S.player.money -= o.money;
  else for (const [id, n] of Object.entries(o.give)) removeItem(b.inv, id, n);
  for (const [id, n] of Object.entries(o.get)) addItem(b.inv, id, n);
  addLog(`【贸易】你与商队完成了交易：${o.name}。`, 'good');
  S.world.factions.caravan = clamp(S.world.factions.caravan + 1, -5, 10);
  closeModal();
  renderAll();
}

function raiderDemand() {
  addLog('【基地】一伙掠夺者出现在围栏外，要求你交出物资。', 'bad');
  openModal('🔪 掠夺者来袭',
    `<p class="narrative">为首的人用刀背敲着围栏：“交出三箱罐头，我们就当没见过你们。否则，我们自己进去拿。”</p>`,
    `<button class="choice" onclick="payRaiders()"><span class="t">交出 3 个罐头</span><span class="d">破财消灾，但他们会更嚣张。</span></button>
     <button class="choice" onclick="fightRaiders()"><span class="t">拒绝，准备战斗</span><span class="d">守卫们已经握紧了武器。</span></button>`);
}

function payRaiders() {
  const b = S.base;
  if (countInv(b.inv, '罐头') >= 3) {
    removeItem(b.inv, '罐头', 3);
    S.world.factions.raiders = clamp(S.world.factions.raiders + 1, -5, 10);
    b.morale = clamp(b.morale - 5, 0, 100);
    addLog('你交出了物资。掠夺者大笑着离开了，但没人相信他们下次不会再来。', 'warn');
  } else {
    addLog('你拿不出罐头，掠夺者恼羞成怒，开始强攻！', 'bad');
    return fightRaiders();
  }
  closeModal();
  renderAll();
}

function fightRaiders() {
  closeModal();
  const won = baseBattle('掠夺者', 45, () => {
    const b = S.base;
    const foodIds = Object.keys(b.inv).filter(x => ITEMS[x].cat === 'food');
    let stolen = 0;
    for (let i = 0; i < 4 && foodIds.length; i++) {
      if (removeItem(b.inv, foodIds[0], 1)) stolen++;
    }
    addLog(`掠夺者抢走了 ${stolen} 份食物和部分物资。`, 'bad');
  });
  if (won) {
    S.world.factions.raiders = clamp(S.world.factions.raiders - 3, -5, 10);
    addTag('守护者');
  }
  renderAll();
}

function hordeAttack() {
  addLog('【基地】瞭望塔发出警报：一股尸潮正在朝基地移动！', 'bad');
  openModal('🧟 尸潮逼近',
    `<p class="narrative">远处扬起一片尘土，数不清的身影正缓慢而坚定地涌来。所有人都在看着你，等待一个决定。</p>`,
    `<button class="choice" onclick="defendHorde()"><span class="t">坚守基地</span><span class="d">依托围墙和守卫，正面顶住。</span></button>
     <button class="choice" onclick="evacuateHorde()"><span class="t">转移物资、避其锋芒</span><span class="d">放弃部分防御，保住人与口粮。</span></button>`);
}

function defendHorde() {
  closeModal();
  const stage = stageIndex(S.world.day);
  const won = baseBattle('尸潮', 35 + stage * 12 + rand(0, 20), () => {
    addLog('尸潮冲进了基地，到处都是喊叫声。', 'bad');
  });
  if (won) {
    addTag('守护者');
    S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 的基地击退了一场尸潮。`);
  }
  renderAll();
}

function evacuateHorde() {
  const b = S.base;
  b.defense = Math.max(0, b.defense - 3);
  b.morale = clamp(b.morale - 5, 0, 100);
  addLog('你们转移了能带走的物资，躲进了附近的地下室。尸潮过后，基地一片狼藉，但没有人死去。', 'info');
  addTag('谨慎');
  closeModal();
  renderAll();
}

function survivorRumor() {
  const ids = Object.keys(LOC_DEFS).filter(x => x !== S.world.location && x !== 'home');
  const target = pick(ids);
  if (!S.world.locations[target].survivors.length) {
    S.world.locations[target].survivors.push(makeSurvivor());
  }
  addLog(`【传闻】有人说在【${LOC_DEFS[target].name}】附近见到过活人。`, 'info');
  S.world.locations[target].note = '有幸存者出没的传闻';
}

function militaryBroadcast() {
  addLog('【军方广播】军方残部正在征集药品：“我们的人正在死去，任何帮助都会被铭记。”', 'warn');
  openModal('📢 军方广播',
    `<p class="narrative">军方在广播中承诺：捐献药品的基地，将得到武装支援与情报共享。</p>`,
    `<button class="choice" onclick="donateMeds()"><span class="t">捐献药品</span><span class="d">消耗 2 件药品，获得军方好感与弹药。</span></button>
     <button class="choice" onclick="closeModal()"><span class="t">保持沉默</span><span class="d">你们的药品也不多了。</span></button>`);
}

function donateMeds() {
  const b = S.base;
  const meds = invList(b.inv).filter(x => x.def.cat === 'med');
  if (meds.length < 2) { toast('基地药品不足。'); return; }
  let left = 2;
  for (const m of meds) {
    if (left <= 0) break;
    const take = Math.min(left, m.n);
    removeItem(b.inv, m.id, take);
    left -= take;
  }
  S.world.factions.military = clamp(S.world.factions.military + 3, -5, 10);
  addItem(b.inv, '步枪弹', randInt(8, 16));
  addItem(b.inv, '绷带', 2);
  addLog('你捐出了药品。几天后，军方送来了一批弹药作为回报。', 'good');
  addTag('团队主义');
  closeModal();
  renderAll();
}

function dogEvent() {
  if (S.world.flags.dog) { flavorEvent(); return; }
  addLog('一只流浪狗跟着你回到了住处，在门口徘徊不去。', 'info');
  openModal('🐕 流浪狗',
    `<p class="narrative">那是一只瘦骨嶙峋的土狗，却有一双异常警觉的眼睛。它不叫，只是安静地看着你。</p>`,
    `<button class="choice" onclick="adoptDog()"><span class="t">收养它</span><span class="d">它会看家护院，但也需要食物。</span></button>
     <button class="choice" onclick="closeModal()"><span class="t">赶走它</span><span class="d">自己都吃不饱，哪还养得起狗。</span></button>`);
}

function adoptDog() {
  S.world.flags.dog = true;
  if (S.base) { S.base.defense += 2; S.base.morale = clamp(S.base.morale + 5, 0, 100); }
  addLog('你收养了它，给它取名“阿黄”。它从此寸步不离地跟着你。', 'good');
  addTag('仁慈');
  closeModal();
  renderAll();
}

function flavorEvent() {
  const lines = [
    '远处传来一声巨响，像是煤气罐爆炸。没有人知道发生了什么。',
    '一群乌鸦掠过天空，朝着北边飞去。',
    '你在一面墙上看到一行喷漆：“我活到了第 40 天。”',
    '收音机里只有沙沙的电流声，像某种无声的叹息。',
    '路灯又亮了一盏——有人修好了附近的线路，又匆匆离去。',
    '风把一张旧报纸吹到脚边，头条写着“疫苗研发取得突破”。',
    '夜里你听见婴儿的哭声，出去查看时却什么都没有。',
    '几只野猫在屋顶上打架，闹了整整一夜。'
  ];
  addLog(`【世界】${pick(lines)}`, 'info');
}

/* ==================== 结局 ==================== */

function checkEndings() {
  const f = S.world.flags;
  if (!f.endingsAchieved) f.endingsAchieved = [];
  // 科研结局前置条件：孟知微加入 + 医务室 + 时间沉淀
  const mzw = S.world.specialNpcs.find(n => n.id === 'mengzhiwei');
  if (mzw && mzw.recruited && hasFacility('medbay') && S.world.day >= 180 && !f.adventure.vaccine) {
    f.adventure.vaccine = true;
    addLog('【科研】孟知微利用基地的医务室培养出了第一份抗体！疫苗研究取得关键突破！', 'sys');
    S.world.history.push(`${fmtTime(S.world.day)}：孟知微在基地完成了疫苗的关键突破。`);
  }
  for (const e of ENDINGS) {
    if (f.endingsAchieved.includes(e.id)) continue;
    if (e.cond(S)) {
      f.endingsAchieved.push(e.id);
      if (e.id === 'city') S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 建立了一座新城市，文明开始重建。`);
      endingModal(e);
    }
  }
}

function endingModal(e) {
  const got = S.world.flags.endingsAchieved.length;
  openModal(`${e.icon} ${e.name} — 结局达成`,
    `<p class="narrative">${escapeHtml(e.text)}</p>
     <p class="narrative" style="margin-top:10px;">你已解锁 <b>${got}/${ENDINGS.length}</b> 个结局。</p>
     <p class="narrative">你可以就此收笔，接受这个结局；也可以继续活下去，去见证下一种人生。</p>`,
    `<button class="btn primary" onclick="acceptEnding('${e.id}')">接受这个结局</button>
     <button class="btn" onclick="closeModal()">继续生存，探索其他结局</button>
     <button class="btn" onclick="openEndings()">结局图鉴</button>`);
}

function acceptEnding(id) {
  S.world.flags.acceptedEnding = id;
  const e = ENDINGS.find(x => x.id === id);
  S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 的人生定格为「${e.name}」。`);
  const got = S.world.flags.endingsAchieved;
  const list = ENDINGS.map(x => `<div class="row"><span class="k">${x.icon} ${x.name}</span><span class="v">${got.includes(x.id) ? '✅ 已达成' : '⬜ 未达成'}</span></div>`).join('');
  openModal('🏁 这一世，落幕',
    `<p class="narrative">你选择以【${e.icon} ${e.name}】作为这一世的句点。</p>
     <div style="margin-top:12px;">${list}</div>
     <p class="narrative" style="margin-top:12px;">存活 ${S.world.stat.daysSurvived} 天 · 击杀 ${S.world.stat.kills} · 救助 ${S.world.stat.rescued} 人${S.base ? ' · 基地 ' + S.base.population.filter(n => n.alive).length + ' 人' : ''}</p>
     <p class="narrative" style="margin-top:8px;">世界记得：</p>
     <p class="narrative">${S.world.history.slice(-8).map(escapeHtml).join('<br>') || '一切尚未被书写。'}</p>`,
    `<button class="btn danger" onclick="confirmNewGame()">开始新的人生</button>
     <button class="btn" onclick="unacceptEnding()">反悔，继续这一世</button>`,
    false);
}

function unacceptEnding() {
  S.world.flags.acceptedEnding = null;
  closeModal();
  addLog('你回到废土，继续走向下一种结局。', 'sys');
  renderAll();
}

function openEndings() {
  const got = S.world.flags.endingsAchieved;
  const list = ENDINGS.map(x => `
    <div class="facility">
      <div><div class="n">${x.icon} ${x.name} ${got.includes(x.id) ? '<span class="badge ok">已达成</span>' : ''}</div>
      <div class="d">${x.desc}</div></div>
    </div>`).join('');
  openModal('📜 结局图鉴',
    `<p class="narrative">共 ${ENDINGS.length} 种结局，已解锁 ${got.length} 种。${S.world.flags.acceptedEnding ? '当前人生已定格。' : '你仍在书写这一世。'}</p>
     <div style="margin-top:10px;">${list}</div>`,
    '<button class="btn" onclick="closeModal()">继续求生</button>');
}

/* ==================== 界面渲染 ==================== */

function renderAll() {
  if (!S) return;
  renderHud();
  renderStatus();
  renderTab();
  renderLogSide();
}

function renderHud() {
  if (!S) return;
  $('hudDay').textContent = fmtTime(S.world.day);
  $('hudPhase').textContent = PHASE_EMOJI[S.world.phase] + ' ' + PHASES[S.world.phase];
  $('hudWeather').textContent = WEATHER_DEFS[S.world.weather].name + ' · ' + SEASONS[seasonOf(S.world.day)].name;
  const def = LOC_DEFS[S.world.location];
  $('hudLocation').textContent = def.name + (S.base && S.base.locId === S.world.location ? '（基地）' : '');
  const st = WORLD_STAGES[stageIndex(S.world.day)];
  $('hudStage').textContent = st.name;
  $('hudStageChip').title = st.desc;
}

function barHtml(label, val, cls) {
  const v = Math.round(clamp(val, 0, 100));
  return `<div class="bar-row">
    <div class="lbl"><span>${label}</span><span class="v">${v}</span></div>
    <div class="bar"><div class="fill ${cls}" style="width:${v}%"></div></div>
  </div>`;
}

function renderStatus() {
  const p = S.player;
  const def = LOC_DEFS[S.world.location];
  const infStage = infectionStage(p.infection);
  const infBadge = p.infection <= 0 ? '<span class="badge ok">未感染</span>'
    : p.infection < 40 ? `<span class="badge warnb">${infStage} ${Math.round(p.infection)}%</span>`
    : `<span class="badge">${infStage} ${Math.round(p.infection)}%</span>`;
  const abilityHtml = p.ability
    ? `<div class="ability-card"><div class="t">⚡ ${ABILITIES[p.ability].name} · ${'I'.repeat(p.abilityLevel)}级</div><div class="d">${ABILITIES[p.ability].desc}</div></div>`
    : (p.abilityMode === 'latent' ? '<div class="ability-card"><div class="t">🌫 异能尚未觉醒</div><div class="d">某些东西在体内沉睡，等待一个契机。</div></div>' : '');
  const w = currentWeapon(p);
  const tags = p.tags.length ? p.tags.map(t => `<span class="tag">#${t}</span>`).join('') : '<span style="color:var(--dim);font-size:12px;">还没有人定义你。</span>';
  const html = `
    <div class="who">
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="meta">${p.age} 岁 · ${escapeHtml(p.profession)} · ${bodyStatus()}</div>
    </div>
    ${barHtml('生命', p.health, 'hp')}
    ${barHtml('体力', p.stamina, 'st')}
    ${barHtml('饥饿', p.hunger, 'need')}
    ${barHtml('口渴', p.thirst, 'need')}
    ${barHtml('疲劳', p.fatigue, 'need')}
    ${barHtml('体温', p.temp, 'mid')}
    ${barHtml('精神', p.mental, 'mid')}
    ${barHtml('士气', p.morale, 'st')}
    ${barHtml('感染', p.infection, 'bad')}
    <div class="stat-grid">
      <div class="stat-cell"><div class="k">感染状态</div><div class="v">${infBadge}</div></div>
      <div class="stat-cell"><div class="k">生存战力</div><div class="v">${combatPower(p)}</div></div>
      <div class="stat-cell"><div class="k">当前武器</div><div class="v">${escapeHtml(w.name)}${p.weapon && ITEMS[p.weapon].dur ? `（耐久 ${Math.round(p.weaponDur || 0)}）` : ''}</div></div>
      <div class="stat-cell"><div class="k">负重</div><div class="v">${totalWeight(p.inventory)} / ${carryCap(p)} kg</div></div>
      <div class="stat-cell"><div class="k">现金</div><div class="v">¥${Math.round(p.money)}</div></div>
      <div class="stat-cell"><div class="k">伤口</div><div class="v">${p.wounds.length ? p.wounds.filter(w => !w.treated).length + ' 处未处理' : '无'}</div></div>
    </div>
    <div class="tags">${tags}</div>
    ${abilityHtml}`;
  $('statusPanel').innerHTML = '<h2>生存状态</h2>' + html;
}

function actionCard(icon, title, desc, fn, cost) {
  return `<button class="action-card" onclick="${fn}">
    <div class="t">${icon} ${title}</div>
    <div class="d">${desc}</div>
    ${cost ? `<div class="cost">${cost}</div>` : ''}
  </button>`;
}

function renderTab() {
  const map = { actions: renderActions, map: renderMap, inventory: renderInventory, base: renderBase, team: renderTeam, log: renderLogFull };
  (map[ui.tab] || renderActions)();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === ui.tab));
}

function renderActions() {
  const locId = S.world.location;
  const loc = S.world.locations[locId];
  const def = LOC_DEFS[locId];
  const cards = [];
  cards.push(actionCard('🔍', '搜刮此地', `在【${def.name}】寻找物资。每次必有收获，可反复搜索。${specialText(def)}`, 'scavenge()', '消耗 1 个时段'));
  if (loc.zombieCount > 0 && loc.zombieCount <= 6) {
    cards.push(actionCard('⚔️', '清理周围的丧尸', `这里大约有 ${loc.zombieCount} 只丧尸，主动清剿可以减少威胁。`, `startEncounter('${locId}', { origin: '${locId}' })`, '战斗有风险'));
  }
  cards.push(actionCard('🔭', '侦察周围', '观察附近地点的丧尸与幸存者动向。', 'scoutArea()', '消耗 1 个时段'));
  if (!S.base && loc.danger < 1.5 && loc.zombieCount <= 2) {
    cards.push(actionCard('🏠', '在这里建立安全屋', '把这里变成你的据点，可以存放物资、招募人手。', 'establishBase()', '消耗 1 个时段'));
  }
  if (S.base && S.base.locId === locId) cards.push(actionCard('🏕', '管理基地', '查看资源、建造设施、安排人手。', 'switchTab(&quot;base&quot;)'));
  cards.push(actionCard('🛏', '休息', '恢复体力、缓解疲劳。', 'rest()', '消耗 1 个时段'));
  if (S.player.fatigue >= 25) cards.push(actionCard('😴', '睡觉', '睡到第二天清晨，充分恢复。', 'sleep()', '睡到清晨'));
  cards.push(actionCard('🗺', '打开地图', '查看地点并前往其他区域。', 'switchTab(&quot;map&quot;)'));
  if (S.world.signal && S.world.signal.locId === locId) {
    cards.push(actionCard('📻', '调查求救信号', '信号源似乎就在附近。', 'resolveSignal()'));
  }
  if (loc.survivors.length) {
    cards.push(actionCard('👥', '与幸存者接触', `这里有 ${loc.survivors.length} 名幸存者。`, 'startHumanEncounter(&quot;' + locId + '&quot;, &quot;' + locId + '&quot;)'));
  }
  const npcsHere = (loc.npcs || []).map(x => S.world.specialNpcs.find(n => n.id === x)).filter(Boolean);
  for (const n of npcsHere) {
    cards.push(actionCard('🧭', `与 ${n.name} 交谈`, `${n.profession} · 好感度 ${Math.round(n.favor)} / 100`, `meetNpc('${n.id}')`));
  }
  if (hasPersonalRadio()) cards.push(actionCard('📻', '通讯系统', '联系阵营接任务、指派营地成员代送、问候认识的人。', 'openRadio()'));
  if (hasRadio()) cards.push(actionCard('📡', '收听广播', '了解世界动向与各方势力。', 'listenRadio()'));

  let dangerText = loc.zombieCount === 0 ? '这里似乎很安静。' : loc.zombieCount < 5 ? `有零星丧尸出没（约 ${loc.zombieCount} 只）。` : `丧尸很多（约 ${loc.zombieCount} 只），务必小心。`;
  if (S.player.ability === 'danger' && loc.zombieCount > 0) dangerText = `危险感知：约 ${loc.zombieCount} 只丧尸在附近游荡。`;
  const html = `
    <div class="view-head"><h3>行动</h3><span class="sub">你现在在【${def.name}】。${dangerText}</span></div>
    <div class="card">
      <div class="card-title">当前处境</div>
      <div class="row"><span class="k">地点类型</span><span class="v">${def.type}</span></div>
      <div class="row"><span class="k">地区特产</span><span class="v">${specialText(def) || '无特殊产出'}</span></div>
      <div class="row"><span class="k">天气</span><span class="v">${WEATHER_DEFS[S.world.weather].name} · ${WEATHER_DEFS[S.world.weather].desc}</span></div>
      <div class="row"><span class="k">世界阶段</span><span class="v">${WORLD_STAGES[stageIndex(S.world.day)].name}</span></div>
    </div>
    ${vehicleCardHtml()}
    <div class="action-grid">${cards.join('')}</div>`;
  $('tabContent').innerHTML = html;
}

function switchTab(tab) {
  ui.tab = tab;
  renderTab();
}

function renderMap() {
  const cur = S.world.location;
  const buildCards = (city) => Object.entries(LOC_DEFS).filter(([, d]) => d.city === city).map(([id, def]) => {
    const loc = S.world.locations[id];
    const dots = Math.round(clamp(loc.danger, 0, 10));
    const dotHtml = Array.from({ length: 5 }, (_, i) => `<span class="dot ${i < Math.ceil(dots / 2) ? 'on' : ''}"></span>`).join('');
    const z = loc.zombieCount;
    const zText = S.player.ability === 'danger'
      ? (z > 0 ? `丧尸约 ${z}` : '无丧尸')
      : (z === 0 ? '安静' : z < 5 ? '零星丧尸' : z < 12 ? '丧尸较多' : '大量丧尸');
    const isCur = id === cur;
    const isBase = S.base && S.base.locId === id;
    const sv = loc.survivors.length ? ' 👥' : '';
    const npcsHere = (loc.npcs || []).map(x => S.world.specialNpcs.find(n => n.id === x)).filter(Boolean);
    const npcLine = npcsHere.length ? `<div class="info" style="color:var(--accent2)">🧭 ${npcsHere.map(n => escapeHtml(n.name)).join('、')}</div>` : '';
    const cost = travelCost(id);
    return `<div class="loc-card">
      <div class="n"><span>${LOC_EMOJI[id]} ${def.name}${isBase ? ' 🏠' : ''}</span><span class="danger-dots">${dotHtml}</span></div>
      <div class="info">${def.type} · ${zText}${sv} · 可反复搜索</div>
      ${specialText(def) ? `<div class="info" style="color:var(--accent2)">${specialText(def)}</div>` : ''}
      ${npcLine}
      ${loc.note ? `<div class="info" style="color:var(--warn)">${escapeHtml(loc.note)}</div>` : ''}
      ${S.world.signal && S.world.signal.locId === id ? '<div class="info" style="color:var(--warn)">📻 求救信号源</div>' : ''}
      <div class="foot">
        <span class="info">路程 ${cost} 时段</span>
        ${isCur ? '<button class="btn small" disabled>你在这里</button>' : `<button class="btn small" onclick="travelTo('${id}')">前往</button>`}
      </div>
    </div>`;
  }).join('');
  const sections = ['A', 'B'].map(c => {
    const cards = buildCards(c);
    return `<div class="view-head"><h3>🗺 ${CITIES[c]}</h3><span class="sub">${c === 'A' ? '你的出发地' : '跨城路程更长、油耗更高'}</span></div><div class="loc-grid">${cards}</div>`;
  }).join('');
  $('tabContent').innerHTML = sections;
}

function itemActions(inv, id, st, baseMode) {
  const def = ITEMS[id];
  const acts = [];
  if (def.cat === 'food') acts.push(`<button class="btn small" onclick="${baseMode ? `consumeFromBase('${id}')` : `consumeItem(S.player.inventory, '${id}')`}">${def.rotten ? '勉强吃下' : '食用'}</button>`);
  if (def.cat === 'drink') acts.push(`<button class="btn small" onclick="${baseMode ? `consumeFromBase('${id}')` : `consumeItem(S.player.inventory, '${id}')`}">饮用</button>`);
  if (def.cat === 'med' && !baseMode) acts.push(`<button class="btn small" onclick="useMed('${id}')">使用</button>`);
  if (id === '快速修理套件' && !baseMode) acts.push(`<button class="btn small" onclick="useRepairKit()">使用</button>`);
  if ((def.cat === 'weapon' || def.cat === 'gun') && !baseMode) {
    if (S.player.weapon === id) acts.push(`<button class="btn small" onclick="unequipWeapon()">卸下</button>`);
    else acts.push(`<button class="btn small" onclick="equipWeapon('${id}')">装备</button>`);
  }
  if (S.base && S.base.locId === S.world.location) {
    if (!baseMode) acts.push(`<button class="btn small" onclick="depositItem('${id}', ${st.n})">存入基地</button>`);
    else acts.push(`<button class="btn small" onclick="takeItem('${id}', 1)">取走 1 件</button>`);
  }
  if (!baseMode && S.world.vehicle) {
    acts.push(`<button class="btn small" onclick="vehiclePut('${id}', ${st.n})">存入后备箱</button>`);
  }
  return acts.join('');
}

function renderInventory() {
  const p = S.player;
  const list = invList(p.inventory);
  const items = list.map(({ id, n, spoil, def }) => `
    <div class="item">
      <div class="top"><span class="nm">${escapeHtml(itemName(id))}</span><span class="qty">×${n}</span></div>
      <div class="desc">${escapeHtml(def.desc || '')}${spoil !== null && spoil !== undefined ? ` · 剩 ${spoil} 天变质` : ''}</div>
      <div class="acts">${itemActions(p.inventory, id, { n, spoil }, false)}</div>
    </div>`).join('');
  const over = totalWeight(p.inventory) > carryCap(p);
  const discardHtml = list.length ? `
    <div class="card" style="margin-top:12px;">
      <div class="card-title">🗑 丢弃物品</div>
      <div class="discard-row">
        <select id="discardItem" onchange="discardItemChanged()">
          ${list.map(({ id, n }) => `<option value="${id}">${escapeHtml(itemName(id))}（持有 ×${n}）</option>`).join('')}
        </select>
        <input id="discardQty" type="number" min="1" max="${list[0].n}" value="1">
        <button class="btn small" onclick="discardSetMax()">全部</button>
        <button class="btn small danger" onclick="confirmDiscard()">丢弃</button>
      </div>
      <div class="hint" style="color:var(--dim);font-size:12px;margin-top:7px;">先选择物品、再填数量。点击「丢弃」后会再次向你确认，确认后物品无法找回。</div>
    </div>` : '';
  const trunkHtml = S.world.vehicle ? `
    <div class="card" style="margin-top:12px;">
      <div class="card-title">🚙 ${escapeHtml(S.world.vehicle.name)} 后备箱（${Math.round(trunkWeight())}/60 kg）</div>
      ${invList(S.world.vehicle.trunk).length
        ? `<div class="item-grid">${invList(S.world.vehicle.trunk).map(({ id, n }) => `
          <div class="item">
            <div class="top"><span class="nm">${escapeHtml(itemName(id))}</span><span class="qty">×${n}</span></div>
            <div class="acts"><button class="btn small" onclick="vehicleTake('${id}', 1)">取出 1 件</button></div>
          </div>`).join('')}</div>`
        : '<p style="color:var(--dim);">后备箱是空的。</p>'}
    </div>` : '';
  $('tabContent').innerHTML = `
    <div class="view-head"><h3>背包</h3><span class="sub">负重 ${totalWeight(p.inventory)} / ${carryCap(p)} kg${over ? ' <span style="color:var(--bad)">（超重！行动会受限）</span>' : ''} · 现金 ¥${Math.round(p.money)}</span></div>
    ${items ? `<div class="item-grid">${items}</div>` : '<p style="color:var(--dim)">背包空空如也。你得尽快找到食物和水。</p>'}
    ${discardHtml}
    ${trunkHtml}`;
}

function discardItemChanged() {
  const id = $('discardItem').value;
  const max = countInv(S.player.inventory, id);
  const qtyInput = $('discardQty');
  qtyInput.max = max;
  if (parseInt(qtyInput.value, 10) > max) qtyInput.value = max;
}

function discardSetMax() {
  const id = $('discardItem').value;
  const max = countInv(S.player.inventory, id);
  $('discardQty').value = max;
}

function confirmDiscard() {
  const id = $('discardItem').value;
  const held = countInv(S.player.inventory, id);
  if (held <= 0) { toast('背包里没有这个物品。'); renderAll(); return; }
  const qty = Math.max(1, Math.min(held, parseInt($('discardQty').value, 10) || 0));
  const name = escapeHtml(itemName(id));
  openModal('🗑 确认丢弃', `
    <p class="narrative">你确定要丢弃 <b>${name} × ${qty}</b> 吗？</p>
    <p class="narrative">丢弃后物品将永久消失，无法找回。</p>`,
    `<button class="btn danger" onclick="doDiscard('${id}', ${qty})">确定丢弃</button>
     <button class="btn" onclick="closeModal()">再想想</button>`);
}

function doDiscard(id, qty) {
  if (!removeItem(S.player.inventory, id, qty)) { toast('数量有变，丢弃失败。'); closeModal(); return; }
  addLog(`你丢弃了【${itemName(id)}】×${qty}。`, 'info');
  closeModal();
}

function equipWeapon(id) {
  const p = S.player;
  if (countInv(p.inventory, id) <= 0) return;
  p.weapon = id;
  p.weaponDur = ITEMS[id].dur;
  addLog(`你装备了【${itemName(id)}】。`, 'info');
  renderAll();
}

function unequipWeapon() {
  S.player.weapon = null;
  addLog('你收起了武器。', 'info');
  renderAll();
}

function baseResourcePoints() {
  const b = S.base;
  if (!b) return { food: 0, water: 0, med: 0, material: 0, fuel: 0 };
  const sum = (cat) => invList(b.inv).filter(x => x.def.cat === cat).reduce((s, x) => s + x.n * (cat === 'food' ? (x.def.food || 0) : cat === 'drink' ? (x.def.water || 0) : 1), 0);
  return {
    food: Math.round(sum('food')), water: Math.round(sum('drink')),
    med: Math.round(invList(b.inv).filter(x => x.def.cat === 'med').reduce((s, x) => s + x.n, 0)),
    material: Math.round(invList(b.inv).filter(x => x.def.cat === 'material' || x.def.cat === 'fuel').reduce((s, x) => s + x.n, 0)),
    fuel: Math.round(countInv(b.inv, '燃油'))
  };
}

function farmCardHtml() {
  const b = S.base;
  const rows = b.crops.map(c => {
    const total = CROPS[c.crop].days;
    const pct = Math.min(c.progress, total);
    const state = c.progress >= total ? '✅ 可收获' : c.watered ? '💧 已浇水' : '⏳ 待浇水';
    return `<div class="row"><span class="k">${c.crop}</span><span class="v">${pct}/${total} · ${state}</span></div>`;
  }).join('');
  return `<div class="card">
    <div class="card-title">🌾 农场 ${hasFarmer() ? '<span class="badge ok">绿手指自动打理中</span>' : ''}</div>
    ${rows || '<p style="color:var(--dim);">还没有作物。种植会消耗 1 份种子。</p>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
      <button class="btn small" onclick="farmPlant('玉米')">种玉米</button>
      <button class="btn small" onclick="farmPlant('小麦')">种小麦</button>
      <button class="btn small" onclick="farmPlant('土豆')">种土豆</button>
      <button class="btn small" onclick="farmWaterAll()">💧 一键浇水</button>
      <button class="btn small" onclick="farmFertilizeAll()">🌱 施肥（肥料×1）</button>
      <button class="btn small" onclick="farmHarvestAll()">🧺 一键收获</button>
    </div>
  </div>`;
}

function ranchCardHtml() {
  const b = S.base;
  const rows = b.livestock.map(l => {
    const total = ANIMALS[l.animal].days;
    const pct = Math.min(l.progress, total);
    const state = l.mature ? '✅ 成年 · 持续产出' : `${pct}/${total} · ${l.watered ? '💧 已喂水' : '⏳ 待喂水'}`;
    return `<div class="row"><span class="k">${l.animal}</span><span class="v">${state}</span></div>`;
  }).join('');
  const animalBtns = Object.keys(ANIMALS).map(a => `<button class="btn small" onclick="ranchAddAnimal('${a}')">放入${a}</button>`).join('');
  return `<div class="card">
    <div class="card-title">🐄 牧场 ${hasHerder() ? '<span class="badge ok">牧语者自动照料中</span>' : ''}</div>
    ${rows || '<p style="color:var(--dim);">还没有牲畜。从商店购买或搜刮到动物后，放进来养殖。</p>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
      ${animalBtns}
      <button class="btn small" onclick="ranchWaterAll()">💧 一键喂水</button>
      <button class="btn small" onclick="ranchFeedAll()">🌾 喂饲料（饲料×1）</button>
    </div>
  </div>`;
}

function compostCardHtml() {
  const b = S.base;
  const rows = b.compost.map(c => `<div class="row"><span class="k">${itemName(c.id)} ×${c.qty || 1}</span><span class="v">发酵中 · 还剩 ${c.eta} 时段</span></div>`).join('');
  return `<div class="card">
    <div class="card-title">🪣 堆肥桶</div>
    ${rows || '<p style="color:var(--dim);">桶是空的。把食物（变质食物也行）投进来，发酵几个小时后变成肥料。</p>'}
    <div style="margin-top:8px;"><button class="btn small" onclick="openCompost()">投入食物</button></div>
  </div>`;
}

function renderBase() {
  if (!S.base) {
    $('tabContent').innerHTML = `
      <div class="view-head"><h3>基地</h3></div>
      <div class="card"><p class="narrative">你还没有自己的基地。找一个安全的地方（没有丧尸），从「行动」页选择“建立安全屋”。</p>
      <p class="narrative" style="margin-top:8px;">基地是末世生存的第二核心：存放物资、建造设施、收容幸存者，最后把它发展成一座城镇。</p></div>`;
    return;
  }
  const b = S.base;
  const pop = b.population.filter(n => n.alive).length;
  const tier = baseTier();
  const res = baseResourcePoints();
  const foodDays = baseFoodDays();
  const waterPoints = res.water;
  const waterDays = pop > 0 ? waterPoints / (pop * 36) : 99;
  const facilities = Object.entries(FACILITIES).map(([id, f]) => {
    const state = b.facilities[id] === 'built';
    const queue = b.buildQueue.find(q => q.id === id);
    const check = canBuild(id);
    const req = Object.entries(f.req).map(([it, n]) => `${it}×${n}`).join('、');
    return `<div class="facility">
      <div><div class="n">${f.icon} ${f.name} ${state ? '<span class="badge ok">已建成</span>' : queue ? '<span class="badge warnb">建造中</span>' : ''}</div>
      <div class="d">${f.desc}${queue ? `（还剩 ${Math.ceil(queue.remaining)} 天）` : ''}</div>
      ${!state && !queue ? `<div class="req">需要：${req}</div>` : ''}</div>
      ${state ? (id === 'generator' ? `<button class="btn small" onclick="togglePower()">${b.power ? '关闭电源' : '开启电源'}</button>` : '') : queue ? '' : `<button class="btn small" onclick="buildFacility('${id}')" ${check.ok ? '' : 'disabled'}>建造</button>`}
    </div>`;
  }).join('');
  const invItems = invList(b.inv).map(({ id, n, spoil, def }) => `
    <div class="item">
      <div class="top"><span class="nm">${escapeHtml(itemName(id))}</span><span class="qty">×${n}</span></div>
      <div class="desc">${spoil !== null && spoil !== undefined ? `剩 ${spoil} 天变质` : ''}</div>
      <div class="acts">${itemActions(b.inv, id, { n, spoil }, true)}</div>
    </div>`).join('');
  const problems = [];
  if (foodDays < 2) problems.push('食物不足');
  if (waterDays < 2) problems.push('饮水不足');
  if (countRole('guard') === 0) problems.push('没有守卫');
  if (b.defense < 10) problems.push('防御薄弱');
  if (b.morale < 35) problems.push('士气低落');
  if (b.population.some(n => n.alive && n.health < 40)) problems.push('有人急需治疗');
  const recipes = RECIPES.filter(r => !r.workshop || hasFacility('workshop')).map(r => `
    <div class="facility">
      <div><div class="n">🛠 ${r.name}</div><div class="d">${r.desc} · 需要：${Object.entries(r.need).map(([it, n]) => `${it}×${n}`).join('、') || '无'}</div></div>
      <button class="btn small" onclick="craftRecipe('${r.id}')">制作</button>
    </div>`).join('');
  $('tabContent').innerHTML = `
    <div class="view-head"><h3>🏠 ${escapeHtml(b.name)}</h3><span class="sub">${tier.name} · ${tier.desc}</span></div>
    <div class="resource-grid">
      <div class="res"><div class="k">人口</div><div class="v">${pop}</div></div>
      <div class="res"><div class="k">食物（约 ${Math.floor(foodDays)} 天）</div><div class="v">${res.food}</div></div>
      <div class="res"><div class="k">饮水（约 ${Math.floor(waterDays)} 天）</div><div class="v">${res.water}</div></div>
      <div class="res"><div class="k">药品</div><div class="v">${res.med}</div></div>
      <div class="res"><div class="k">燃油</div><div class="v">${res.fuel}</div></div>
      <div class="res"><div class="k">防御</div><div class="v">${Math.round(b.defense)}</div></div>
      <div class="res"><div class="k">士气</div><div class="v">${Math.round(b.morale)}</div></div>
      <div class="res"><div class="k">电力</div><div class="v">${hasFacility('generator') ? (b.power ? (countInv(b.inv, '燃油') > 0 ? '运行中' : '等待燃油') : '已关闭') : '无'}</div></div>
    </div>
    <div class="card"><div class="card-title">当前问题 ${problems.length ? '' : '<span style="color:var(--good)">暂无大问题</span>'}</div>
      <div class="narrative">${problems.map(x => '· ' + x).join('<br>') || '基地运转平稳。'}</div>
    </div>
    ${hasFacility('farm') ? farmCardHtml() : ''}
    ${hasFacility('ranch') ? ranchCardHtml() : ''}
    ${hasFacility('compost') ? compostCardHtml() : ''}
    <div class="card"><div class="card-title">设施</div>${facilities}</div>
    <div class="card"><div class="card-title">制作</div>${recipes}</div>
    <div class="card"><div class="card-title">仓库（点击取出 / 食用）</div>${invItems ? `<div class="item-grid">${invItems}</div>` : '<p style="color:var(--dim)">仓库是空的。把物资存入基地，才能养活更多人。</p>'}</div>`;
}

function togglePower() {
  if (!S.base || !hasFacility('generator')) return;
  S.base.power = !S.base.power;
  if (S.base.power) {
    if (countInv(S.base.inv, '燃油') > 0) {
      addLog('【基地】发电机开关已打开，将自动消耗仓库燃油持续运行。', 'good');
    } else {
      addLog('【基地】发电机开关已打开。仓库里有燃油后会自动开始运行。', 'info');
    }
  } else {
    addLog('【基地】发电机开关已关闭。', 'info');
  }
  renderAll();
}

function renderTeam() {
  if (!S.base) {
    $('tabContent').innerHTML = `<div class="view-head"><h3>团队</h3></div><div class="card"><p class="narrative">你还没有团队。外出探索时，可能会遇到其他幸存者；建立基地后，他们才愿意跟随你。</p></div>`;
    return;
  }
  const pop = S.base.population.filter(n => n.alive);
  const list = pop.map(n => `
    <div class="npc">
      <div class="avatar">${n.sex === '男' ? '🧔' : '👩'}</div>
      <div class="body">
        <div class="n">${escapeHtml(n.name)} <span class="tag">${n.age} 岁</span><span class="tag">${escapeHtml(n.profession)}</span>${n.ability ? `<span class="tag">⚡ ${ABILITIES[n.ability].name}</span>` : ''}${n.spouse ? '<span class="tag">❤ 有伴侣</span>' : ''}</div>
        <div class="m">生命 ${Math.round(n.health)} · 士气 ${Math.round(n.morale)} · 忠诚 ${Math.round(n.loyalty)} · 武器 ${npcWeaponName(n)} · ${escapeHtml(n.traits.join('、'))}</div>
        <div class="acts" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <select onchange="assignRole('${n.id}', this.value)">
            ${ROLES.map(r => `<option value="${r.id}" ${n.role === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
          </select>
          <button class="btn small" onclick="talkToNpc('${n.id}')">交谈</button>
          ${n.specialId && !S.world.flags.arcs[n.specialId] ? `<button class="btn small" onclick="npcArcMenu('${n.specialId}')">📖 支线</button>` : ''}
        </div>
      </div>
    </div>`).join('');
  $('tabContent').innerHTML = `<div class="view-head"><h3>团队</h3><span class="sub">共 ${pop.length} 人。人是末世里最珍贵的资源。</span></div>${list || '<p style="color:var(--dim)">还没有人加入你。</p>'}`;
}

function renderLogFull() {
  const list = log.map(e => `<div class="log-item ${e.cls}"><span class="t">${e.t}</span>${escapeHtml(e.text)}</div>`).join('');
  $('tabContent').innerHTML = `<div class="view-head"><h3>日志</h3><span class="sub">这一世走过的路。</span></div>${list || '<p style="color:var(--dim)">暂无记录。</p>'}`;
}

function renderLogSide() {
  const el = $('logBox');
  if (!el) return;
  el.innerHTML = log.slice(0, 60).map(e => `<div class="log-item ${e.cls}"><span class="t">${e.t}</span>${escapeHtml(e.text)}</div>`).join('');
}

/* ==================== 弹窗与提示 ==================== */

let toastTimer = null;

function openModal(title, bodyHtml, footHtml, closable) {
  $('modalTitle').innerHTML = title;
  $('modalBody').innerHTML = bodyHtml;
  $('modalFoot').innerHTML = footHtml || '';
  $('modalOverlay').classList.remove('hidden');
  $('modalClose').classList.toggle('hidden', closable === false);
}

function closeModal() {
  $('modalOverlay').classList.add('hidden');
  renderAll();
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

function listenRadio() {
  const stage = stageIndex(S.world.day);
  const f = S.world.factions;
  const html = `<p class="narrative">你调了调频率，断断续续的声音传了出来。</p>
    <p class="narrative">【世界】${WORLD_STAGES[stage].desc}</p>
    <div class="row"><span class="k">军方残部</span><span class="v">${repText(f.military)}</span></div>
    <div class="row"><span class="k">商队</span><span class="v">${repText(f.caravan)}</span></div>
    <div class="row"><span class="k">掠夺者</span><span class="v">${repText(f.raiders)}</span></div>
    <div class="row"><span class="k">幸存者营地</span><span class="v">${repText(f.camp)}</span></div>`;
  openModal('📡 广播', html, '<button class="btn" onclick="closeModal()">关闭</button>');
}

function repText(v) {
  if (v >= 3) return '友好';
  if (v >= 0) return '中立';
  if (v >= -2) return '不信任';
  return '敌对';
}

/* ==================== 菜单 / 帮助 ==================== */

function openMenu() {
  const slotRows = ['s1', 's2', 's3'].map(k => `
    <div class="facility">
      <div><div class="n">存档位 ${k.slice(-1)}</div><div class="d">${slotMeta(k)}</div></div>
      <div style="display:flex;gap:4px;">
        <button class="btn small" onclick="slotSave('${k}')">保存</button>
        <button class="btn small" onclick="slotLoad('${k}')">载入</button>
        <button class="btn small danger" onclick="slotDelete('${k}')">删除</button>
      </div>
    </div>`).join('');
  const html = `
    <p class="narrative">当前版本 v${GAME_VERSION}。导出存档后，把文本保存起来，之后可以粘贴回来继续这一世。</p>
    <div class="card" style="margin-top:10px;"><div class="card-title">存档位（共 3 个）</div>${slotRows}</div>
    <div class="field" style="margin-top:10px;">
      <label>导出存档（全选复制）</label>
      <textarea id="saveExport" readonly style="width:100%;height:80px;background:var(--panel2);border:1px solid var(--line);color:var(--text);border-radius:7px;padding:8px;">${exportSave()}</textarea>
    </div>
    <div class="field" style="margin-top:10px;">
      <label>导入存档（粘贴后点击恢复）</label>
      <textarea id="saveImport" style="width:100%;height:80px;background:var(--panel2);border:1px solid var(--line);color:var(--text);border-radius:7px;padding:8px;" placeholder="在这里粘贴存档代码"></textarea>
    </div>`;
  const foot = `<button class="btn" onclick="manualSave()">手动保存</button>
    <button class="btn" onclick="doImportSave()">恢复存档</button>
    <button class="btn" onclick="openEndings()">结局图鉴</button>
    <button class="btn" onclick="openCollect()">成就 / 人物志</button>
    <button class="btn" onclick="openSettings()">设置</button>
    <button class="btn" onclick="checkForUpdates(false)">检查更新</button>
    <button class="btn" onclick="closeModal()">关闭</button>
    <button class="btn danger" onclick="confirmNewGame()">重新开始</button>`;
  openModal('💾 存档 / 菜单', html, foot);
}

function compareVersion(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function checkForUpdates(silent) {
  try {
    if (typeof location === 'undefined' || location.protocol === 'file:') {
      if (!silent) toast('当前是本地文件模式，无法检查更新。部署到网页后会自动生效。');
      return;
    }
    fetch('version.json?t=' + Date.now())
      .then(r => r.json())
      .then(v => {
        if (compareVersion(v.version, GAME_VERSION) > 0) {
          openModal('🔄 发现新版本',
            `<p class="narrative">当前版本 v${GAME_VERSION}，最新版本 <b>v${escapeHtml(v.version)}</b>。</p>
             ${v.note ? `<p class="narrative">更新内容：${escapeHtml(v.note)}</p>` : ''}`,
            '<button class="btn primary" onclick="reloadGame()">立即更新（刷新页面）</button><button class="btn" onclick="closeModal()">稍后再说</button>');
        } else if (!silent) {
          toast('已是最新版本 v' + GAME_VERSION);
        }
      })
      .catch(() => { if (!silent) toast('检查更新失败，请稍后再试。'); });
  } catch (e) { /* 忽略 */ }
}

function reloadGame() {
  try { location.reload(); } catch (e) { /* 忽略 */ }
}

function manualSave() {
  saveToStorage();
  toast('已保存。');
}

function doImportSave() {
  const code = $('saveImport').value.trim();
  if (!code) { toast('请先粘贴存档代码。'); return; }
  try {
    S = ensureSaveCompat(importSave(code));
    log = [];
    closeModal();
    showGame();
    addLog('【系统】世界已从存档中恢复。', 'sys');
    renderAll();
    toast('存档恢复成功。');
  } catch (e) {
    toast('存档格式有误，恢复失败。');
  }
}

function openHelp() {
  const html = `
    <p class="narrative"><b>这是一款“活下来”的游戏。</b>没有固定的主线：你可以找家人、建农场、当商人，或者只是努力熬过今晚。</p>
    <p class="narrative"><b>时间：</b>每天分清晨、白天、黄昏、夜晚 4 个时段，每次行动会消耗时段。夜晚外出更危险。</p>
    <p class="narrative"><b>生存：</b>盯着饥饿、口渴、疲劳、体温、精神与感染。饿了吃、渴了喝、累了休息，伤口要尽快用绷带处理。</p>
    <p class="narrative"><b>战斗：</b>枪声和打斗会引来更多丧尸。“打不打得赢”不是唯一的问题，还要想“打完以后怎么办”。被咬伤可能感染，感染会恶化。</p>
    <p class="narrative"><b>探索：</b>每次搜索都必有收获，可以反复搜索；不同地区有不同特产，现金在任何地方都可能翻到。</p>
    <p class="narrative"><b>基地：</b>建立安全屋、建造设施、收容幸存者并安排岗位（守卫/拾荒/种植/医护/维修）。人本身就是资源。</p>
    <p class="narrative"><b>世界：</b>世界不会围着你转。尸潮、掠夺者、天气、病毒变异都在自行演化，你的选择会留下痕迹，也可能带来数十年后的故事。</p>
    <p class="narrative"><b>死亡：</b>默认是真实死亡。死亡后若基地还有幸存者，可以“继承”继续；也可以重新开始新的人生。</p>`;
  openModal('📖 玩法说明', html, '<button class="btn" onclick="closeModal()">开始求生</button>');
}

/* ==================== 内置修改器 ==================== */

const CHEAT_STATS = [
  ['cheatHp', '生命', 'health', 100],
  ['cheatSt', '体力', 'stamina', 100],
  ['cheatHunger', '饥饿', 'hunger', 100],
  ['cheatThirst', '口渴', 'thirst', 100],
  ['cheatFatigue', '疲劳', 'fatigue', 100],
  ['cheatTemp', '体温', 'temp', 100],
  ['cheatMental', '精神', 'mental', 100],
  ['cheatMorale', '士气', 'morale', 100],
  ['cheatInfection', '感染', 'infection', 99],
  ['cheatImmune', '免疫力', 'immune', 100],
  ['cheatMoney', '现金（元）', 'money', 9999999]
];

function ensureBase() {
  if (S.base) return S.base;
  const loc = S.world.locations[S.world.location];
  S.base = {
    locId: S.world.location,
    name: `${LOC_DEFS[S.world.location].name}·安全屋`,
    inv: {}, facilities: {}, buildQueue: [],
    defense: 3, morale: 55, population: [],
    power: false, powerWaiting: false, foundedDay: S.world.day, starveDays: 0, crops: [], livestock: [], compost: []
  };
  loc.danger = 0;
  loc.zombieCount = 0;
  addLog('【修改器】已在当前位置建立安全屋。', 'sys');
  return S.base;
}

function cheatInv() {
  const target = $('cheatTarget').value;
  if (target === 'base') {
    if (!S.base) { toast('还没有基地，可先点「立即建立基地」。'); return null; }
    return S.base.inv;
  }
  return S.player.inventory;
}

function cheatAddItem() {
  const inv = cheatInv();
  if (!inv) return;
  const id = $('cheatItem').value;
  const qty = parseInt($('cheatQty').value, 10) || 0;
  if (qty <= 0) { toast('数量无效。'); return; }
  if (id === '现金') {
    S.player.money += qty * 100;
    addLog(`【修改器】现金 +¥${qty * 100}。`, 'sys');
  } else {
    addItem(inv, id, qty);
    addLog(`【修改器】${itemName(id)} ×${qty} 已添加。`, 'sys');
  }
  renderAll();
}

function cheatSetItem() {
  const inv = cheatInv();
  if (!inv) return;
  const id = $('cheatItem').value;
  const qty = Math.max(0, parseInt($('cheatQty').value, 10) || 0);
  if (id === '现金') {
    S.player.money = qty * 100;
  } else if (qty <= 0) {
    delete inv[id];
  } else {
    inv[id] = { n: qty, spoil: ITEMS[id].spoil || null };
  }
  addLog(`【修改器】${itemName(id)} 数量已设为 ${qty}。`, 'sys');
  renderAll();
}

function cheatClearItem() {
  const inv = cheatInv();
  if (!inv) return;
  const id = $('cheatItem').value;
  if (id === '现金') S.player.money = 0;
  else delete inv[id];
  addLog(`【修改器】已清除${itemName(id)}。`, 'sys');
  renderAll();
}

function cheatQuick(id, qty) {
  const inv = cheatInv();
  if (!inv) return;
  if (id === '现金') S.player.money += qty * 100;
  else addItem(inv, id, qty);
  addLog(`【修改器】${itemName(id)} ×${qty} 已添加。`, 'sys');
  renderAll();
}

function cheatApplyStats() {
  const p = S.player;
  let changed = false;
  for (const [inputId, , key, max] of CHEAT_STATS) {
    const raw = $('cheat_' + inputId).value;
    if (raw === '') continue;
    const v = parseInt(raw, 10);
    if (!Number.isNaN(v)) {
      p[key] = clamp(v, 0, max);
      changed = true;
    }
  }
  if (changed) addLog('【修改器】人物状态已更新。', 'sys');
  renderAll();
}

function cheatMaxStats() {
  const p = S.player;
  p.health = 100; p.stamina = 100; p.hunger = 0; p.thirst = 0; p.fatigue = 0;
  p.temp = 78; p.mental = 100; p.morale = 80; p.infection = 0; p.wounds = [];
  addLog('【修改器】状态已恢复至最佳。', 'sys');
  renderAll();
}

function cheatHealWounds() {
  S.player.wounds = [];
  addLog('【修改器】伤口已全部清除。', 'sys');
  renderAll();
}

function cheatCureInfection() {
  S.player.infection = 0;
  S.player.infectionControlled = true;
  addLog('【修改器】感染已清除。', 'sys');
  renderAll();
}

function cheatAddHelper() {
  const sex = $('cheatHelperSex').value;
  let name = $('cheatHelperName').value.trim();
  if (!name) name = pick(SURNAMES) + (sex === '男' ? pick(GIVEN_M) : pick(GIVEN_F));
  const age = clamp(parseInt($('cheatHelperAge').value, 10) || 25, 14, 80);
  const prof = PROFESSIONS.find(x => x.id === $('cheatHelperProf').value);
  const role = $('cheatHelperRole').value;
  const ability = $('cheatHelperAbility').value || null;
  const skills = {};
  for (const [k, v] of Object.entries(prof.skills)) skills[k] = v;
  for (const k of ['近战', '远程', '搜索', '医疗', '驾驶', '机械', '电力', '种植', '烹饪', '建造', '谈判', '领导', '科研', '心理', '潜行']) {
    if (skills[k] === undefined) skills[k] = 0;
  }
  const melee = parseInt($('cheatHelperMelee').value, 10);
  const ranged = parseInt($('cheatHelperRanged').value, 10);
  if (!Number.isNaN(melee)) skills['近战'] = clamp(melee, 0, 100);
  if (!Number.isNaN(ranged)) skills['远程'] = clamp(ranged, 0, 100);
  const sv = {
    id: 'npc_' + Math.random().toString(36).slice(2, 9),
    name, sex, age,
    profession: prof.name, profId: prof.id,
    skills,
    health: clamp(parseInt($('cheatHelperHp').value, 10) || 100, 1, 100),
    morale: clamp(parseInt($('cheatHelperMorale').value, 10) || 60, 0, 100),
    loyalty: clamp(parseInt($('cheatHelperLoyalty').value, 10) || 70, 0, 100),
    role, ability,
    weapon: $('cheatHelperWeapon') && $('cheatHelperWeapon').value ? $('cheatHelperWeapon').value : null,
    inv: {},
    traits: ['忠诚', '可靠'],
    alive: true, spouse: null, child: null,
    joinedDay: S.world.day,
    story: '应你之邀加入团队，愿与你一起活下去。'
  };
  ensureBase();
  S.base.population.push(sv);
  addLog(`【修改器】帮手 ${name}（${prof.name}）已加入，担任「${ROLES.find(r => r.id === role).name}」${ability ? `，拥有异能【${ABILITIES[ability].name}】` : ''}。`, 'sys');
  renderAll();
  openCheat();
}

function cheatRemoveNpc(id) {
  const b = S.base;
  if (!b) return;
  const npc = b.population.find(n => n.id === id);
  if (!npc) return;
  b.population = b.population.filter(n => n.id !== id);
  addLog(`【修改器】${npc.name} 已离开团队。`, 'sys');
  renderAll();
  openCheat();
}

function cheatInstantBase() {
  if (S.base) toast('已经有基地了。');
  else ensureBase();
  renderAll();
}

function cheatFinishBuildings() {
  const b = ensureBase();
  for (const q of b.buildQueue) {
    b.facilities[q.id] = 'built';
    addLog(`【修改器】${FACILITIES[q.id].name}已建成。`, 'sys');
  }
  b.buildQueue = [];
  renderAll();
}

function cheatBaseDefense() {
  const b = ensureBase();
  b.defense += 20;
  addLog('【修改器】基地防御 +20。', 'sys');
  renderAll();
}

function cheatBaseMorale() {
  const b = ensureBase();
  b.morale = 80;
  addLog('【修改器】基地士气已设为 80。', 'sys');
  renderAll();
}

function openCheat() {
  const p = S.player;
  const b = S.base;
  const itemOptions = Object.keys(ITEMS).map(id => `<option value="${id}">${itemName(id)} — ${ITEMS[id].desc || ''}</option>`).join('');
  const profOptions = PROFESSIONS.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
  const roleOptions = ROLES.map(r => `<option value="${r.id}" ${r.id === 'guard' ? 'selected' : ''}>${r.name}</option>`).join('');
  const abOptions = `<option value="">无异能</option>` + Object.entries(ABILITIES).map(([id, a]) => `<option value="${id}">${a.name}</option>`).join('');
  const statInputs = CHEAT_STATS.map(([inputId, label, key, max]) =>
    `<div class="field"><label>${label}</label><input id="cheat_${inputId}" type="number" min="0" max="${max}" value="${Math.round(p[key])}"></div>`).join('');
  const npcList = b ? b.population.filter(n => n.alive).map(n => `
    <div class="facility">
      <div><div class="n">${n.sex === '男' ? '🧔' : '👩'} ${escapeHtml(n.name)} <span class="tag">${escapeHtml(n.profession)}</span><span class="tag">${ROLES.find(r => r.id === n.role).name}</span>${n.ability ? `<span class="tag">⚡${ABILITIES[n.ability].name}</span>` : ''}</div>
      <div class="d">生命 ${Math.round(n.health)} · 士气 ${Math.round(n.morale)} · 忠诚 ${Math.round(n.loyalty)}</div></div>
      <button class="btn small danger" onclick="cheatRemoveNpc('${n.id}')">移除</button>
    </div>`).join('') : '';
  const quick = ['瓶装水', 50, '罐头', 50, '木板', 20, '金属', 20, '零件', 20, '燃油', 10, '绷带', 10, '抗生素', 10];
  let quickBtns = '';
  for (let i = 0; i < quick.length; i += 2) {
    quickBtns += `<button class="btn small" onclick="cheatQuick('${quick[i]}', ${quick[i + 1]})">+${quick[i + 1]} ${quick[i]}</button>`;
  }
  const html = `
    <div class="hint" style="color:var(--dim);font-size:12px;margin-bottom:10px;text-align:center;">▼ 内容较多，可向下滚动查看全部 ▼</div>
    <div class="card">
      <div class="card-title">🎒 物品</div>
      <div class="field"><label>添加到哪里</label><select id="cheatTarget"><option value="player">玩家背包</option><option value="base">基地仓库</option></select></div>
      <div class="field" style="margin-top:8px;"><label>选择物品</label><select id="cheatItem">${itemOptions}</select></div>
      <div class="field" style="margin-top:8px;"><label>数量</label><input id="cheatQty" type="number" min="0" max="9999" value="1"></div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="btn small" onclick="cheatAddItem()">添加该数量</button>
        <button class="btn small" onclick="cheatSetItem()">设为该数量</button>
        <button class="btn small danger" onclick="cheatClearItem()">清除该物品</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">${quickBtns}</div>
      <div class="hint" style="color:var(--dim);font-size:12px;margin-top:8px;">快捷按钮会添加到上面选择的「玩家背包 / 基地仓库」。</div>
    </div>
    <div class="card">
      <div class="card-title">❤ 人物状态</div>
      <div class="creation-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;">${statInputs}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="btn small" onclick="cheatApplyStats()">应用修改</button>
        <button class="btn small" onclick="cheatMaxStats()">一键满状态</button>
        <button class="btn small" onclick="cheatHealWounds()">清除伤口</button>
        <button class="btn small" onclick="cheatCureInfection()">清除感染</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">👥 添加帮手</div>
      <div class="creation-grid">
        <div class="field"><label>姓名（留空自动取名）</label><input id="cheatHelperName" type="text" placeholder="自动取名"></div>
        <div class="field"><label>性别</label><select id="cheatHelperSex"><option value="男" selected>男</option><option value="女">女</option></select></div>
        <div class="field"><label>年龄</label><input id="cheatHelperAge" type="number" min="14" max="80" value="25"></div>
        <div class="field"><label>职业（决定基础技能）</label><select id="cheatHelperProf">${profOptions}</select></div>
        <div class="field"><label>岗位</label><select id="cheatHelperRole">${roleOptions}</select></div>
        <div class="field"><label>异能</label><select id="cheatHelperAbility">${abOptions}</select></div>
        <div class="field"><label>生命</label><input id="cheatHelperHp" type="number" min="1" max="100" value="100"></div>
        <div class="field"><label>士气</label><input id="cheatHelperMorale" type="number" min="0" max="100" value="70"></div>
        <div class="field"><label>忠诚</label><input id="cheatHelperLoyalty" type="number" min="0" max="100" value="80"></div>
        <div class="field"><label>近战（0-100）</label><input id="cheatHelperMelee" type="number" min="0" max="100" value="60"></div>
        <div class="field"><label>远程（0-100）</label><input id="cheatHelperRanged" type="number" min="0" max="100" value="40"></div>
        <div class="field"><label>初始武器</label><select id="cheatHelperWeapon">
          <option value="">拳头</option><option value="菜刀">菜刀</option><option value="棒球棍">棒球棍</option>
          <option value="砍刀" selected>砍刀</option><option value="消防斧">消防斧</option><option value="手枪">手枪</option>
          <option value="步枪">步枪</option><option value="武士刀">武士刀</option><option value="霰弹枪">霰弹枪</option>
        </select></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn primary" onclick="cheatAddHelper()">添加帮手</button>
        ${!S.base ? '<span class="hint" style="color:var(--warn);">当前没有基地，添加时将自动在当前位置建立安全屋</span>' : ''}
      </div>
      <div style="margin-top:10px;color:var(--dim);font-size:12px;">岗位说明：「跟随」会陪你外出并肩战斗；「守卫」保卫基地；拾荒/种植/医护/维修分别对应基地产出与治疗。</div>
      ${npcList ? `<div style="margin-top:10px;">${npcList}</div>` : ''}
    </div>
    <div class="card">
      <div class="card-title">🏕 基地</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn small" onclick="cheatInstantBase()">${S.base ? '已有基地' : '立即建立基地'}</button>
        <button class="btn small" onclick="cheatFinishBuildings()">完成所有在建建筑</button>
        <button class="btn small" onclick="cheatBaseDefense()">防御 +20</button>
        <button class="btn small" onclick="cheatBaseMorale()">士气设为 80</button>
      </div>
    </div>`;
  openModal('🛠 内置修改器', html, '<button class="btn" onclick="closeModal()">隐藏修改器</button>');
}

/* ==================== 开局 / 标题 ==================== */

function initCreationUI() {
  const profSel = $('cProfession');
  profSel.innerHTML = PROFESSIONS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const upd = () => {
    const prof = PROFESSIONS.find(p => p.id === profSel.value);
    $('cProfessionHint').textContent = prof.desc;
  };
  profSel.addEventListener('change', upd);
  upd();

  const abSel = $('cAbilityType');
  abSel.innerHTML = Object.entries(ABILITIES).map(([id, a]) => `<option value="${id}">${a.name} — ${a.desc}</option>`).join('');
  $('cAbility').addEventListener('change', () => {
    $('cAbilityTypeField').classList.toggle('hidden', $('cAbility').value !== 'awakened');
  });

  $('randomBtn').addEventListener('click', randomCreation);
  $('startBtn').addEventListener('click', startFromForm);
  $('loadBtn').addEventListener('click', continueGame);

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.view)));
  $('cheatBtn').addEventListener('click', openCheat);
  $('soundBtn').addEventListener('click', toggleSound);
  $('helpBtn').addEventListener('click', openHelp);
  $('menuBtn').addEventListener('click', openMenu);
  $('modalClose').addEventListener('click', () => { if (ENC) return; closeModal(); });
}

function randomCreation() {
  const names = ['林默', '陈雨', '周野', '王川', '李霜', '张远', '刘青', '赵宁', '吴桐', '孙小满'];
  const sex = pick(['男', '女']);
  $('cName').value = pick(names);
  $('cProfession').value = pick(PROFESSIONS).id;
  $('cProfession').dispatchEvent(new Event('change'));
  $('cBody').value = pick(['good', 'normal', 'normal', 'weak']);
  $('cStart').value = pick(['1', '1', '-3', '3', '30', '365']);
  $('cSupply').value = pick(['poor', 'normal', 'normal', 'prepared', 'rich']);
  $('cAbility').value = pick(['none', 'none', 'none', 'latent', 'awakened', 'random']);
  $('cAbility').dispatchEvent(new Event('change'));
  $('cDeath').value = pick(['permadeath', 'permadeath', 'forgiving']);
}

function startFromForm() {
  const creation = {
    name: $('cName').value.trim() || '无名者',
    sex: $('cSex').value,
    age: clamp(parseInt($('cAge').value, 10) || 27, 14, 80),
    profession: $('cProfession').value,
    body: $('cBody').value,
    startDay: parseInt($('cStart').value, 10),
    supply: $('cSupply').value,
    ability: $('cAbility').value,
    abilityType: $('cAbilityType').value,
    deathMode: $('cDeath').value
  };
  startNewGame(creation);
}

function startNewGame(creation) {
  S = freshState(creation);
  log = [];
  ui.tab = 'actions';
  addLog(`你的名字是 ${creation.name}，一名${S.player.profession}。`, 'sys');
  if (creation.startDay < 0) {
    addLog('今天是灾难来临前的普通一天。新闻里有些奇怪的传言，但没人当真。', 'info');
    addLog('你还有 72 小时。趁一切正常，或许该做点什么。', 'warn');
  } else if (creation.startDay === 1) {
    addLog('尖叫声从楼下传来，紧接着是警笛、枪声与玻璃破碎的声音。一切都发生得太快了。', 'bad');
  } else if (creation.startDay <= 3) {
    addLog('城市已经乱了。街道上横着废弃的汽车，偶尔能听见远处绝望的哭喊。', 'bad');
  } else if (creation.startDay <= 30) {
    addLog('一个月了。水电早已停止，这座城市安静得像一座巨大的坟墓。', 'info');
  } else {
    addLog('一年过去了。你早已习惯废墟、尸群和沉默。世界变了，而你还活着。', 'info');
  }
  addLog('记住：世界不会围着你转。活下去，用你自己的方式。', 'sys');
  showGame();
  renderAll();
  saveToStorage();
}

function continueGame() {
  const data = loadFromStorage();
  if (!data) { toast('没有找到可继续的存档。'); return; }
  S = ensureSaveCompat(data);
  log = [];
  ui.tab = 'actions';
  showGame();
  addLog('【系统】欢迎回来。这个世界一直在等着你。', 'sys');
  renderAll();
}

function showGame() {
  $('titleScreen').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
}

function showTitle() {
  $('gameScreen').classList.add('hidden');
  $('titleScreen').classList.remove('hidden');
  $('loadBtn').classList.toggle('hidden', !loadFromStorage());
}

/* ==================== 奇遇：特殊人物 ==================== */

const SPECIAL_NPC_TEMPLATES = [
  {
    id: 'shenyanqiu', name: '沈砚秋', sex: '女', age: 32, profession: '军医',
    attitude: 'friendly', faction: '军方残部', favorStart: 25, ability: 'heal',
    desc: '背着药箱的军医，眼神疲惫而坚定。',
    story: [
      '爆发前，沈砚秋是野战医院的军医。她的弟弟沈砚舟在城东执勤，从爆发那天起就再没有消息。',
      '医疗队被冲散后，她独自背着药箱穿过大半个城市。她救过很多人，也亲手埋过很多人。',
      '她从不轻易提起自己。只在每次告别时低声说：“如果你见到一个爱吹口琴的年轻士兵，告诉他，姐姐还在等他。”'
    ],
    skills: { 医疗: 72, 心理: 42, 近战: 26, 远程: 22, 搜索: 30 },
    inv: { 绷带: 3, 抗生素: 2, 医疗包: 1, 军粮: 2 },
    dialog: {
      low: ['这年头，药品比子弹金贵。', '你受伤的话别硬撑，伤口感染会要命。', '我见过太多人，死在“明天再说”上。'],
      high: ['如果有我帮得上的地方，尽管开口。', '你比大多数人更懂得活着意味着什么。', '……要是早点遇到你就好了。']
    },
    quest: {
      type: 'items', need: { 抗生素: 2 }, done: false, progress: false, start: 0,
      text: '我弟弟的伤口感染了，急需 2 支抗生素。你能帮帮我吗？',
      doneText: '……谢谢。这些药，或许能救他一条命。',
      reward: { 绷带: 2, 医疗包: 1 }
    }
  },
  {
    id: 'luzheng', name: '陆铮', sex: '男', age: 41, profession: '工程师',
    attitude: 'neutral', faction: '独立', favorStart: 10, ability: null,
    desc: '沉默寡言的中年男人，随身带着一只旧工具箱。',
    story: [
      '陆铮曾是国企的机电工程师。爆发那天，他妻子出门买菜，再也没有回来。',
      '他一个人修好了半条街的电路，却始终没能修好自己。他很少相信陌生人。',
      '他嘴上说“各过各的”，却总在夜里把多余的零件放在别人门口。'
    ],
    skills: { 机械: 70, 电力: 65, 建造: 50, 近战: 30, 搜索: 25 },
    inv: { 工具组: 1, 零件: 4, 金属: 2, 罐头: 2 },
    dialog: {
      low: ['别碰我的工具。', '有话快说，我还要赶在天黑前回去。', '我不欠谁的，谁也不欠我的。'],
      high: ['要修什么？我来看看。', '这年头，会手艺的人不该死那么早。', '你人不错。比大多数人强。']
    },
    quest: {
      type: 'items', need: { 零件: 3, 工具组: 1 }, done: false, progress: false, start: 0,
      text: '我在修一台能供水的发电机，还差 3 个零件和 1 套工具组。',
      doneText: '成了。水要是通了，也有你一份。',
      reward: { 燃油: 2, 零件: 2 }
    }
  },
  {
    id: 'gunanxing', name: '顾南星', sex: '男', age: 27, profession: '记者',
    attitude: 'friendly', faction: '幸存者营地', favorStart: 20, ability: null,
    desc: '挂着破相机的年轻记者，眼睛很亮。',
    story: [
      '顾南星曾是报社记者，专门跑民生新闻。末世后，他决定做一件没人理解的事：记录真相。',
      '他随身带着一台摔碎过三次的相机，里面存着几百张废墟、尸体和普通人的脸。',
      '他说：“如果人类真的没了，至少要有人证明我们活过。”'
    ],
    skills: { 谈判: 45, 心理: 30, 搜索: 35, 潜行: 25, 近战: 15 },
    inv: { 收音机: 1, 瓶装水: 2, 压缩饼干: 3 },
    dialog: {
      low: ['每个人都有自己的故事，你愿意说吗？', '别怕镜头，我只是想记录。', '消息是有价的，朋友。'],
      high: ['你的故事，会是我记录里最重要的一章。', '等文明回来那天，人们会读到这些。', '你信不信，我们做的每件事都会被记住。']
    },
    quest: {
      type: 'visit', target: 'station', done: false, progress: false, start: 0,
      text: '老火车站有一盘磁带，记录着爆发第一天的官方通知。陪我去把它找回来？',
      doneText: '就是它！谢谢你。这段历史，不会被埋没。',
      reward: { 收音机: 1, 电池: 2 }
    }
  },
  {
    id: 'bailu', name: '白露', sex: '女', age: 22, profession: '医学生',
    attitude: 'neutral', faction: '幸存者营地', favorStart: 12, ability: null,
    desc: '抱着旧课本的医学生，说话轻声细语。',
    story: [
      '白露是医学院大三的学生，跟着实习队进城时赶上了爆发。',
      '她救下的第一个人，在三天后变成了丧尸。自那以后，她学会了在眼泪掉下来之前先消毒双手。',
      '她一直带着一本《实用外科学》，扉页上写着奶奶的嘱托：“活着，别怕。”'
    ],
    skills: { 医疗: 55, 烹饪: 30, 心理: 25, 搜索: 20, 近战: 12 },
    inv: { 绷带: 2, 维生素: 2, 水果: 2 },
    dialog: {
      low: ['别离我太近，我不太会和人打交道。', '伤口一定要消毒，哪怕只有一点希望。', '你是来换药品的吗？'],
      high: ['和你说话，让我想起学校里的阳光。', '我学会的东西不多，但都愿意教你。', '谢谢你还愿意听我说这些。']
    },
    quest: {
      type: 'items', need: { 维生素: 2 }, done: false, progress: false, start: 0,
      text: '有个孩子得了坏血病，需要 2 份维生素。你有多余的吗？',
      doneText: '太好了，孩子有救了。这些是我能教的，希望对你有用。',
      reward: { 绷带: 3 }
    }
  },
  {
    id: 'zhaotieshan', name: '赵铁山', sex: '男', age: 58, profession: '老猎人',
    attitude: 'neutral', faction: '独立', favorStart: 10, ability: null,
    desc: '背着猎枪的山区老人，目光像鹰一样锐利。',
    story: [
      '赵铁山在山里打了一辈子猎，末世对他来说只是换了一种猎物。',
      '他的儿子在城里上班，爆发后就断了联系。他带着猎枪进城，已经找了两个多月。',
      '他不识字，却能把风向、脚印和尸群的动向说得一清二楚。'
    ],
    skills: { 远程: 70, 潜行: 55, 搜索: 50, 近战: 40, 医疗: 15 },
    inv: { 军粮: 1, 步枪: 1, 步枪弹: 8, 燃油: 1 },
    dialog: {
      low: ['小娃娃，城里可不是打猎。', '枪要端稳，命才稳。', '我找人，别挡道。'],
      high: ['想学开枪？老头子教你。', '这世道，活下来的都是狠人，你算一个。', '我儿子要是有你一半本事，兴许还活着。']
    },
    quest: {
      type: 'kill', need: 8, done: false, progress: false, start: 0,
      text: '陪我清理掉 8 只丧尸。我这把老骨头，还不想这么早交代。',
      doneText: '痛快！你天生就是拿枪的料。',
      reward: { 步枪弹: 12 }
    }
  },
  {
    id: 'mengzhiwei', name: '孟知微', sex: '女', age: 29, profession: '病毒学家',
    attitude: 'neutral', faction: '科研组织', favorStart: 8, ability: null,
    desc: '戴着碎裂眼镜的病毒学家，笔记本从不离身。',
    story: [
      '孟知微是研究所最年轻的病毒学家。病毒爆发的源头，就藏在她的实验记录里。',
      '研究所沦陷那天，她的导师把最后一份样本塞进她手里，然后把自己锁在了负压室里。',
      '她坚信疫苗存在希望，只是需要时间、电力和一个足够安全的实验室。'
    ],
    skills: { 科研: 80, 电力: 30, 医疗: 30, 搜索: 22, 近战: 10 },
    inv: { 维生素: 2, 抗生素: 1, 电池: 2 },
    dialog: {
      low: ['别碰我的样本，那不是普通试管。', '数据不会说谎，人会。', '我需要安静地工作。'],
      high: ['如果疫苗成功，历史会记住你的帮助。', '你是个可以托付研究的人。', '我欠你的，用人类的名字还。']
    },
    quest: {
      type: 'kill', need: 6, done: false, progress: false, start: 0,
      text: '我需要采集 6 份变异样本——杀掉 6 只丧尸，带回它们的数据。',
      doneText: '数据完整。也许……我们真的有机会。',
      reward: { 维生素: 3, 抗生素: 2 }
    }
  },
  {
    id: 'shigandang', name: '石敢当', sex: '男', age: 38, profession: '掠夺者头目',
    attitude: 'hostile', faction: '掠夺者', favorStart: 0, ability: 'strength',
    desc: '满身旧伤疤的壮汉，腰后别着一把砍刀。',
    story: [
      '石敢当曾是盘踞在城北的掠夺者小头目。一场尸潮把他的队伍吞得只剩他一个。',
      '他杀过人，也抢过粮。他说这世道没有善恶，只有先死后死。',
      '可每到深夜，他会对着西北方向烧一张纸，那是他老家村庄的方向。'
    ],
    skills: { 近战: 70, 远程: 45, 领导: 40, 驾驶: 30, 潜行: 25 },
    inv: { 砍刀: 1, 罐头: 4, 绷带: 1 },
    dialog: {
      low: ['滚远点，我不想脏了手。', '你们这些软骨头，活不过下个冬天。', '再看一眼，就把你眼珠子挖出来。'],
      high: ['……你有点意思。', '我认你这个人。真到了那天，我替你挡刀。', '我石敢当说话算话。']
    },
    quest: {
      type: 'items', need: { 罐头: 5 }, done: false, progress: false, start: 0,
      text: '我三天没吃饱了。给我 5 个罐头，算我欠你的。',
      doneText: '够意思。从今天起，你的事就是我的事。',
      reward: { 砍刀: 1, 军粮: 2 }
    }
  },
  {
    id: 'jiangxiaoman', name: '江小满', sex: '女', age: 17, profession: '学生',
    attitude: 'friendly', faction: '独立', favorStart: 30, ability: null,
    desc: '背着旧书包的高中生，眼睛红红的，却不肯哭。',
    story: [
      '江小满是市一中的高三学生。爆发那天，她的父母去学校接她，却在半路失散。',
      '她把父母的名字写在每一面她能找到的墙上，希望有一天能得到回音。',
      '她学会了很多不属于这个年纪的事：辨认脚印、听尸群的方向、把哭声咽进肚子里。'
    ],
    skills: { 搜索: 25, 潜行: 20, 心理: 20, 近战: 15, 医疗: 15 },
    inv: { 面包: 1, 瓶装水: 1, 电池: 1 },
    dialog: {
      low: ['你……你有吃的吗？一点点也行。', '我在找我爸妈，你见过他们吗？', '别赶我走，我不会添麻烦的。'],
      high: ['谢谢你，你就像我姐姐/哥哥一样。', '等我找到爸妈，一定带他们来谢谢你。', '有你在，我就不那么害怕了。']
    },
    quest: {
      type: 'visit', target: 'school', done: false, progress: false, start: 0,
      text: '陪我去学校看看吧。爸妈说好了会去那里等我。',
      doneText: '墙上……是爸爸的字！他们还活着！',
      reward: { 罐头: 2, 瓶装水: 2 }
    }
  },
  {
    id: 'tangruoxue', name: '唐若雪', sex: '女', age: 34, profession: '电台播音员',
    attitude: 'friendly', faction: '幸存者营地', favorStart: 22, ability: null,
    desc: '声音温柔的电台主播，随身带着一只缠满胶带的麦克风。',
    story: [
      '唐若雪曾是城市电台的夜班主播。末世后，她守着最后一段能用的频率，把“明天见”说给所有还活着的人听。',
      '有人说她的声音是废墟里唯一的灯。她笑：“我不过是替大家说一声，我们还在。”',
      '电台设备坏掉后，她依然每天对着坏掉的麦克风练习播报，等一个能把声音传出去的人。'
    ],
    skills: { 谈判: 45, 心理: 45, 搜索: 30, 医疗: 10, 近战: 10 },
    inv: { 收音机: 1, 电池: 2, 瓶装水: 1, 压缩饼干: 2 },
    dialog: {
      low: ['各位听众，这里是若雪……今天也要活下去。', '声音是可以救人的，你信吗？', '你有听到过什么广播吗？'],
      high: ['等电台修好了，我要把你的故事播出去。', '你让我相信，话筒那边真的有人在听。', '我们一起把“明天见”说下去吧。']
    },
    quest: {
      type: 'items', need: { 零件: 3, 电池: 2 }, done: false, progress: false, start: 0,
      text: '我的发射机坏了。给我 3 个零件和 2 节电池，我就能让声音重新传出去。',
      doneText: '通了！各位听众，这里是若雪——我们，回来了。',
      reward: { 收音机: 1, 现金: 800 }
    }
  },
  {
    id: 'heyunfan', name: '贺云帆', sex: '男', age: 29, profession: '快递员',
    attitude: 'friendly', faction: '独立', favorStart: 25, ability: null,
    desc: '推着一辆旧电瓶车的年轻人，对城市的每一条小路烂熟于心。',
    story: [
      '贺云帆是外卖骑手，跑遍过这座城市的每个角落。末世后，他的车后座从外卖箱变成了物资箱。',
      '他的同事大刘在仓库区失踪。所有人都劝他别去找，可他记得大刘说过：“兄弟，最后一单我请你。”',
      '他还在帮人送“最后一单”：给病床上的老人送药，给躲在地下室的孩子送糖。'
    ],
    skills: { 驾驶: 50, 搜索: 40, 潜行: 30, 近战: 20, 谈判: 15 },
    inv: { 能量饮料: 2, 罐头: 1, 面包: 1 },
    dialog: {
      low: ['要送点什么？城区我熟。', '这条路有尸群，我带你绕。', '做骑手这么久，我别的不会，就是会跑。'],
      high: ['大刘的事……谢谢你放在心上。', '以后你的货，我包送。', '这破城里，你是我为数不多的朋友。']
    },
    quest: {
      type: 'visit', target: 'warehouse', done: false, progress: false, start: 0,
      text: '大刘最后去了物流仓库。陪我去找找他的下落。',
      doneText: '这是大刘的工牌……他还活着，他肯定还活着。',
      reward: { 罐头: 2, 现金: 500 }
    }
  },
  {
    id: 'songqinghe', name: '宋青禾', sex: '女', age: 45, profession: '护士长',
    attitude: 'friendly', faction: '军方残部', favorStart: 28, ability: 'heal',
    desc: '军医院的护士长，白大褂洗得发旧，却一丝不苟。',
    story: [
      '宋青禾在军医院干了二十年，带过一批又一批护士。末世里，她的小组只剩下了她自己。',
      '她有一个随身本子，上面记着每一个没能救回来的人的名字。她说，忘了他们，才是真的死了。',
      '她最怕的不是丧尸，而是有人说“算了，别治了”。'
    ],
    skills: { 医疗: 68, 心理: 38, 烹饪: 25, 近战: 18, 搜索: 20 },
    inv: { 绷带: 4, 消毒剂: 2, 维生素: 1, 军粮: 1 },
    dialog: {
      low: ['伤口处理了吗？给我看看。', '药要省着用，命也要省着拼。', '别怕，护士在呢。'],
      high: ['有你在，我心里踏实。', '我这本子上的名字，已经很久没增加了。', '救一个人，就是救一个世界。']
    },
    quest: {
      type: 'items', need: { 绷带: 3 }, done: false, progress: false, start: 0,
      text: '临时医疗点的绷带用完了。能给我 3 个绷带吗？',
      doneText: '谢谢你。有了这些，他们就能挺过今晚。',
      reward: { 医疗包: 1, 消毒剂: 2 }
    }
  },
  {
    id: 'weidonglai', name: '卫东来', sex: '男', age: 55, profession: '水厂维修工',
    attitude: 'neutral', faction: '独立', favorStart: 10, ability: null,
    desc: '满手油污的维修工，总爱眯着眼看管道的走向。',
    story: [
      '卫东来在水厂修了三十年管道，城市地下管网的走向都在他脑子里。',
      '爆发时他正在抢修一条主管道。等他回到地面，世界已经变了。他的妻子和女儿住在城南，生死不明。',
      '他说，只要水泵还能转，人就还有救。'
    ],
    skills: { 机械: 65, 电力: 50, 建造: 35, 搜索: 25, 近战: 20 },
    inv: { 工具组: 1, 零件: 3, 金属: 1, 罐头: 1 },
    dialog: {
      low: ['水泵不响，人就慌。', '别踩那管子，还能用。', '你会修东西吗？不会就边上看着。'],
      high: ['等水通了，我第一个给你接上。', '这手艺，我教你。', '我女儿要是有你这样的朋友，就好了。']
    },
    quest: {
      type: 'items', need: { 零件: 4, 工具组: 1 }, done: false, progress: false, start: 0,
      text: '我想把南边的泵站修起来，还差 4 个零件和 1 套工具组。',
      doneText: '转起来了！水，就是活路啊。',
      reward: { 净水: 3, 零件: 2 }
    }
  },
  {
    id: 'wenlan', name: '温澜', sex: '女', age: 25, profession: '幼儿园老师',
    attitude: 'friendly', faction: '守望者教会', favorStart: 30, ability: 'calm',
    desc: '牵着几个孩子的年轻老师，笑容安静而温暖。',
    story: [
      '温澜是幼儿园老师。爆发那天，她带着五个没等到家长的孩子躲进了教堂。',
      '她给孩子们编了歌谣：“天黑不要怕，手拉手回家。”孩子们真的就不再哭了。',
      '她说，总得有人去照顾“未来”。哪怕明天再糟，也不能让孩子们忘了怎么笑。'
    ],
    skills: { 心理: 40, 烹饪: 35, 医疗: 25, 领导: 20, 近战: 10 },
    inv: { 面包: 2, 水果: 1, 瓶装水: 1 },
    dialog: {
      low: ['孩子们都睡了，我们小声点。', '你能分我们一点吃的吗？一点点就好。', '他们问我，爸爸妈妈什么时候回来。我不知道怎么回答。'],
      high: ['孩子们说你是好人。', '谢谢你没赶我们走。', '等他们长大了，我会告诉他们，是很多人一起守护了他们。']
    },
    quest: {
      type: 'items', need: { 罐头: 3 }, done: false, progress: false, start: 0,
      text: '孩子们的存粮快没了。能给我们 3 个罐头吗？',
      doneText: '谢谢……今晚，他们能吃一顿热乎的了。',
      reward: { 净水: 2, 蔬菜: 2 }
    }
  },
  {
    id: 'qilaojiu', name: '戚老九', sex: '男', age: 63, profession: '游方郎中',
    attitude: 'friendly', faction: '商队', favorStart: 24, ability: 'heal',
    desc: '挑着药担的老中医，胡子花白，眼睛却很精神。',
    story: [
      '戚老九行医四十多年，走南闯北，什么病都见过。末世后，他的药担子成了流动诊所。',
      '他用最少的药救最多的人，也常常只收一句“谢谢”。',
      '他常说：“药能治病，治不了人心。人心坏了，才真没救了。”'
    ],
    skills: { 医疗: 62, 谈判: 35, 烹饪: 25, 心理: 30, 搜索: 20 },
    inv: { 抗生素: 1, 维生素: 2, 绷带: 2, 净水: 1 },
    dialog: {
      low: ['把手伸出来，老头子给你号号脉。', '你这脸色，最近没睡好。', '药不多了，得用在刀刃上。'],
      high: ['你身子骨不错，心肠更好。', '我这身本事，你想学，我倾囊相授。', '乱世里遇到你这样的后生，是福气。']
    },
    quest: {
      type: 'items', need: { 维生素: 2 }, done: false, progress: false, start: 0,
      text: '我要配一副增强体质的药，还差 2 份维生素。',
      doneText: '齐了。这药，分你一半。',
      reward: { 医疗包: 1, 抗生素: 1 }
    }
  },
  {
    id: 'maerye', name: '马二爷', sex: '男', age: 47, profession: '行商',
    attitude: 'neutral', faction: '商队', favorStart: 8, ability: null,
    desc: '精瘦的商人，袖口别着一把小秤，说话滴水不漏。',
    story: [
      '马二爷跑商队跑了二十年，最会说两句话：“货比三家”和“买卖不成仁义在”。',
      '末世后，他成了南北商路上少有的活地图。哪里的路通，哪里的寨子讲规矩，他一清二楚。',
      '他从不赊账，却在雪天给过路的流民留过一袋粮。'
    ],
    skills: { 谈判: 55, 驾驶: 35, 领导: 25, 搜索: 20, 近战: 15 },
    inv: { 罐头: 5, 燃油: 2, 瓶装水: 3 },
    dialog: {
      low: ['做生意，先看货，再看人。', '这价码，换别人我可不给。', '信息也是货，你出什么价？'],
      high: ['跟你做生意，痛快。', '以后商队路过，头一个找你。', '我马二爷认准的朋友，不会亏待。']
    },
    quest: {
      type: 'items', need: { 燃油: 3 }, done: false, progress: false, start: 0,
      text: '车队回程缺油，给我 3 份燃油，我加倍谢你。',
      doneText: '痛快！这是谢礼，收好。',
      reward: { 罐头: 4, 现金: 1200 }
    }
  },
  {
    id: 'xiaoling', name: '萧翎', sex: '女', age: 28, profession: '武术教练',
    attitude: 'neutral', faction: '独立', favorStart: 12, ability: 'strength',
    desc: '身形利落的武馆教练，指节上缠着旧绷带。',
    story: [
      '萧翎在武馆教了十年咏春。她总说：“拳不是为了打架，是为了让害怕的人敢站着。”',
      '末世后，她用这双拳头护着一整条街的老人和孩子，直到尸潮把那里淹没。',
      '她不再轻易相信陌生人，但依然会在出拳前，先给对手留一句“让开”。'
    ],
    skills: { 近战: 70, 潜行: 35, 心理: 25, 远程: 20, 医疗: 10 },
    inv: { 棒球棍: 1, 军粮: 1, 绷带: 1 },
    dialog: {
      low: ['站远点，我不习惯背后有人。', '想活命，先学会站稳。', '你的架势，漏洞太多。'],
      high: ['你的底子不错，我可以教你两招。', '和你并肩，我不怕后背。', '这条街上，我信你。']
    },
    quest: {
      type: 'kill', need: 10, done: false, progress: false, start: 0,
      text: '陪我清理 10 只丧尸。这条街，该有人把它要回来了。',
      doneText: '打得漂亮。你比我想象的强。',
      reward: { 军粮: 2, 绷带: 2 }
    }
  },
  {
    id: 'lengmianfo', name: '冷面佛', sex: '男', age: 44, profession: '独行打手',
    attitude: 'hostile', faction: '掠夺者', favorStart: 0, ability: 'strength',
    desc: '面无表情的壮汉，脸上的旧疤像一道裂开的墙。',
    story: [
      '冷面佛曾是拆迁队里“平事”的人，刀口上讨生活。末世后，他反而成了最守规矩的那个。',
      '他只信两样东西：手里的刀，和口袋里的粮。',
      '没人知道，他每次抢来的口粮，都偷偷分了一半给城北一个坐轮椅的女孩。那是他妹妹。'
    ],
    skills: { 近战: 72, 远程: 40, 潜行: 30, 领导: 25, 驾驶: 20 },
    inv: { 砍刀: 1, 罐头: 3, 绷带: 1 },
    dialog: {
      low: ['滚。', '别挡路，我不欠你什么。', '刀比嘴管用。'],
      high: ['你……不一样。', '我这个人，认死理：谁对我好，我护谁。', '要真有一天，这条命给你也成。']
    },
    quest: {
      type: 'items', need: { 军粮: 3 }, done: false, progress: false, start: 0,
      text: '给我 3 份军粮。别问为什么。',
      doneText: '……这情，我记着。比命重。',
      reward: { 砍刀: 1, 手枪弹: 8 }
    }
  },
  {
    id: 'luoxueying', name: '洛雪莹', sex: '女', age: 36, profession: '农场主',
    attitude: 'friendly', faction: '独立', favorStart: 26, ability: null,
    desc: '手上满是泥土的农场主，说起庄稼时眼里有光。',
    story: [
      '洛雪莹经营着一片有机农场。爆发后，她的农场成了附近幸存者最后的粮仓。',
      '她带着雇工们挖壕沟、装围栏，硬是把一片菜地守成了堡垒。',
      '她相信土地不会骗人：“你种下什么，它就还你什么。”'
    ],
    skills: { 种植: 72, 烹饪: 35, 领导: 25, 机械: 20, 医疗: 15 },
    inv: { 种子: 3, 蔬菜: 2, 鸡蛋: 1, 净水: 1 },
    dialog: {
      low: ['来换菜的吗？', '种子金贵，别浪费。', '这土，肥力还够。'],
      high: ['想要种子？我教你种。', '等丰收了，我送你一筐。', '能在乱世里一起种地的人，不多了。']
    },
    quest: {
      type: 'items', need: { 种子: 4 }, done: false, progress: false, start: 0,
      text: '冬小麦该补种了，能给我 4 份种子吗？',
      doneText: '种下去了。明年这个时候，就有新粮了。',
      reward: { 蔬菜: 3, 鸡蛋: 3 }
    }
  },
  {
    id: 'chuqingmo', name: '楚青墨', sex: '男', age: 31, profession: '图书管理员',
    attitude: 'neutral', faction: '守望者教会', favorStart: 10, ability: null,
    desc: '戴着圆框眼镜的图书管理员，怀里总抱着一摞书。',
    story: [
      '楚青墨在图书馆工作。爆发后，他冒死一次次回到馆里，把还能读的书搬进教堂。',
      '他说：“人可以死，文明不能只剩尸体。”',
      '他教孩子们认字，也给大人们读诗。那些夜晚，是他和很多人唯一的慰藉。'
    ],
    skills: { 科研: 30, 心理: 42, 谈判: 25, 搜索: 25, 近战: 10 },
    inv: { 旧衣服: 1, 罐头: 1, 瓶装水: 1 },
    dialog: {
      low: ['这本《荒原》送给你。', '书不重，重的是里面的字。', '你读过诗吗？'],
      high: ['我把你的故事写进了笔记。', '文明会回来的，先从一页纸开始。', '谢谢你护住了这些书，也护住了我。']
    },
    quest: {
      type: 'visit', target: 'school', done: false, progress: false, start: 0,
      text: '学校还有一批教材没搬出来。陪我去一趟吧。',
      doneText: '教材都在。下一代，还有学可上。',
      reward: { 罐头: 2, 维生素: 1 }
    }
  },
  {
    id: 'suwanqing', name: '苏晚晴', sex: '女', age: 24, profession: '兽医',
    attitude: 'friendly', faction: '幸存者营地', favorStart: 25, ability: 'heal',
    desc: '背着医药箱的兽医，裤脚上还沾着干草。',
    story: [
      '苏晚晴在兽医院工作。末世后，她治过受伤的军犬，也治过发烧的孩子。',
      '她说，生灵都值得救，无论两条腿还是四条腿。',
      '她一直收养着一只瘸腿的流浪狗，名字叫“回来”。'
    ],
    skills: { 医疗: 58, 心理: 30, 搜索: 25, 烹饪: 25, 近战: 15 },
    inv: { 绷带: 2, 维生素: 1, 罐头: 1 },
    dialog: {
      low: ['别怕，我只会救人，不会伤人。', '你的伤口让我看看。', '这只狗叫回来，它很乖。'],
      high: ['“回来”很喜欢你，它看人很准。', '救死扶伤，不分物种。', '有你在，我就不用一个人了。']
    },
    quest: {
      type: 'items', need: { 抗生素: 1 }, done: false, progress: false, start: 0,
      text: '“回来”的伤口发炎了，能给我 1 支抗生素吗？',
      doneText: '它不瘸了。你看，它在冲你摇尾巴。',
      reward: { 绷带: 3, 罐头: 1 }
    }
  },
  {
    id: 'yantiejun', name: '严铁军', sex: '男', age: 51, profession: '退伍军官',
    attitude: 'neutral', faction: '军方残部', favorStart: 12, ability: null,
    desc: '腰背笔直的退伍军官，旧军装洗得发白。',
    story: [
      '严铁军当过侦察连连长。纪律、兄弟、任务，是他一辈子的信条。',
      '末世后，他带着最后几个兵守着一处避难所，直到弹尽粮绝。',
      '他依然在等一道“正式命令”。可他也明白，有些命令，永远不会再来了。'
    ],
    skills: { 远程: 58, 领导: 48, 近战: 42, 驾驶: 30, 医疗: 20 },
    inv: { 手枪: 1, 手枪弹: 10, 军粮: 2 },
    dialog: {
      low: ['报上你的来历。', '纪律，是活下去的底线。', '我不跟散兵游勇打交道。'],
      high: ['你是个能带队的人。', '如果还有建制，我会推荐你。', '我的兵，可以交给你。']
    },
    quest: {
      type: 'kill', need: 12, done: false, progress: false, start: 0,
      text: '帮我清剿 12 只丧尸，这片区域需要一次像样的行动。',
      doneText: '目标清除。你通过考验了。',
      reward: { 步枪弹: 16, 军粮: 2 }
    }
  },
  {
    id: 'linjiayin', name: '林嘉茵', sex: '女', age: 33, profession: '外科医生',
    attitude: 'neutral', faction: '企业避难所', favorStart: 10, ability: 'heal',
    desc: '神色疲惫的外科医生，白大褂上还别着避难所的工牌。',
    story: [
      '林嘉茵曾是企业避难所的首席外科医生。避难所许诺“庇护所有人”，却把感染者当成了耗材。',
      '她亲眼看着那些被送进“隔离区”的人再也没有回来。终于，她偷走了一份名单逃了出来。',
      '她想把真相说出去，可没人愿意相信一个“避难所逃兵”。'
    ],
    skills: { 医疗: 70, 科研: 25, 心理: 30, 近战: 15, 搜索: 20 },
    inv: { 医疗包: 1, 绷带: 2, 抗生素: 1 },
    dialog: {
      low: ['别问我的过去。', '避难所……没你想得那么好。', '我需要药品，也只需要药品。'],
      high: ['你是第一个相信我的人。', '那份名单，就藏在我的衬里。', '如果真相有用，我想把它交给对的人。']
    },
    quest: {
      type: 'items', need: { 医疗包: 1 }, done: false, progress: false, start: 0,
      text: '一个重伤员撑不过今晚了。给我 1 个医疗包。',
      doneText: '他挺过来了。谢谢你，也替这世界谢谢你的药。',
      reward: { 抗生素: 2, 维生素: 1 }
    }
  }
];

/* ==================== 奇遇：剧情事件 ==================== */

const ADVENTURE_EVENTS = [
  {
    id: 'starving_child', icon: '🍞', title: '巷口的孩子',
    cond: () => true,
    scenes: {
      start: {
        text: '你在一条小巷里遇到一个小女孩，七八岁的样子，抱着一只空罐头盒，眼睛一眨不眨地看着你。她不说话，只是看着你手里的食物。',
        choices: [
          { label: '把食物分给她', hint: '消耗 1 份食物', needAny: ['罐头', '压缩饼干', '军粮', '面包'], failText: '你翻遍口袋，拿不出任何食物。她垂下了眼睛。',
            text: '她狼吞虎咽地吃完了。临走前，她告诉你她叫糖糖，然后飞快地跑进了巷子深处。',
            effects: { stats: { morale: 6 }, tag: '仁慈', flags: { fed_child: true } } },
          { label: '只给她一瓶水', hint: '消耗 1 份饮水', needAny: ['瓶装水', '净水'], failText: '你身上连一口干净的水都没有。',
            text: '她接过水，小口小口地喝。你似乎看见她冲你笑了一下。',
            effects: { stats: { morale: 3 }, tag: '仁慈', flags: { fed_child: 'water' } } },
          { label: '转身离开', text: '你快步离开。身后似乎传来一声很轻的“谢谢”，也可能没有。',
            effects: { stats: { mental: -4 }, tag: '冷漠' } }
        ]
      }
    }
  },
  {
    id: 'child_gift', icon: '🖍', title: '糖糖的谢礼',
    cond: s => s.world.flags.adventure.fed_child && !s.world.flags.adventure.child_gift,
    scenes: {
      start: {
        text: '几天后，你在落脚处门口发现一个用旧布包着的小包。里面是两罐罐头和一张蜡笔画，画上是两个手拉手的人。右下角歪歪扭扭地写着：“谢谢。”',
        choices: [
          { label: '收下这份心意', text: '你把那幅画折好，放进了贴身的衣袋里。',
            effects: { items: [['罐头', 2]], stats: { morale: 5 }, flags: { child_gift: true } } }
        ]
      }
    }
  },
  {
    id: 'researcher', icon: '🧪', title: '白大褂的女人',
    cond: () => true,
    scenes: {
      start: {
        text: '一间废弃诊所里，一个穿白大褂的女人正借着烛光写着什么。听到脚步声，她猛地抬头，手里的手术刀举到一半又慢慢放下：“你……也是来找药的吗？”',
        choices: [
          { label: '把药品分给她', hint: '需要 抗生素×1、消毒剂×1', need: { 抗生素: 1, 消毒剂: 1 },
            failText: '你翻遍背包，拿不出她要的东西。她苦笑了一下：“没关系，大家都不容易。”',
            text: '她接过药品，双手有些发抖：“我叫林薇，是市疾控的。如果疫苗有希望，我会找到你的。”',
            effects: { stats: { morale: 4 }, tag: '仁慈', flags: { researcher_helped: true }, items: [['医疗包', 1]] } },
          { label: '问她病毒的事', next: 'talk' },
          { label: '给她一件武器防身', hint: '需要 菜刀/砍刀/撬棍', needAny: ['菜刀', '砍刀', '撬棍'],
            failText: '你身上没有多余的武器。',
            text: '她握紧了你递过去的武器，认真地说：“这份人情，我记下了。”',
            effects: { tag: '仁慈', flags: { researcher_helped: true } } },
          { label: '悄悄离开', text: '你没有打扰她，轻轻带上了门。' }
        ]
      },
      talk: {
        text: '她说，病毒在低温下活性会降低，但仍在变异；真正的希望是一种“活体血清”，可没人知道哪里还有保存完好的样本。',
        choices: [
          { label: '把这些记在心里', text: '这些信息，也许未来能救命。',
            effects: { skills: { 科研: 2 }, flags: { vaccine_hint: true } } }
        ]
      }
    }
  },
  {
    id: 'military_crate', icon: '📦', title: '军车旁的铁箱',
    cond: s => s.world.day > 3,
    scenes: {
      start: {
        text: '巷口翻倒的军车旁，有一只上了锁的铁箱，箱体上还印着一串编号。周围散落着弹壳，这里显然经历过一场恶战。',
        choices: [
          { label: '用工具撬开', hint: '需要 撬棍 或 工具组', needAny: ['撬棍', '工具组'],
            failText: '你手边没有合适的工具，锁纹丝不动。',
            outcomes: [
              { w: 55, text: '撬开了！里面是一支步枪和两盒子弹。', effects: { items: [['步枪', 1], ['步枪弹', 10]] } },
              { w: 25, text: '里面是一把手枪和几发子弹。', effects: { items: [['手枪', 1], ['手枪弹', 8]] } },
              { w: 20, text: '箱子是空的，只有一张写着“补给已转移”的纸条。', effects: {} }
            ] },
          { label: '暴力砸开', hint: '动静很大', outcomes: [
            { w: 45, text: '你砸开了箱子，拿到了里面的罐头和药品。', effects: { items: [['罐头', 3], ['绷带', 2]] } },
            { w: 55, text: '金属撞击声在废墟里格外刺耳……丧尸来了！', effects: { encounter: true } }
          ] },
          { label: '离开', text: '多一事不如少一事。' }
        ]
      }
    }
  },
  {
    id: 'wounded_raider', icon: '🩸', title: '受伤的掠夺者',
    cond: s => s.world.day > 5,
    scenes: {
      start: {
        text: '一个浑身是血的男人靠着墙根，脚边扔着一把砍刀。他嘶声说：“救我……或者，给我个痛快。”',
        choices: [
          { label: '用绷带救他', hint: '需要 绷带×1', need: { 绷带: 1 },
            failText: '你身上没有绷带，只能眼睁睁看着他。',
            outcomes: [
              { w: 55, text: '他止住了血，丢下一句“我欠你一条命”，一瘸一拐地消失在夜色里。', effects: { tag: '仁慈', flags: { saved_raider: true }, stats: { morale: 4 } } },
              { w: 35, text: '他告诉你南边有掠夺者营地，还留给你两罐罐头。', effects: { rep: { raiders: 1 }, items: [['罐头', 2]], flags: { saved_raider: true }, tag: '仁慈' } },
              { w: 10, text: '他趁你不备夺过你的背包想跑！你受了点伤。', effects: { stats: { health: -15 }, wound: { kind: '割伤', sev: 1, infected: false } } }
            ] },
          { label: '搜他的身', text: '你拿走了他身上能用的东西，没有回头。',
            effects: { items: [['罐头', 2], ['砍刀', 1]], money: 300, tag: '机会主义', stats: { mental: -4 } } },
          { label: '了结他的痛苦', text: '一声闷响之后，巷子彻底安静了。你告诉自己，这是仁慈。',
            effects: { stats: { mental: -10, morale: -8 }, tag: '冷血', flags: { killed_raider: true } } },
          { label: '离开', text: '他的死活与你无关。', effects: { stats: { mental: -2 } } }
        ]
      }
    }
  },
  {
    id: 'raider_gift', icon: '🎁', title: '掠夺者的回礼',
    cond: s => s.world.flags.adventure.saved_raider && !s.world.flags.adventure.raider_gift,
    scenes: {
      start: {
        text: '几天后，基地外的空地上出现了一只木箱，旁边压着张字条：“我们老大不喜欢欠人情。箱子里是还你的。”',
        choices: [
          { label: '收下补给', text: '箱子里是罐头、绷带和一张看不懂的路线图。',
            effects: { items: [['罐头', 3], ['绷带', 2]], rep: { raiders: 1 }, flags: { raider_gift: true } } }
        ]
      }
    }
  },
  {
    id: 'church_bell', icon: '🔔', title: '教堂的钟声',
    cond: s => s.world.day > 10,
    scenes: {
      start: {
        text: '破败的教堂里传来孩子的哭声。而教堂外，一群丧尸正被钟声吸引，缓缓围拢过来。',
        choices: [
          { label: '敲响远处的车铃，引开尸群', hint: '有风险', outcomes: [
            { w: 55, text: '你成功把尸群引向了街尾！教堂里的人获救了。', effects: { rep: { camp: 2 }, stats: { morale: 6 }, tag: '英雄', flags: { saved_church: true } } },
            { w: 45, text: '尸群没有全被引开，一部分朝你扑了过来！', effects: { encounter: true } }
          ] },
          { label: '带他们撤离', hint: '需要拥有基地', needBase: true,
            failText: '你连自己的落脚点都没有，能带他们去哪？你只能先离开。',
            text: '你把里面躲着的两户人家带回了基地，孩子们终于止住了哭声。',
            effects: { stats: { morale: 5 }, basePop: 2, tag: '英雄', flags: { saved_church: true }, rep: { camp: 1 } } },
          { label: '悄悄离开', text: '孩子的哭声跟了你很远。', effects: { stats: { mental: -5 }, tag: '冷漠' } }
        ]
      }
    }
  },
  {
    id: 'church_thanks', icon: '🙏', title: '教堂的回礼',
    cond: s => s.world.flags.adventure.saved_church && !s.world.flags.adventure.church_thanks,
    scenes: {
      start: {
        text: '获救的幸存者辗转找到了你。他们没什么值钱的东西，只留下一袋种子和几罐舍不得吃的罐头。',
        choices: [
          { label: '收下', text: '你收下了。在这个世界，善意原来真的会绕一圈回来。',
            effects: { items: [['种子', 3], ['罐头', 2]], stats: { morale: 4 }, flags: { church_thanks: true } } }
        ]
      }
    }
  },
  {
    id: 'mad_oldman', icon: '📢', title: '屋顶上的老人',
    cond: s => s.world.day > 20,
    scenes: {
      start: {
        text: '一个老人站在屋顶，用扩音喇叭声嘶力竭地喊：“新政府成立了！在南边！文明没有死！听见了吗——”',
        choices: [
          { label: '听他讲下去', next: 'info' },
          { label: '给他一些食物', hint: '消耗 1 份食物', needAny: ['罐头', '压缩饼干'], failText: '你身上没有多余的食物。',
            text: '他愣了一下，声音低了下来：“好人……这世道，还有好人。”',
            effects: { stats: { morale: 4 }, tag: '仁慈' } },
          { label: '劝他小声点', text: '他想了想，关掉了喇叭：“你说得对，它们听得见。”',
            effects: { flags: { gov_hint: true } } },
          { label: '离开', text: '疯子在末世里并不少见。' }
        ]
      },
      info: {
        text: '老人说他儿子是南方“复兴联盟”的联络员，短波频率是 49.7。他颤巍巍地塞给你一张揉皱的纸条，上面记着几组坐标。',
        choices: [
          { label: '收下纸条', text: '你把纸条贴身收好。也许有一天，这会是通往新世界的路。',
            effects: { flags: { gov_hint: true, gov_freq: true } } }
        ]
      }
    }
  },
  {
    id: 'south_caravan', icon: '🚩', title: '南方的车队',
    cond: s => s.world.flags.adventure.gov_hint && s.world.day > 100 && !s.world.flags.adventure.newgov,
    scenes: {
      start: {
        text: '一支挂着联盟旗帜的车队从南边驶来。领队跳下车，朝你行了个礼：“复兴联盟感谢每一个把消息传下去的人。”',
        choices: [
          { label: '与他们交换情报', text: '他们用一批物资，换走了你手里那张揉皱的纸条。',
            effects: { items: [['罐头', 4], ['燃油', 2]], rep: { caravan: 2, military: 1 }, flags: { newgov: true }, history: '南方的“复兴联盟”开始与各方幸存者建立联系。' } }
        ]
      }
    }
  },
  {
    id: 'basement_kids', icon: '🚪', title: '地下室的敲击声',
    cond: s => s.world.day > 2,
    scenes: {
      start: {
        text: '超市地下室的冷库门后，传来断断续续的敲击声——里面有人，而且快冻坏了。',
        choices: [
          { label: '撬开门救人', hint: '需要 撬棍 或 工具组', needAny: ['撬棍', '工具组'],
            failText: '没有工具，你打不开这扇门。',
            text: '三个孩子紧紧抱在一起。你把食物留给他们，他们哭着说谢谢。',
            effects: { rescued: 3, rep: { camp: 1 }, stats: { morale: 6 }, tag: '英雄', flags: { saved_kids: true } } },
          { label: '先去别处找工具再来', text: '你记住这个地方，转身去找能撬门的东西。',
            effects: { flags: { kids_pending: true } } },
          { label: '隔着门给他们留食物', hint: '消耗 1 份食物', needAny: ['罐头', '压缩饼干'], failText: '你身上没有能塞进去的食物。',
            text: '你把食物从门缝塞进去，里面的哭声小了些。',
            effects: { stats: { morale: 3 }, tag: '仁慈' } }
        ]
      }
    }
  },
  {
    id: 'kids_return', icon: '🧒', title: '再回地下室',
    cond: s => s.world.flags.adventure.kids_pending && !s.world.flags.adventure.saved_kids,
    scenes: {
      start: {
        text: '你带着工具回到冷库门前。门后的敲击声已经弱了许多，里面的人恐怕撑不了太久。',
        choices: [
          { label: '撬门救人', hint: '需要 撬棍 或 工具组', needAny: ['撬棍', '工具组'],
            failText: '你还是没有合适的工具。',
            text: '门开了。三个孩子获救了，他们把身上最后一颗糖塞给了你。',
            effects: { rescued: 3, rep: { camp: 1 }, stats: { morale: 6 }, tag: '英雄', flags: { saved_kids: true } } },
          { label: '离开', text: '你终究还是转身走了。', effects: { stats: { mental: -6 }, tag: '冷漠', flags: { kids_pending: false } } }
        ]
      }
    }
  },
  {
    id: 'well_dispute', icon: '💧', title: '水井旁的对峙',
    cond: s => s.world.day > 7,
    scenes: {
      start: {
        text: '一处还算干净的水井旁，两个幸存者正互相推搡：“我先看见的！”“你先看见有屁用！”',
        choices: [
          { label: '出面调解', roll: 'negotiate',
            success: { text: '你站在两人中间说了几句。他们最终同意轮流取水，并各自分你一些。', effects: { items: [['净水', 3]], rep: { camp: 1 }, stats: { morale: 3 } } },
            fail: { text: '他们把你当成了来抢水的第三个人，一起朝你挥拳。', effects: { stats: { health: -12 }, wound: { kind: '割伤', sev: 1, infected: false } } } },
          { label: '帮其中一人赶走对方', roll: 'fight',
            success: { text: '你帮着高个子赶走了对方，他分给你两桶水。', effects: { items: [['净水', 2]], tag: '机会主义', stats: { morale: -2 } } },
            fail: { text: '对方比想象中难缠，你被打伤了。', effects: { stats: { health: -18 }, wound: { kind: '抓伤', sev: 2, infected: false } } } },
          { label: '趁乱偷水', roll: 'stealth',
            success: { text: '你悄悄带走了四桶水，没人发现。', effects: { items: [['净水', 4]], tag: '机会主义', stats: { morale: -1 } } },
            fail: { text: '你被发现了，两个人一起追了你半条街。', effects: { stats: { health: -8 }, tag: '谨慎' } } },
          { label: '离开', text: '为了一桶水拼命的人，离得越远越好。' }
        ]
      }
    }
  },
  {
    id: 'buried_cache', icon: '🪨', title: '松动的石板',
    cond: () => true,
    scenes: {
      start: {
        text: '你在一片瓦砾下发现一块松动的石板，下面似乎压着什么东西。',
        choices: [
          { label: '挖开看看', outcomes: [
            { w: 50, text: '是一箱封好的罐头，保存得不错。', effects: { items: [['罐头', 3]] } },
            { w: 25, text: '是一盒子弹和一些零件。', effects: { items: [['手枪弹', 12], ['零件', 2]] } },
            { w: 25, text: '石板下是一只丧尸！它猛地抓住了你的手腕！', effects: { wound: { kind: '抓伤', sev: 2, infected: true } } }
          ] },
          { label: '离开', text: '有些东西，还是别碰为好。' }
        ]
      }
    }
  }
];

/* ==================== 结局定义 ==================== */

const ENDINGS = [
  { id: 'survive', icon: '🌅', name: '生存结局', desc: '在废土上活满整整一年。活着本身，就是胜利。',
    cond: s => s.world.day >= 366, text: '你已经在这片废土上活了整整一年。许多人来了又走，而你还在呼吸。' },
  { id: 'hermit', icon: '⛰', name: '隐居结局', desc: '独自流浪四个月，不与任何人为伴。',
    cond: s => s.world.stat.daysSurvived >= 120 && !s.base, text: '你不信任任何人，也不被任何人需要。你独自在山野与废墟间游荡，只有风知道你的名字。' },
  { id: 'town', icon: '🏘', name: '城镇结局', desc: '把基地发展成 30 人以上的城镇。',
    cond: s => (s.base ? s.base.population.filter(n => n.alive).length : 0) >= 30, text: '你的基地已经是一座初具规模的城镇：有市场、有学堂、有孩子。人们开始叫它“家”。' },
  { id: 'city', icon: '🏙', name: '文明结局', desc: '建立 60 人以上的新城市，重建文明。',
    cond: s => (s.base ? s.base.population.filter(n => n.alive).length : 0) >= 60, text: '你不仅救了自己，还重建了一座城市。灯火重新亮起的那天，历史会记住：文明的种子，是从你的安全屋开始的。' },
  { id: 'research', icon: '🧬', name: '科研结局', desc: '帮助孟知微建立实验室，疫苗取得关键突破。',
    cond: s => !!(s.world.flags.adventure && s.world.flags.adventure.vaccine), text: '孟知微的实验终于成功了。疫苗的关键突破，让人类第一次看见了黎明。' },
  { id: 'warlord', icon: '⚔', name: '战争结局', desc: '成为末世军阀：军方敬畏、城镇归附、无人敢犯。',
    cond: s => s.world.factions.military >= 8 && (s.base ? s.base.population.filter(n => n.alive).length : 0) >= 20 && combatScore(s.player) >= 65,
    text: '你的名字成了南边的传说。军队敬畏你，城镇归附你。你不再是幸存者，而是这个乱世的秩序本身。' },
  { id: 'tycoon', icon: '💰', name: '巨贾结局', desc: '积累超过 20 万现金，用财富重建经济。',
    cond: s => s.player.money >= 200000, text: '现金重新有了意义——因为你让它们有了意义。商路因你而重开，废墟上开始有了市场。' },
  { id: 'savior', icon: '🕊', name: '救世结局', desc: '公开疫苗配方，让全人类重获希望。',
    cond: s => !!(s.world.flags.cure && s.world.flags.cure.choice === 'public'),
    text: '配方被抄送到每一台电台。数月后，第一批接种者走出了阴影。人类的历史，从此分为“你之前”和“你之后”。' },
  { id: 'monopoly', icon: '🔒', name: '垄断结局', desc: '把疫苗掌握在自己手中，成为新世界的守门人。',
    cond: s => !!(s.world.flags.cure && s.world.flags.cure.choice === 'hoard'),
    text: '疫苗只有你有。人们匍匐在你的门前，祈求一线生机。你握着钥匙，成了这个乱世真正的神。' },
  { id: 'newWorld', icon: '🌏', name: '新世界结局', desc: '活到第四年，见证人类与丧尸的新生态。',
    cond: s => s.world.day >= 1461, text: '第四年，世界已经完全变了样子。丧尸成为生态的一部分，人类学会了与它们共存。而你的故事，将成为新世界的传说。' }
];

/* ==================== 奇遇引擎 ==================== */

let ADVENTURE = null;
let ACTIVE_NPC = null;
let TRADE = null;

function maybeAdventure() {
  if (!S || S.world.flags.dead || ENC || ADVENTURE) return;
  if (chance(SETTINGS.adventureRate)) rollAdventure();
}

function rollAdventure() {
  if (!S || S.world.flags.dead || ENC || ADVENTURE) return;
  const unMet = S.world.specialNpcs.filter(n => n.alive && !n.recruited && !n.met);
  if (unMet.length && chance(0.35)) {
    spawnAdventureNpc(pick(unMet));
    return;
  }
  const pool = ALL_EVENTS.filter(e => !e.campaign && (!e.cond || e.cond(S)));
  if (pool.length && chance(0.9)) {
    runAdventureEvent(pick(pool));
    return;
  }
  smallDiscovery();
}

function applyAdvEffects(eff) {
  if (!eff) return;
  const p = S.player;
  if (eff.items) {
    for (const [id, qty] of eff.items) {
      if (qty < 0) removeItem(p.inventory, id, -qty);
      else if (id === '现金') p.money += qty * 100;
      else addItem(p.inventory, id, qty);
    }
  }
  if (eff.money) p.money += eff.money;
  if (eff.stats) for (const [k, v] of Object.entries(eff.stats)) p[k] = clamp((p[k] || 0) + v, 0, 100);
  if (eff.skills) for (const [k, v] of Object.entries(eff.skills)) p.skills[k] = clamp((p.skills[k] || 0) + v, 0, 100);
  if (eff.wound) addWound(eff.wound.kind, eff.wound.sev, eff.wound.infected);
  if (eff.infection) gainInfection(eff.infection, '未知感染源');
  if (eff.tag) addTag(eff.tag);
  if (eff.rep) for (const [k, v] of Object.entries(eff.rep)) S.world.factions[k] = clamp(S.world.factions[k] + v, -5, 10);
  if (eff.flags) Object.assign(S.world.flags.adventure, eff.flags);
  if (eff.history) S.world.history.push(`${fmtTime(S.world.day)}：${eff.history}`);
  if (eff.favor) {
    const n = S.world.specialNpcs.find(x => x.id === eff.favor.id);
    if (n) { n.favor = clamp(n.favor + eff.favor.amt, 0, 100); npcAttitudeCheck(n); }
  }
  if (eff.rescued) S.world.stat.rescued += eff.rescued;
  if (eff.basePop) {
    const b = ensureBase();
    for (let i = 0; i < eff.basePop; i++) b.population.push(makeSurvivor());
  }
  if (eff.campFlags) Object.assign(S.world.flags.camp, eff.campFlags);
  if (eff.joinFaction) {
    S.world.flags.factionJoined = eff.joinFaction;
    S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 加入了${FACTION_NAMES[eff.joinFaction]}。`);
  }
  if (eff.cure) {
    if (eff.cure.stage === 1 && eff.cure.start === undefined) eff.cure.start = S.world.stat.kills;
    Object.assign(S.world.flags.cure || (S.world.flags.cure = {}), eff.cure);
  }
  if (eff.vehicle && !S.world.vehicle) {
    S.world.vehicle = { name: eff.vehicle.name || '越野车', fuel: 100, cond: 100, trunk: {} };
    unlockAch('car');
  }
}

function runAdventureEvent(ev) {
  ADVENTURE = { ev, scene: 'start' };
  addLog(`【奇遇】${ev.title}`, 'sys');
  showAdventureScene();
}

function showAdventureScene() {
  if (!ADVENTURE) return;
  const sc = ADVENTURE.ev.scenes[ADVENTURE.scene];
  const txt = typeof sc.text === 'function' ? sc.text(S) : sc.text;
  const foot = sc.choices.map((c, i) =>
    `<button class="choice" onclick="adventureChoice(${i})"><span class="t">${c.label}</span>${c.hint ? `<span class="d">${c.hint}</span>` : ''}</button>`).join('');
  openModal(`${ADVENTURE.ev.icon} ${ADVENTURE.ev.title}`,
    `<div class="narrative">${txt}</div><div class="choice-list">${foot}</div>`,
    '', false);
}

function advNeedMet(c) {
  if (c.needBase && !S.base) return false;
  if (c.need) {
    for (const [id, n] of Object.entries(c.need)) {
      if (countInv(S.player.inventory, id) < n) return false;
    }
  }
  if (c.needAny) {
    if (!c.needAny.some(id => countInv(S.player.inventory, id) > 0)) return false;
  }
  return true;
}

function advConsumeNeed(c) {
  if (c.needAny) {
    const id = c.needAny.find(x => countInv(S.player.inventory, x) > 0);
    if (id) removeItem(S.player.inventory, id, 1);
  }
  if (c.need) {
    for (const [id, n] of Object.entries(c.need)) removeItem(S.player.inventory, id, n);
  }
}

function adventureChoice(i) {
  if (!ADVENTURE) return;
  const sc = ADVENTURE.ev.scenes[ADVENTURE.scene];
  const c = sc.choices[i];
  if (!advNeedMet(c)) {
    openModal(`${ADVENTURE.ev.icon} ${ADVENTURE.ev.title}`,
      `<div class="narrative">${c.failText || '你做不到这件事。'}</div>`,
      '<button class="btn" onclick="adventureEnd()">继续</button>', false);
    return;
  }
  advConsumeNeed(c);
  if (c.action) {
    const fn = (typeof window !== 'undefined' && window[c.action]) || (typeof globalThis !== 'undefined' && globalThis[c.action]);
    if (typeof fn === 'function') { fn(); return; }
  }
  let eff = Object.assign({}, c.effects || {});
  let resultText = c.text || '';
  if (c.outcomes) {
    const o = weightPick(c.outcomes.map(x => [x, x.w]));
    eff = Object.assign({}, eff, o.effects || {});
    resultText = o.text || resultText;
  } else if (c.roll) {
    const p = S.player;
    const base = c.roll === 'negotiate' ? 0.35 + p.skills.谈判 * 0.005
      : c.roll === 'stealth' ? 0.45 + p.skills.潜行 * 0.004
      : 0.5 + (p.skills.近战 + p.skills.远程) * 0.002;
    const r = chance(clamp(base, 0.1, 0.9)) ? c.success : c.fail;
    eff = Object.assign({}, eff, r.effects || {});
    resultText = r.text;
  }
  applyAdvEffects(eff);
  if (resultText) addLog(resultText, 'info');
  if (eff.encounter) {
    ADVENTURE = null;
    closeModal();
    startEncounter(S.world.location, { origin: S.world.location, surprise: chance(0.4) });
    return;
  }
  if (c.next && ADVENTURE.ev.scenes[c.next]) {
    ADVENTURE.scene = c.next;
    showAdventureScene();
  } else {
    adventureResult(resultText || '你离开了这里。');
  }
}

function adventureResult(text) {
  openModal('✨ 奇遇结果',
    `<div class="narrative">${escapeHtml(text)}</div>`,
    '<button class="btn primary" onclick="adventureEnd()">继续</button>');
}

function adventureEnd() {
  ADVENTURE = null;
  closeModal();
  renderAll();
}

function smallDiscovery() {
  const pool = [
    { text: '你在路边捡到几瓶没开封的水。', effects: { items: [['瓶装水', 2]] } },
    { text: '一家关门的小店里，货架底层还剩些罐头。', effects: { items: [['罐头', 2]] } },
    { text: '你发现一具背着医疗包的遇难者。', effects: { items: [['绷带', 2]], stats: { mental: -2 } } },
    { text: '一辆废弃卡车里还有半箱燃油。', effects: { items: [['燃油', 2]] } },
    { text: '风里飘来烤土豆的香味，你的心情好了一些。', effects: { stats: { morale: 4 } } }
  ];
  const o = pick(pool);
  applyAdvEffects(o.effects);
  addLog(o.text, 'good');
  openModal('✨ 偶然发现', `<div class="narrative">${o.text}</div>`, '<button class="btn" onclick="closeModal()">继续赶路</button>');
}

/* ==================== 奇遇人物互动 ==================== */

function getActiveNpc() {
  return S.world.specialNpcs.find(n => n.id === ACTIVE_NPC);
}

function spawnAdventureNpc(npc) {
  npc.met = true;
  npc.location = S.world.location;
  const loc = S.world.locations[S.world.location];
  if (!loc.npcs.includes(npc.id)) loc.npcs.push(npc.id);
  addLog(`【奇遇】你遇到了 ${npc.name}（${npc.profession}）。`, 'sys');
  meetNpc(npc.id);
}

function meetNpc(id) {
  const npc = S.world.specialNpcs.find(n => n.id === id);
  if (!npc || npc.recruited || !npc.alive) return;
  ACTIVE_NPC = id;
  npcMenu();
}

function npcMenu() {
  const npc = getActiveNpc();
  if (!npc) { closeModal(); return; }
  const att = { friendly: '友好', neutral: '中立', hostile: '敌对' }[npc.attitude];
  openModal(`🧭 ${escapeHtml(npc.name)}`,
    `<p class="narrative">${escapeHtml(npc.desc)}</p>
     <div class="row"><span class="k">年龄 / 职业</span><span class="v">${npc.age} 岁 · ${escapeHtml(npc.profession)}</span></div>
     <div class="row"><span class="k">阵营 / 态度</span><span class="v">${escapeHtml(npc.faction)} · ${att}</span></div>
     <div class="row"><span class="k">对你的好感度</span><span class="v">${Math.round(npc.favor)} / 100</span></div>
     <div class="row"><span class="k">任务</span><span class="v">${npc.quest.done ? '已完成' : '待办'}</span></div>`,
    `<button class="choice" onclick="npcBackground()"><span class="t">📖 了解他/她的背景</span></button>
     <button class="choice" onclick="npcTalk()"><span class="t">💬 交谈</span><span class="d">提升好感度（每天一次有效）</span></button>
     <button class="choice" onclick="npcRequest()"><span class="t">🎁 索要物资</span><span class="d">好感越高成功率越高，满好感必定成功</span></button>
     <button class="choice" onclick="npcTrade()"><span class="t">🔁 交换物资</span><span class="d">各取所需，但要看对方脸色</span></button>
     <button class="choice" onclick="npcQuest()"><span class="t">📜 任务</span><span class="d">完成可大幅提升好感</span></button>
     <button class="choice" onclick="npcRecruit()"><span class="t">🤝 招募入队</span><span class="d">好感与态度决定成功率</span></button>
     <button class="btn" onclick="closeModal()">离开</button>`);
}

function npcStoryIdx(npc) {
  let i = 0;
  if (S.world.day >= 60 || npc.quest.done) i = 1;
  if ((npc.quest.done && S.world.day >= 120) || S.world.day >= 365) i = 2;
  return Math.min(i, npc.story.length - 1);
}

function npcBackground() {
  const npc = getActiveNpc();
  if (!npc) return;
  const idx = npcStoryIdx(npc);
  const parts = npc.story.slice(0, idx + 1).map(t => `<p class="narrative">${escapeHtml(t)}</p>`).join('');
  const hint = idx < npc.story.length - 1
    ? `<p class="narrative" style="color:var(--dim);margin-top:10px;">（与${npc.sex === '男' ? '他' : '她'}更多相处，或在更久之后，你会了解到更多。）</p>` : '';
  openModal(`📖 ${escapeHtml(npc.name)} 的故事`, parts + hint, '<button class="btn" onclick="npcMenu()">返回</button>');
}

function npcAttitudeCheck(npc) {
  const before = npc.attitude;
  if (npc.attitude === 'hostile' && npc.favor >= 55) npc.attitude = 'neutral';
  if (npc.attitude === 'neutral' && npc.favor >= 70) npc.attitude = 'friendly';
  if (npc.attitude !== before) {
    addLog(`【奇遇】${npc.name} 对你的态度${before === 'hostile' ? '缓和了' : '亲近了许多'}。`, 'good');
  }
}

function npcTalk() {
  const npc = getActiveNpc();
  if (!npc) return;
  const lines = npc.favor >= 70 ? npc.dialog.high : npc.dialog.low;
  const line = pick(lines);
  if (npc.lastTalkDay !== S.world.day) {
    npc.lastTalkDay = S.world.day;
    npc.favor = clamp(npc.favor + 4, 0, 100);
    npcAttitudeCheck(npc);
  }
  openModal(`💬 与${escapeHtml(npc.name)}交谈`,
    `<p class="narrative">${escapeHtml(npc.name)}：</p>
     <p class="narrative">“${escapeHtml(line)}”</p>
     <p class="narrative" style="color:var(--dim);margin-top:10px;">好感度 ${Math.round(npc.favor)} / 100</p>`,
    '<button class="btn" onclick="npcMenu()">继续</button>');
}

function npcRequest() {
  const npc = getActiveNpc();
  if (!npc) return;
  const ids = Object.keys(npc.inv).filter(id => countInv(npc.inv, id) > 0);
  if (!ids.length) {
    openModal(`🎁 ${escapeHtml(npc.name)}`, '<p class="narrative">他/她也没有多余的物资了。</p>', '<button class="btn" onclick="npcMenu()">返回</button>');
    return;
  }
  const mod = { friendly: 0.9, neutral: 0.7, hostile: 0.35 }[npc.attitude];
  const okChance = npc.favor >= 100 ? 1 : clamp((npc.favor / 100) * mod, 0.03, 0.95);
  if (chance(okChance)) {
    const id = pick(ids);
    npcGiveItem(npc, id, 1);
    npc.favor = clamp(npc.favor - 8, 0, 100);
    openModal(`🎁 ${escapeHtml(npc.name)}`,
      `<p class="narrative">他/她犹豫了一下，还是把【${itemName(id)}】递给了你。</p>
       <p class="narrative" style="color:var(--dim);margin-top:8px;">好感度 ${Math.round(npc.favor)} / 100</p>`,
      '<button class="btn" onclick="npcMenu()">继续</button>');
    addLog(`【奇遇】${npc.name} 给了你【${itemName(id)}】。`, 'good');
  } else {
    npc.favor = clamp(npc.favor - 3, 0, 100);
    openModal(`🎁 ${escapeHtml(npc.name)}`,
      '<p class="narrative">他/她摇了摇头：“我现在给不了你。”</p>',
      '<button class="btn" onclick="npcMenu()">继续</button>');
  }
}

function npcGiveItem(npc, id, qty) {
  if (!npc.inv[id] || npc.inv[id].n < qty) return false;
  npc.inv[id].n -= qty;
  if (npc.inv[id].n <= 0) delete npc.inv[id];
  const def = ITEMS[id];
  if (id === '现金') { S.player.money += qty * 100; return true; }
  if (!S.player.inventory[id]) S.player.inventory[id] = { n: 0, spoil: def.spoil || null };
  const st = S.player.inventory[id];
  if (def.spoil && st.spoil !== null) {
    st.spoil = Math.ceil((st.n * st.spoil + qty * def.spoil) / Math.max(1, st.n + qty));
  }
  st.n += qty;
  return true;
}

function npcTrade() {
  const npc = getActiveNpc();
  if (!npc) return;
  if (npc.attitude === 'hostile' && npc.favor < 50) {
    openModal(`🔁 ${escapeHtml(npc.name)}`, '<p class="narrative">他/她冷冷地看着你，显然不想做任何交易。</p>', '<button class="btn" onclick="npcMenu()">返回</button>');
    return;
  }
  const ids = Object.keys(npc.inv).filter(id => countInv(npc.inv, id) > 0);
  if (!ids.length) {
    openModal(`🔁 ${escapeHtml(npc.name)}`, '<p class="narrative">他/她身上没什么可换的。</p>', '<button class="btn" onclick="npcMenu()">返回</button>');
    return;
  }
  const list = ids.map(id => `<div class="facility"><div><div class="n">${itemName(id)} ×${countInv(npc.inv, id)}</div></div><button class="btn small" onclick="npcTradePick('${id}')">想换这个</button></div>`).join('');
  openModal(`🔁 与${escapeHtml(npc.name)}交换`,
    `<p class="narrative">他/她愿意交换的物资：</p><div style="margin-top:8px;">${list}</div>`,
    '<button class="btn" onclick="npcMenu()">返回</button>');
}

function npcTradePick(itemId) {
  const npc = getActiveNpc();
  if (!npc) return;
  TRADE = { npcId: npc.id, item: itemId };
  const myItems = invList(S.player.inventory)
    .filter(x => ['food', 'drink', 'med', 'material', 'fuel', 'ammo', 'tool', 'misc'].includes(x.def.cat))
    .map(x => `<div class="facility"><div><div class="n">${itemName(x.id)} ×${x.n}</div></div><button class="btn small" onclick="npcExecuteTrade('${x.id}')">用这个换</button></div>`).join('');
  openModal('🔁 用你的什么交换？',
    `<p class="narrative">你想换【${itemName(itemId)}】，准备用哪样物资交换？</p><div style="margin-top:8px;">${myItems || '<p class="narrative" style="color:var(--dim);">你身上没有可交换的物资。</p>'}</div>`,
    '<button class="btn" onclick="npcTrade()">返回</button>');
}

function npcExecuteTrade(playerItemId) {
  const npc = getActiveNpc();
  if (!npc || !TRADE) return;
  const npcItem = TRADE.item;
  TRADE = null;
  if (countInv(npc.inv, npcItem) <= 0 || countInv(S.player.inventory, playerItemId) <= 0) {
    openModal('🔁 交换失败', '<p class="narrative">物资数量有变，交易取消了。</p>', '<button class="btn" onclick="npcMenu()">返回</button>');
    return;
  }
  const mod = { friendly: 0.85, neutral: 0.65, hostile: 0.45 }[npc.attitude];
  const okChance = npc.favor >= 100 ? 1 : clamp((npc.favor / 100) * mod, 0.1, 0.9);
  if (chance(okChance)) {
    removeItem(S.player.inventory, playerItemId, 1);
    npcGiveItem(npc, npcItem, 1);
    addItem(npc.inv, playerItemId, 1);
    npc.favor = clamp(npc.favor + 1, 0, 100);
    addLog(`【奇遇】你与 ${npc.name} 完成了交换。`, 'good');
    openModal('🔁 交换成功', `<p class="narrative">你们各取所需。他/她对你的态度似乎好了一点。</p>`, '<button class="btn" onclick="npcMenu()">继续</button>');
  } else {
    npc.favor = clamp(npc.favor - 2, 0, 100);
    openModal('🔁 交换失败', '<p class="narrative">他/她看了一眼你手里的东西，摇了摇头。</p>', '<button class="btn" onclick="npcMenu()">继续</button>');
  }
}

function npcQuest() {
  const npc = getActiveNpc();
  if (!npc) return;
  const q = npc.quest;
  if (q.done) {
    openModal(`📜 ${escapeHtml(npc.name)} 的任务`,
      `<p class="narrative">“${escapeHtml(q.doneText)}”</p>
       <p class="narrative" style="color:var(--dim);margin-top:8px;">任务已完成。你们的交情更深了。</p>`,
      '<button class="btn" onclick="npcMenu()">返回</button>');
    return;
  }
  let progressText = '';
  let canTurnIn = false;
  if (q.type === 'items') {
    const rows = Object.entries(q.need).map(([id, n]) => `${itemName(id)} ${Math.min(countInv(S.player.inventory, id), n)}/${n}`).join('、');
    progressText = `所需物资：${rows}`;
    canTurnIn = Object.entries(q.need).every(([id, n]) => countInv(S.player.inventory, id) >= n);
  } else if (q.type === 'visit') {
    progressText = `目标地点：${LOC_DEFS[q.target].name}${q.progress ? ' ✅ 已到访' : ' ❌ 未到访'}`;
    canTurnIn = !!q.progress;
  } else if (q.type === 'kill') {
    const cur = S.world.stat.kills - (q.start || 0);
    progressText = `猎杀丧尸：${Math.min(cur, q.need)}/${q.need}（接受任务后开始计数）`;
    canTurnIn = cur >= q.need;
  }
  const foot = [];
  if (canTurnIn) foot.push(`<button class="choice" onclick="npcCompleteQuest()"><span class="t">交付任务</span><span class="d">获得奖励与大量好感</span></button>`);
  else if (q.type === 'kill' && !q.start) foot.push(`<button class="choice" onclick="npcAcceptQuest()"><span class="t">接受任务</span><span class="d">从现在起，猎杀丧尸开始计数</span></button>`);
  foot.push('<button class="btn" onclick="npcMenu()">返回</button>');
  openModal(`📜 ${escapeHtml(npc.name)} 的任务`,
    `<p class="narrative">“${escapeHtml(q.text)}”</p>
     <p class="narrative" style="margin-top:10px;">${progressText}</p>`,
    foot.join(''));
}

function npcAcceptQuest() {
  const npc = getActiveNpc();
  if (npc && npc.quest.type === 'kill') {
    npc.quest.start = S.world.stat.kills;
    addLog(`【奇遇】你接下了 ${npc.name} 的任务。`, 'info');
  }
  npcQuest();
}

function npcCompleteQuest() {
  const npc = getActiveNpc();
  if (!npc) return;
  const q = npc.quest;
  if (q.type === 'items') {
    for (const [id, n] of Object.entries(q.need)) removeItem(S.player.inventory, id, n);
  }
  q.done = true;
  q.progress = true;
  npc.favor = clamp(npc.favor + 30, 0, 100);
  npcAttitudeCheck(npc);
  for (const [id, n] of Object.entries(q.reward || {})) {
    if (id === '现金') S.player.money += n * 100;
    else addItem(S.player.inventory, id, n);
  }
  addLog(`【奇遇】你完成了 ${npc.name} 的任务，好感度大幅提升（+30）。`, 'good');
  S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 帮助了 ${npc.name}。`);
  renderAll();
  npcQuest();
}

function npcRecruit() {
  const npc = getActiveNpc();
  if (!npc || npc.recruited) return;
  const th = { friendly: 50, neutral: 65, hostile: 80 }[npc.attitude];
  if (npc.favor < th) {
    openModal(`🤝 ${escapeHtml(npc.name)}`,
      `<p class="narrative">他/她摇了摇头：“我还不能把命交给你。${npc.attitude === 'hostile' ? '先证明你的诚意。' : '再相处一段时间吧。'}”</p>
       <p class="narrative" style="color:var(--dim);margin-top:8px;">需要好感度达到 ${th}，当前 ${Math.round(npc.favor)}。</p>`,
      '<button class="btn" onclick="npcMenu()">返回</button>');
    return;
  }
  const mod = { friendly: 0.85, neutral: 0.7, hostile: 0.55 }[npc.attitude];
  const ch = clamp((npc.favor - th) / 50, 0, 1) * mod + S.player.skills.谈判 * 0.002 + (npc.favor >= 100 ? 0.15 : 0);
  if (chance(ch)) {
    const sv = npcToSurvivor(npc);
    const b = ensureBase();
    b.population.push(sv);
    npc.recruited = true;
    npc.attitude = 'friendly';
    const loc = S.world.locations[npc.location];
    if (loc) loc.npcs = loc.npcs.filter(x => x !== npc.id);
    S.world.stat.rescued++;
    addLog(`【奇遇】${npc.name} 加入了你的团队！`, 'good');
    S.world.history.push(`${fmtTime(S.world.day)}：${npc.name} 决定跟随 ${S.player.name}。`);
    checkAch();
    closeModal();
    renderAll();
  } else {
    npc.favor = clamp(npc.favor - 5, 0, 100);
    openModal(`🤝 ${escapeHtml(npc.name)}`,
      `<p class="narrative">他/她犹豫了很久，最终还是说：“再给我一点时间。”</p>`,
      '<button class="btn" onclick="npcMenu()">返回</button>');
  }
}

function npcToSurvivor(npc) {
  let weapon = null;
  const weaponIds = Object.keys(npc.inv).filter(id => ITEMS[id] && (ITEMS[id].cat === 'weapon' || ITEMS[id].cat === 'gun'));
  if (weaponIds.length) {
    weapon = weaponIds.sort((a, b) => (ITEMS[b].dmg || 0) - (ITEMS[a].dmg || 0))[0];
    removeItem(npc.inv, weapon, 1);
  }
  return {
    id: 'npc_' + Math.random().toString(36).slice(2, 9),
    specialId: npc.id,
    name: npc.name, sex: npc.sex, age: npc.age,
    profession: npc.profession, profId: 'custom',
    skills: Object.assign({}, npc.skills),
    health: 100, morale: 70, loyalty: Math.round(npc.favor),
    role: 'idle',
    traits: ['有故事的人', '重情'],
    ability: npc.ability,
    weapon,
    inv: {},
    alive: true, spouse: null, child: null,
    joinedDay: S.world.day,
    story: npc.story[0]
  };
}

function npcVisitProgress(locId) {
  for (const npc of S.world.specialNpcs) {
    if (npc.alive && !npc.recruited && npc.met && !npc.quest.done && npc.quest.type === 'visit' && npc.quest.target === locId) {
      npc.quest.progress = true;
      addLog(`【奇遇】你到达了${LOC_DEFS[locId].name}——${npc.name} 托付的地方。回去找他/她吧。`, 'good');
    }
    const arc = ARC2[npc.id];
    if (npc.recruited && arc && arc.type === 'visit' && arc.target === locId && !S.world.flags.arcs[npc.id]) {
      S.world.flags.arcVisited[npc.id] = true;
      addLog(`【支线】你到达了${LOC_DEFS[locId].name}——${npc.name} 支线的地点。回基地找他/她交付。`, 'good');
    }
  }
}

function specialNpcDaily() {
  for (const npc of S.world.specialNpcs) {
    if (!npc.alive || npc.recruited || !npc.met) continue;
    if (chance(0.3)) addItem(npc.inv, pick(['罐头', '压缩饼干', '瓶装水', '绷带', '零件', '电池']), 1);
    if (chance(0.1)) {
      const ids = Object.keys(npc.inv);
      if (ids.length) removeItem(npc.inv, pick(ids), 1);
    }
    if (chance(0.08)) {
      const oldLoc = S.world.locations[npc.location];
      if (oldLoc) oldLoc.npcs = oldLoc.npcs.filter(x => x !== npc.id);
      const ids = Object.keys(LOC_DEFS).filter(x => x !== npc.location);
      npc.location = pick(ids);
      const newLoc = S.world.locations[npc.location];
      if (!newLoc.npcs.includes(npc.id)) newLoc.npcs.push(npc.id);
    }
  }
}

/* ==================== 人物入队支线 ==================== */

const ARC2 = {
  shenyanqiu: {
    type: 'visit', target: 'police',
    text: '我弟弟最后在城西警察局执勤。我想再去那里找一次，哪怕只是确认。',
    doneText: '这是他的口琴……他把它留在了这里。至少，我知道他来过。',
    reward: { 步枪弹: 10 },
    epilogue: '沈砚秋把弟弟的口琴挂在胸前。她说，以后每救一个人，就吹一声，让弟弟知道姐姐还在。'
  },
  luzheng: {
    type: 'visit', target: 'market',
    text: '我妻子最后去了城东超市。陪我去看看，我不想一个人面对。',
    doneText: '货架底下压着她的围巾。三十年了，她总说这条围巾最暖和。',
    reward: { 工具组: 1 },
    epilogue: '陆铮把围巾收进工具箱。从此他修好的每一样东西，都像在修这个家。'
  },
  gunanxing: {
    type: 'items', need: { 电池: 3 },
    text: '我的相机没电了。给我 3 节电池，我想把你们都拍下来。',
    doneText: '快门响了。这一页历史，有你了。',
    reward: { 收音机: 1 },
    epilogue: '顾南星的底片越攒越多。他说，等文明回来，这些照片就是它最早的记忆。'
  },
  bailu: {
    type: 'items', need: { 医疗包: 1 },
    text: '营地里有个伤员需要手术。给我 1 个医疗包，我来主刀。',
    doneText: '手术成功了。这是我第一次真正独自主刀。',
    reward: { 抗生素: 1 },
    epilogue: '白露在病历上写下自己的名字。从那天起，她不再只是“那个医学生”。'
  },
  zhaotieshan: {
    type: 'visit', target: 'factory',
    text: '我儿子在北郊工厂上班。陪我走一趟，我这把老骨头经不起一个人了。',
    doneText: '工牌还在更衣柜上，抽屉里有一张我们爷俩的照片。',
    reward: { 燃油: 2 },
    epilogue: '赵铁山把照片贴身收好。他说，儿子没走丢，只是先回山里打猎去了。'
  },
  mengzhiwei: {
    type: 'kill', count: 15,
    text: '我需要更多变异样本的数据。帮我再采集 15 只丧尸的记录。',
    doneText: '数据曲线出现了！病毒的变异方向……是可以被预测的！',
    reward: { 抗生素: 2 },
    epilogue: '孟知微在笔记本上写下一个词：解药。那晚，她第一次没有失眠。'
  },
  shigandang: {
    type: 'visit', target: 'village',
    text: '我想回柳河村一趟。我爹娘葬在那。给我带个路。',
    doneText: '坟还在。纸烧起来的时候，我这辈子第一次哭了。',
    reward: { 砍刀: 1 },
    epilogue: '石敢当在村口立了块木牌，写着“石家”。他说，以后死也要死回这儿。'
  },
  jiangxiaoman: {
    type: 'visit', target: 'home',
    text: '爸妈说如果失散就回家等。陪我再回一次公寓，好不好？',
    doneText: '门上的字条是妈妈写的：“小满，我们在城南，平安。”',
    reward: { 罐头: 2 },
    epilogue: '江小满把字条折成一只纸鹤。她说，下次见面要亲口叫他们一声。'
  },
  tangruoxue: {
    type: 'items', need: { 收音机: 1, 电池: 2 },
    text: '我要重建电台。给我 1 台收音机和 2 节电池，就能让声音回来。',
    doneText: '“各位听众，这里是若雪。我们，还活着。”',
    reward: { 现金: 1000 },
    epilogue: '每当深夜，全城都能听到若雪的声音。人们说，那是废墟里的心跳。'
  },
  heyunfan: {
    type: 'items', need: { 燃油: 2 },
    text: '我的电瓶车改成燃油车了，还差 2 份燃油。修好它，我就能接着送货。',
    doneText: '发动了！以后这一片，我随叫随到。',
    reward: { 现金: 600 },
    epilogue: '贺云帆的车灯划破夜色。他在后视镜里贴了张字条：最后一单，永远免费。'
  },
  songqinghe: {
    type: 'items', need: { 消毒剂: 2 },
    text: '临时病房需要消毒。给我 2 份消毒剂，孩子们不能再感染了。',
    doneText: '干净了。今晚，他们可以睡个安稳觉。',
    reward: { 医疗包: 1 },
    epilogue: '宋青禾的本子上，第一次出现了一整页“已康复”的名字。'
  },
  weidonglai: {
    type: 'items', need: { 金属: 3 },
    text: '水泵的叶轮锈穿了。给我 3 份金属，我给它车一个新的。',
    doneText: '水来了！城里人又有干净水喝了。',
    reward: { 净水: 4 },
    epilogue: '卫东来站在泵站门口，听着水声。他说，女儿小时候最爱在喷泉边玩。'
  },
  wenlan: {
    type: 'visit', target: 'school',
    text: '孩子们该上课了。陪我去学校搬些教材回来。',
    doneText: '课本都在。今晚，他们重新背起了“床前明月光”。',
    reward: { 蔬菜: 3 },
    epilogue: '教堂里传出读书声。温澜在黑板上写：春天，会回来的。'
  },
  qilaojiu: {
    type: 'items', need: { 维生素: 2 },
    text: '我要配一副“保命散”。还差 2 份维生素。',
    doneText: '配好了。这是方子，你收着，别传坏人。',
    reward: { 医疗包: 1 },
    epilogue: '戚老九的药担子轻了，徒弟却多了。他说，医者，传的是心。'
  },
  maerye: {
    type: 'kill', count: 8,
    text: '商路被尸群堵了。陪我清掉 8 只，路通了，好处少不了你。',
    doneText: '路通了！跟你做生意，是我这辈子的运气。',
    reward: { 罐头: 3 },
    epilogue: '马二爷把一面写着“信”字的小旗挂在车头。商队从此都认这面旗。'
  },
  xiaoling: {
    type: 'visit', target: 'mall',
    text: '武馆就在商场后巷。我想回去看看，那个我教了十年的地方。',
    doneText: '招牌还在，沙袋还在。我的拳头，也还在。',
    reward: { 军粮: 2 },
    epilogue: '萧翎把武馆重新收拾了出来。她说，等一切过去，这里还收学生。'
  },
  lengmianfo: {
    type: 'items', need: { 抗生素: 1, 绷带: 2 },
    text: '我妹妹病重。给我抗生素和绷带。这份情，我用命还。',
    doneText: '她退烧了。她说，想当面谢谢那个送药的哥哥。',
    reward: { 手枪弹: 10 },
    epilogue: '冷面佛背着妹妹走了三十里路来到你面前。他说，以后她的命、他的命，都是你的。'
  },
  luoxueying: {
    type: 'items', need: { 种子: 3 },
    text: '冬小麦要补种。再给我 3 份种子，明年就饿不着了。',
    doneText: '都种下去了。土地不会骗人。',
    reward: { 鸡蛋: 4 },
    epilogue: '来年开春，麦田绿了。洛雪莹说，这是她见过最美的风景。'
  },
  chuqingmo: {
    type: 'visit', target: 'mall',
    text: '商场三楼的旧书店还有一批书。陪我去抢救它们。',
    doneText: '全都搬出来了。这些字，值一整条命。',
    reward: { 维生素: 1 },
    epilogue: '楚青墨在教堂里建起了一间小图书馆。他说，文明有光的地方，就在这一架架上。'
  },
  suwanqing: {
    type: 'items', need: { 罐头: 2 },
    text: '流浪的动物们快饿死了。给我 2 个罐头，我喂喂它们。',
    doneText: '它们围着你打转，尾巴摇成了花。',
    reward: { 绷带: 2 },
    epilogue: '苏晚晴说，救人救狗都一样。它们记得你，比人更久。'
  },
  yantiejun: {
    type: 'kill', count: 20,
    text: '最后一步：清剿 20 只丧尸，把这条街彻底拿回来。',
    doneText: '任务完成。敬礼。',
    reward: { 步枪弹: 20 },
    epilogue: '严铁军把一面旧军旗重新升了起来。他说，旗帜不落，人就还有魂。'
  },
  linjiayin: {
    type: 'visit', target: 'police',
    text: '警察局里有避难所的原始名单。陪我把它找出来，公开真相。',
    doneText: '名单拿到了。上面每一个名字，都该被记住。',
    reward: { 抗生素: 1 },
    epilogue: '林嘉茵把名单交给了电台。真相传开后，避难所再也不敢把人当耗材。'
  }
};

/* ==================== 阵营长线剧情 ==================== */

const FACTION_NAMES = { military: '军方残部', caravan: '商队', raiders: '掠夺者', church: '守望者教会', corp: '企业避难所' };

const CAMPAIGN_EVENTS = [
  {
    id: 'camp_military_1', campaign: true, icon: '🎖', title: '军方的密令',
    cond: s => s.world.factions.military >= 2 && s.world.day >= 30 && !s.world.flags.camp.military_1,
    scenes: { start: {
      text: '一名风尘仆仆的士兵找到你，递来一张地图：“军方需要可靠的平民。城西警察局可能有重要情报，你去看看。办成了，军方不会亏待你。”',
      choices: [
        { label: '接下侦察任务', text: '你把地图收好。军方的眼睛，已经落在了你身上。',
          effects: { campFlags: { military_1: true }, rep: { military: 1 }, flags: { mil_mission: true } } },
        { label: '拒绝', text: '你摇了摇头。士兵没有多说什么，转身消失在废墟里。',
          effects: { rep: { military: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_military_2', campaign: true, icon: '🚚', title: '护送军需',
    cond: s => s.world.flags.camp.military_1 && s.world.factions.military >= 4 && s.world.day >= 90 && !s.world.flags.camp.military_2,
    scenes: { start: {
      text: '军方再次找上门：“一批药品要穿过尸群密集区。帮我们打前站，事后分你一批弹药。”',
      choices: [
        { label: '接受护送', text: '车队缓缓启程。这次任务，让军方彻底记住了你。',
          effects: { campFlags: { military_2: true }, rep: { military: 2 }, items: [['步枪弹', 12], ['绷带', 2]] } },
        { label: '婉拒', text: '你不想拿命去赌。', effects: { rep: { military: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_military_3', campaign: true, icon: '🎖', title: '正式入编',
    cond: s => s.world.flags.camp.military_2 && s.world.factions.military >= 6 && s.world.day >= 150 && !s.world.flags.camp.military_3,
    scenes: { start: {
      text: '一名军官向你敬礼：“军方正式邀请你入编。你的基地，将成为军区的一部分。这是乱世里最硬的靠山——但从此，你也要服从命令。”',
      choices: [
        { label: '加入军方', text: '从今天起，你不再是无名者，而是这片废土上的“军人”。',
          effects: { campFlags: { military_3: true }, joinFaction: 'military', rep: { military: 4 }, tag: '军人', items: [['步枪', 1], ['步枪弹', 16]] } },
        { label: '保持独立', text: '你婉拒了。自由比靠山更重要。',
          effects: { campFlags: { military_3: true }, rep: { military: -2 }, tag: '自由' } }
      ]
    } }
  },
  {
    id: 'camp_caravan_1', campaign: true, icon: '🐫', title: '商队的委托',
    cond: s => s.world.factions.caravan >= 1 && s.world.day >= 30 && !s.world.flags.camp.caravan_1,
    scenes: { start: {
      text: '商队的老把头找上门：“我们的驮马累倒了。分我们一些口粮，等货脱手，双倍谢你。”',
      choices: [
        { label: '提供 2 个罐头', hint: '需要 罐头×2', need: { 罐头: 2 },
          failText: '你手头没有罐头。', text: '商队吃上了热饭，也记下了你的名字。',
          effects: { campFlags: { caravan_1: true }, rep: { caravan: 2 } } },
        { label: '婉拒', text: '生意归生意，情分归情分。', effects: { rep: { caravan: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_caravan_2', campaign: true, icon: '🛣', title: '商路保卫战',
    cond: s => s.world.flags.camp.caravan_1 && s.world.factions.caravan >= 3 && s.world.day >= 90 && !s.world.flags.camp.caravan_2,
    scenes: { start: {
      text: '掠夺者盯上了商队的新货。老把头急得直搓手：“帮我们顶这一阵，价码你开。”',
      choices: [
        { label: '参战', text: '你抄起武器加入了混战。商路，保住了。',
          effects: { campFlags: { caravan_2: true }, rep: { caravan: 2, raiders: -2 }, items: [['罐头', 2]], encounter: false, tag: '守护者' } },
        { label: '拒绝', text: '你不想为了别人的货拼命。', effects: { rep: { caravan: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_caravan_3', campaign: true, icon: '💰', title: '入股商队',
    cond: s => s.world.flags.camp.caravan_2 && s.world.factions.caravan >= 5 && s.world.day >= 150 && !s.world.flags.camp.caravan_3,
    scenes: { start: {
      text: '老把头把一面小旗拍在你手里：“入伙吧。南北商路，有你一份分红。”',
      choices: [
        { label: '加入商队', text: '你的仓库，从此连接起整条商路。',
          effects: { campFlags: { caravan_3: true }, joinFaction: 'caravan', rep: { caravan: 4 }, tag: '商人', money: 5000 } },
        { label: '只做朋友', text: '你收下小旗，却没有入伙。', effects: { campFlags: { caravan_3: true }, tag: '自由' } }
      ]
    } }
  },
  {
    id: 'camp_raiders_1', campaign: true, icon: '🔪', title: '掠夺者的规矩',
    cond: s => s.world.factions.raiders >= 0 && s.world.day >= 30 && !s.world.flags.camp.raiders_1,
    scenes: { start: {
      text: '两个浑身烟味的掠夺者拦住去路：“这一片归我们管。交 2 个罐头，以后保你平安。”',
      choices: [
        { label: '交罐头', hint: '需要 罐头×2', need: { 罐头: 2 },
          failText: '你拿不出罐头。他们的手按上了刀柄。', text: '他们收了罐头，冲你比了个“上道”的手势。',
          effects: { campFlags: { raiders_1: true }, rep: { raiders: 1 } } },
        { label: '拒绝', text: '你不想向任何人低头。', effects: { rep: { raiders: -1 }, encounter: true } }
      ]
    } }
  },
  {
    id: 'camp_raiders_2', campaign: true, icon: '🩸', title: '入伙考验',
    cond: s => s.world.flags.camp.raiders_1 && s.world.factions.raiders >= 2 && s.world.day >= 90 && !s.world.flags.camp.raiders_2,
    scenes: { start: {
      text: '掠夺者的头目盯着你：“想跟我们做生意？先证明你够狠。去，把北边那伙人的货抢了。”',
      choices: [
        { label: '接下“生意”', text: '这一票，让你在他们的圈子里有了名号。',
          effects: { campFlags: { raiders_2: true }, rep: { raiders: 2, caravan: -1 }, items: [['罐头', 3], ['砍刀', 1]], tag: '机会主义' } },
        { label: '拒绝', text: '有些底线，你不想踩。', effects: { rep: { raiders: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_raiders_3', campaign: true, icon: '🏴', title: '成为掠夺者',
    cond: s => s.world.flags.camp.raiders_2 && s.world.factions.raiders >= 4 && s.world.day >= 150 && !s.world.flags.camp.raiders_3,
    scenes: { start: {
      text: '头目把一只扳指扔给你：“入伙，你就是自己人。这片废墟上，再没人敢动你。可从此，你的手上也得沾血。”',
      choices: [
        { label: '加入掠夺者', text: '你戴上扳指。从此，夜里有刀，白天有粮。',
          effects: { campFlags: { raiders_3: true }, joinFaction: 'raiders', rep: { raiders: 4 }, tag: '掠夺者', items: [['燃油', 3]] } },
        { label: '划清界限', text: '你把扳指扔了回去。有些路，不能走。',
          effects: { campFlags: { raiders_3: true }, rep: { raiders: -3 }, tag: '自由' } }
      ]
    } }
  },
  {
    id: 'camp_church_1', campaign: true, icon: '🕯', title: '守望者的请求',
    cond: s => s.world.factions.church >= 1 && s.world.day >= 30 && !s.world.flags.camp.church_1,
    scenes: { start: {
      text: '守望者教会的执事前来求助：“收容所里的孩子饿着肚子。愿守望者记住你的恩情。”',
      choices: [
        { label: '捐出 2 个罐头', hint: '需要 罐头×2', need: { 罐头: 2 },
          failText: '你手头没有罐头。', text: '孩子们吃上了饭。守望者为你点燃了一盏长明灯。',
          effects: { campFlags: { church_1: true }, rep: { church: 2 }, stats: { morale: 3 } } },
        { label: '婉拒', text: '你也有要养活的人。', effects: { rep: { church: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_church_2', campaign: true, icon: '⚖', title: '教派之争',
    cond: s => s.world.flags.camp.church_1 && s.world.factions.church >= 3 && s.world.day >= 90 && !s.world.flags.camp.church_2,
    scenes: { start: {
      text: '守望者内部起了分歧：一派要向外扩张，一派坚持收容弱者。执事请你出面调解。',
      choices: [
        { label: '出面调解', roll: 'negotiate',
          success: { text: '你把两边都劝回了谈判桌。教会免于分裂。', effects: { campFlags: { church_2: true }, rep: { church: 2 } } },
          fail: { text: '争吵反而更激烈了。你被当作外人赶了出来。', effects: { rep: { church: -1 } } } },
        { label: '不掺和', text: '宗教的事，外人不便插手。', effects: { rep: { church: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_church_3', campaign: true, icon: '🕊', title: '加入守望者',
    cond: s => s.world.flags.camp.church_2 && s.world.factions.church >= 5 && s.world.day >= 150 && !s.world.flags.camp.church_3,
    scenes: { start: {
      text: '执事郑重地递来一枚木十字架：“加入守望者吧。从此，你的基地就是所有人的避难所。”',
      choices: [
        { label: '加入守望者', text: '你接过十字架。善意，有了组织。',
          effects: { campFlags: { church_3: true }, joinFaction: 'church', rep: { church: 4 }, tag: '信徒', stats: { morale: 8 } } },
        { label: '保持独立', text: '你敬重他们，但不愿被信仰绑住。', effects: { campFlags: { church_3: true }, tag: '自由' } }
      ]
    } }
  },
  {
    id: 'camp_corp_1', campaign: true, icon: '🏢', title: '避难所的密信',
    cond: s => s.world.factions.corp >= 0 && s.world.day >= 30 && !s.world.flags.camp.corp_1,
    scenes: { start: {
      text: '一封没有署名的信塞在你的门口：“企业避难所在隐瞒什么。想查，去城西警察局找一份名单。”',
      choices: [
        { label: '调查真相', text: '你把信收好。真相，正在等你。',
          effects: { campFlags: { corp_1: true }, rep: { corp: 1 }, flags: { corp_clue: true } } },
        { label: '烧掉这封信', text: '你不想卷进大企业的浑水。', effects: { rep: { corp: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_corp_2', campaign: true, icon: '🕵', title: '营救知情者',
    cond: s => s.world.flags.camp.corp_1 && s.world.factions.corp >= 2 && s.world.day >= 90 && !s.world.flags.camp.corp_2,
    scenes: { start: {
      text: '一名避难所的清洁工逃了出来，身后跟着追兵。他手里有你要的证词。',
      choices: [
        { label: '掩护他撤离', text: '你击退了追兵。证词，保住了。',
          effects: { campFlags: { corp_2: true }, rep: { corp: 2 }, items: [['绷带', 2]], tag: '揭发者' } },
        { label: '不插手', text: '你目送他消失在巷口。', effects: { rep: { corp: -1 } } }
      ]
    } }
  },
  {
    id: 'camp_corp_3', campaign: true, icon: '🏢', title: '避难所的门',
    cond: s => s.world.flags.camp.corp_2 && s.world.factions.corp >= 4 && s.world.day >= 150 && !s.world.flags.camp.corp_3,
    scenes: { start: {
      text: '企业避难所向你开出条件：成为他们的“外部代理人”，享用最好的物资与医疗——代价是，替他们处理“麻烦”。',
      choices: [
        { label: '接受合作', text: '避难所的大门，为你敞开。',
          effects: { campFlags: { corp_3: true }, joinFaction: 'corp', rep: { corp: 4 }, tag: '合作者', items: [['抗生素', 2], ['医疗包', 1]] } },
        { label: '公开他们的罪行', text: '你把证据交给电台。避难所的名声，一夜间崩了。',
          effects: { campFlags: { corp_3: true }, rep: { corp: -5, camp: 3 }, tag: '揭发者' } }
      ]
    } }
  }
];

/* ==================== 解药主线 ==================== */

const CURE_EVENTS = [
  {
    id: 'cure_start', icon: '🧬', title: '解药的起点',
    cond: s => s.world.day >= 30 && !s.world.flags.cure && (s.player.skills.科研 >= 25 || s.world.specialNpcs.some(n => n.recruited && (n.skills.科研 || 0) >= 50) || s.world.specialNpcs.some(n => n.id === 'mengzhiwei' && n.met)),
    scenes: { start: {
      text: '你在一本旧研究笔记里读到：病毒的变异可以被预测，真正的希望是“活体抗体”。笔记的署名是：孟知微。要开始这项研究，需要大量丧尸样本的数据。',
      choices: [
        { label: '开始研究（采集样本）', text: '你决定追查这条线索。从今天起，你击杀的丧尸都会提供研究数据。',
          effects: { cure: { stage: 1 }, tag: '研究者' } },
        { label: '暂时搁置', text: '活着都难，还谈什么解药。你把笔记放了回去。' }
      ]
    } }
  },
  {
    id: 'cure_sample', icon: '🩸', title: '样本完备',
    cond: s => s.world.flags.cure && s.world.flags.cure.stage === 1 && (s.world.stat.kills - (s.world.flags.cure.start || 0)) >= 10,
    scenes: { start: {
      text: '你采集的样本数据已经足够。接下来，需要一个真正安全的实验室来培养抗体。',
      choices: [
        { label: '进入下一阶段（建造病毒实验室）', text: '研究进入关键阶段：你需要在自己的基地里建造「病毒实验室」。',
          effects: { cure: { stage: 2 } } }
      ]
    } }
  },
  {
    id: 'cure_lab', icon: '🧪', title: '实验室落成',
    cond: s => s.world.flags.cure && s.world.flags.cure.stage === 2 && hasFacility('lab'),
    scenes: { start: {
      text: '病毒实验室落成。抗体培养开始了。消息一旦走漏，想毁掉它的人和丧尸都会蜂拥而至。',
      choices: [
        { label: '开始培养抗体', text: '实验室的指示灯亮起。人类命运的赌局，开始了。',
          effects: { cure: { stage: 3 } } }
      ]
    } }
  },
  {
    id: 'cure_defense', icon: '🛡', title: '保卫实验室',
    cond: s => s.world.flags.cure && s.world.flags.cure.stage === 3 && !s.world.flags.cure.defended,
    scenes: { start: {
      text: s => (s.world.flags.cure.labBroken
        ? '上次袭击让实验室受损了。用 2 个零件修好它，再战一次。'
        : '警报拉响——尸潮正向实验室涌来！这是解药诞生前，最黑暗的一夜。'),
      choices: [
        { label: '坚守实验室', action: 'cureDefend', hint: '基地防御战，胜败在此一举' },
        { label: '放弃研究', text: '你亲手关掉了实验室的灯。也许，人类还没有准备好。',
          effects: { cure: { stage: 0, defended: true } } }
      ]
    } }
  },
  {
    id: 'cure_finale', icon: '💉', title: '解药诞生',
    cond: s => s.world.flags.cure && s.world.flags.cure.stage === 4 && !s.world.flags.cure.choice,
    scenes: { start: {
      text: '第一支抗体成功了。它救不活已经死去的人，却能让活着的人不再变成它们。现在，决定权在你手里：全世界，还是你自己？',
      choices: [
        { label: '向全世界公开', text: '你把配方抄送给了每一台还能响的电台。人类，有救了。',
          effects: { cure: { choice: 'public' }, rep: { military: 5, caravan: 5, camp: 5, church: 5 }, tag: '救世者' } },
        { label: '私藏配方', text: '你把配方锁进了最深的箱子。从此，只有你能决定谁配活下去。',
          effects: { cure: { choice: 'hoard' }, rep: { military: -3, camp: -3 }, tag: '垄断者' } },
        { label: '交给军方', text: '你把配方交给了军方。他们承诺，会用最稳妥的方式使用它。',
          effects: { cure: { choice: 'military' }, rep: { military: 8 }, tag: '忠诚' } }
      ]
    } }
  }
];

/* ==================== 载具 / 战争事件 ==================== */

const EXTRA_EVENTS = [
  {
    id: 'find_car', icon: '🚙', title: '车库里的越野车',
    cond: s => !s.world.vehicle && s.world.day >= 5,
    scenes: { start: {
      text: '一座半塌的车库里，停着一辆还盖着防尘布的越野车。钥匙就插在点火孔里，油箱还剩半箱油。',
      choices: [
        { label: '修好它开走', hint: '需要 零件×2、工具组×1', need: { 零件: 2, 工具组: 1 },
          failText: '你手头的零件不够，车暂时开不走。',
          text: '引擎低沉地吼了起来。从此，整座城市都是你的后花园。',
          effects: { vehicle: { name: '越野车' } } },
        { label: '拆走零件', text: '你拆下了还能用的零件，把车留在原地。',
          effects: { items: [['零件', 2], ['燃油', 1]] } },
        { label: '离开', text: '车太显眼，声音太大。你选择了步行。' }
      ]
    } }
  },
  {
    id: 'war_refugee', icon: '🏃', title: '逃难的陌生人',
    cond: s => s.world.flags.warStarted && s.world.day >= 180,
    scenes: { start: {
      text: '一个满身尘土的陌生人踉跄着跑来：“城南打起来了！我是逃出来的，求求你收留我。”',
      choices: [
        { label: '收留他', needBase: true, failText: '你连自己的落脚点都没有，拿什么收留他？',
          text: '他千恩万谢地留了下来。战争，把更多人推向了你的营地。',
          effects: { basePop: 1, tag: '仁慈', stats: { morale: 3 } } },
        { label: '给他一点食物', hint: '消耗 1 份食物', needAny: ['罐头', '压缩饼干'], failText: '你身上没有多余的食物。',
          text: '他接过食物，头也不回地继续逃命。', effects: { stats: { morale: 2 }, tag: '仁慈' } },
        { label: '拒绝', text: '战争时期，谁也不敢轻信陌生人。', effects: { tag: '谨慎' } }
      ]
    } }
  }
];

const ALL_EVENTS = ADVENTURE_EVENTS.concat(CAMPAIGN_EVENTS, CURE_EVENTS, EXTRA_EVENTS);

function cureDefend() {
  closeModal();
  ADVENTURE = null;
  const f = S.world.flags.cure;
  const won = baseBattle('解药保卫战', 60 + stageIndex(S.world.day) * 10, () => {
    f.labBroken = true;
    addLog('实验室在袭击中受损了。', 'bad');
  });
  if (won) {
    f.stage = 4;
    f.defended = true;
    f.labBroken = false;
    S.world.flags.adventure.vaccine = true;
    addLog('抗体培养成功！疫苗的关键突破，诞生在你的基地里。', 'good');
    S.world.history.push(`${fmtTime(S.world.day)}：解药研究取得关键突破。`);
    checkAch();
    checkEndings();
  }
  renderAll();
}

/* ==================== 人物支线（入队后） ==================== */

function npcArcMenu(specialId) {
  const arc = ARC2[specialId];
  const npc = S.world.specialNpcs.find(n => n.id === specialId);
  if (!arc || !npc) return;
  if (S.world.flags.arcs[specialId]) {
    openModal(`📖 ${escapeHtml(npc.name)} 的支线`,
      `<p class="narrative">“${escapeHtml(arc.doneText)}”</p>
       <p class="narrative" style="margin-top:10px;">${escapeHtml(arc.epilogue)}</p>`,
      '<button class="btn" onclick="closeModal()">合上故事</button>');
    return;
  }
  let progressText = '';
  let canTurnIn = false;
  if (arc.type === 'items') {
    const rows = Object.entries(arc.need).map(([id, n]) => `${itemName(id)} ${Math.min(countInv(S.player.inventory, id), n)}/${n}`).join('、');
    progressText = `所需物资：${rows}`;
    canTurnIn = Object.entries(arc.need).every(([id, n]) => countInv(S.player.inventory, id) >= n);
  } else if (arc.type === 'visit') {
    progressText = `目标地点：${LOC_DEFS[arc.target].name}${S.world.flags.arcVisited[specialId] ? ' ✅ 已到访' : ' ❌ 未到访'}`;
    canTurnIn = !!S.world.flags.arcVisited[specialId];
  } else if (arc.type === 'kill') {
    const cur = S.world.stat.kills - (S.world.flags.arcStart[specialId] || 0);
    progressText = `猎杀丧尸：${Math.min(cur, arc.count)}/${arc.count}（接受任务后开始计数）`;
    canTurnIn = cur >= arc.count;
  }
  const foot = [];
  if (canTurnIn) foot.push(`<button class="choice" onclick="npcArcComplete('${specialId}')"><span class="t">交付支线</span><span class="d">获得奖励，并见证他/她故事的结局</span></button>`);
  else if (arc.type === 'kill' && !S.world.flags.arcStart[specialId]) foot.push(`<button class="choice" onclick="npcArcAccept('${specialId}')"><span class="t">接受任务</span><span class="d">从现在起，猎杀丧尸开始计数</span></button>`);
  foot.push('<button class="btn" onclick="closeModal()">返回</button>');
  openModal(`📖 ${escapeHtml(npc.name)} 的支线`,
    `<p class="narrative">“${escapeHtml(arc.text)}”</p>
     <p class="narrative" style="margin-top:10px;">${progressText}</p>`,
    foot.join(''));
}

function npcArcAccept(specialId) {
  if (ARC2[specialId] && ARC2[specialId].type === 'kill') {
    S.world.flags.arcStart[specialId] = S.world.stat.kills;
    addLog(`【支线】你接下了 ${S.world.specialNpcs.find(n => n.id === specialId).name} 的请求。`, 'info');
  }
  npcArcMenu(specialId);
}

function npcArcComplete(specialId) {
  const arc = ARC2[specialId];
  const npc = S.world.specialNpcs.find(n => n.id === specialId);
  if (!arc || !npc) return;
  if (arc.type === 'items') {
    for (const [id, n] of Object.entries(arc.need)) removeItem(S.player.inventory, id, n);
  }
  S.world.flags.arcs[specialId] = true;
  for (const [id, n] of Object.entries(arc.reward || {})) {
    if (id === '现金') S.player.money += n * 100;
    else addItem(S.player.inventory, id, n);
  }
  const sv = S.base && S.base.population.find(x => x.specialId === specialId);
  if (sv) sv.loyalty = clamp(sv.loyalty + 20, 0, 100);
  addLog(`【支线】${npc.name} 的故事有了结局：${arc.epilogue}`, 'good');
  S.world.history.push(`${fmtTime(S.world.day)}：${npc.name} 完成了自己未了的心愿。`);
  checkAch();
  closeModal();
  renderAll();
}

/* ==================== 载具 ==================== */

function trunkWeight() {
  return S.world.vehicle ? totalWeight(S.world.vehicle.trunk) : 0;
}

function vehiclePut(id, qty) {
  const v = S.world.vehicle;
  if (!v) { toast('你还没有车。'); return; }
  const cur = S.player.inventory[id];
  if (!cur || cur.n < qty) { toast('背包里没有这么多。'); return; }
  if (trunkWeight() + (ITEMS[id].weight || 0) * qty > 60) { toast('后备箱装不下了。'); return; }
  removeItem(S.player.inventory, id, qty);
  if (!v.trunk[id]) v.trunk[id] = { n: 0, spoil: ITEMS[id].spoil || null };
  v.trunk[id].n += qty;
  addLog(`你把【${itemName(id)}】×${qty} 放进了后备箱。`, 'info');
  renderAll();
}

function vehicleTake(id, qty) {
  const v = S.world.vehicle;
  if (!v) { toast('你还没有车。'); return; }
  const cur = v.trunk[id];
  if (!cur || cur.n < qty) { toast('后备箱里没有这么多。'); return; }
  if (totalWeight(S.player.inventory) + (ITEMS[id].weight || 0) * qty > carryCap(S.player) * 1.3) { toast('背包装不下。'); return; }
  removeItem(v.trunk, id, qty);
  if (!S.player.inventory[id]) S.player.inventory[id] = { n: 0, spoil: ITEMS[id].spoil || null };
  S.player.inventory[id].n += qty;
  addLog(`你从后备箱取出了【${itemName(id)}】×${qty}。`, 'info');
  renderAll();
}

function vehicleRepair() {
  const v = S.world.vehicle;
  if (!v) return;
  if (countInv(S.player.inventory, '零件') < 1 || countInv(S.player.inventory, '工具组') < 1) { toast('修理需要 零件×1 和 工具组×1。'); return; }
  removeItem(S.player.inventory, '零件', 1);
  removeItem(S.player.inventory, '工具组', 1);
  v.cond = clamp(v.cond + 40, 0, 100);
  addLog('你把车修了一遍，车况 +40。', 'good');
  renderAll();
}

function vehicleRefuel() {
  const v = S.world.vehicle;
  if (!v) return;
  if (countInv(S.player.inventory, '燃油') < 1) { toast('需要 燃油×1。'); return; }
  removeItem(S.player.inventory, '燃油', 1);
  v.fuel = clamp(v.fuel + 50, 0, 100);
  addLog('你给车加满了油，油量 +50。', 'good');
  renderAll();
}

function useRepairKit() {
  if (!S.world.vehicle) { toast('你还没有载具。'); return; }
  if (!removeItem(S.player.inventory, '快速修理套件', 1)) { toast('需要 快速修理套件×1。'); return; }
  S.world.vehicle.cond = 100;
  addLog('你使用快速修理套件，把车修得焕然一新。', 'good');
  renderAll();
}

function mechanicAutoRepair() {
  if (!S.world.vehicle || S.world.vehicle.cond >= 100) return;
  const names = [];
  if (S.player.ability === 'mechanic') names.push(S.player.name);
  if (S.base) {
    for (const n of S.base.population) {
      if (n.alive && n.ability === 'mechanic') names.push(n.name);
    }
  }
  if (!names.length) return;
  const v = S.world.vehicle;
  const before = v.cond;
  v.cond = clamp(v.cond + 12 + names.length * 3, 0, 100);
  if (v.cond >= 100 && before < 100) {
    addLog(`【机械】${names[0]} 已经把车修好了，车况恢复至 100。`, 'good');
  }
}

/* ==================== 农场与牧场 ==================== */

function hasFarmer() {
  return S.player.ability === 'farmer' || (S.base && S.base.population.some(n => n.alive && n.ability === 'farmer'));
}

function hasHerder() {
  return S.player.ability === 'herder' || (S.base && S.base.population.some(n => n.alive && n.ability === 'herder'));
}

function farmPlant(crop) {
  const b = S.base;
  if (!b || !hasFacility('farm')) { toast('需要先建造农场。'); return; }
  if (countInv(b.inv, '种子') < 1) { toast('仓库里没有种子。'); return; }
  removeItem(b.inv, '种子', 1);
  b.crops.push({ crop, progress: 0, watered: false });
  addLog(`【农场】你种下了一批${itemName(crop)}。记得浇水，肥料能加速生长。`, 'good');
  renderAll();
}

function farmWaterAll() {
  const b = S.base;
  if (!b || !b.crops.length) { toast('农场里没有作物。'); return; }
  b.crops.forEach(c => { c.watered = true; });
  addLog('【农场】你给所有作物浇了水（自来水，无限供应）。', 'info');
  renderAll();
}

function farmFertilizeAll() {
  const b = S.base;
  if (!b || !b.crops.length) { toast('农场里没有作物。'); return; }
  if (!removeItem(b.inv, '肥料', 1)) { toast('需要 肥料×1。'); return; }
  b.crops.forEach(c => { c.progress += 2; });
  addLog('【农场】施了肥，所有作物生长 +2 天。', 'good');
  renderAll();
}

function farmHarvestAll() {
  const b = S.base;
  if (!b) return;
  const ready = b.crops.filter(c => c.progress >= CROPS[c.crop].days);
  if (!ready.length) { toast('还没有成熟的作物。'); return; }
  const gain = {};
  for (const c of ready) {
    const n = randInt(CROPS[c.crop].min, CROPS[c.crop].max);
    gain[c.crop] = (gain[c.crop] || 0) + n;
  }
  b.crops = b.crops.filter(c => c.progress < CROPS[c.crop].days);
  for (const [id, n] of Object.entries(gain)) addItem(b.inv, id, n);
  addLog(`【农场】收获：${Object.entries(gain).map(([id, n]) => `${itemName(id)}×${n}`).join('、')}。`, 'good');
  renderAll();
}

function farmDailyTick() {
  const b = S.base;
  if (!b || !hasFacility('farm')) return;
  const auto = hasFarmer();
  for (const c of b.crops) {
    if (auto || c.watered) c.progress++;
    c.watered = false;
  }
  if (!auto) return;
  const ready = b.crops.filter(c => c.progress >= CROPS[c.crop].days);
  if (ready.length) {
    const gain = {};
    for (const c of ready) {
      const n = randInt(CROPS[c.crop].min, CROPS[c.crop].max);
      gain[c.crop] = (gain[c.crop] || 0) + n;
    }
    b.crops = b.crops.filter(c => c.progress < CROPS[c.crop].days);
    for (const [id, n] of Object.entries(gain)) addItem(b.inv, id, n);
    addLog(`【农场】绿手指自动收获：${Object.entries(gain).map(([id, n]) => `${itemName(id)}×${n}`).join('、')}。`, 'good');
  }
  let planted = 0;
  while (b.crops.length < 4 && countInv(b.inv, '种子') > 0) {
    removeItem(b.inv, '种子', 1);
    b.crops.push({ crop: pick(Object.keys(CROPS)), progress: 0, watered: true });
    planted++;
  }
  if (planted) addLog(`【农场】绿手指自动补种了 ${planted} 块田地。`, 'info');
}

function ranchAddAnimal(animal) {
  const b = S.base;
  if (!b || !hasFacility('ranch')) { toast('需要先建造牧场。'); return; }
  if (!removeItem(b.inv, animal, 1)) { toast(`仓库里没有【${itemName(animal)}】。`); return; }
  b.livestock.push({ animal, progress: 0, watered: false, fed: false, mature: false });
  addLog(`【牧场】你把一只${itemName(animal)}放进了牧场。`, 'good');
  renderAll();
}

function ranchWaterAll() {
  const b = S.base;
  if (!b || !b.livestock.length) { toast('牧场里没有牲畜。'); return; }
  b.livestock.forEach(l => { l.watered = true; });
  addLog('【牧场】你给所有牲畜喂了水（自来水，无限供应）。', 'info');
  renderAll();
}

function ranchFeedAll() {
  const b = S.base;
  if (!b || !b.livestock.length) { toast('牧场里没有牲畜。'); return; }
  if (!removeItem(b.inv, '饲料', 1)) { toast('需要 饲料×1。'); return; }
  b.livestock.forEach(l => { l.progress++; });
  addLog('【牧场】喂了饲料，所有牲畜生长 +1 天。', 'good');
  renderAll();
}

function ranchDailyTick() {
  const b = S.base;
  if (!b || !hasFacility('ranch')) return;
  const auto = hasHerder();
  if (auto && countInv(b.inv, '饲料') > 0) {
    removeItem(b.inv, '饲料', 1);
    addLog('【牧场】牧语者给牲畜喂了饲料。', 'info');
  }
  const gain = {};
  for (const l of b.livestock) {
    if (auto) {
      l.progress += 2;
    } else {
      if (l.watered) l.progress++;
      if (l.fed) { l.progress++; l.fed = false; }
    }
    l.watered = false;
    if (!l.mature && l.progress >= ANIMALS[l.animal].days) {
      l.mature = true;
      addLog(`【牧场】一只${itemName(l.animal)}长大了，开始产出。`, 'good');
    }
    if (l.mature && chance(0.8)) {
      const id = ANIMALS[l.animal].produce;
      gain[id] = (gain[id] || 0) + 1;
    }
  }
  for (const [id, n] of Object.entries(gain)) {
    addItem(b.inv, id, n);
    addLog(`【牧场】产出：${itemName(id)}×${n}。`, 'good');
  }
}

function openCompost() {
  const b = S.base;
  if (!b) { toast('还没有基地。'); return; }
  const foods = invList(b.inv).filter(x => x.def.cat === 'food');
  if (!foods.length) { toast('仓库里没有食物。先把食物存入基地仓库。'); return; }
  const list = foods.map(x => `<div class="facility">
    <div><div class="n">${itemName(x.id)} ×${x.n}${x.def.rotten ? ' <span class="tag">变质</span>' : ''}</div></div>
    <div style="display:flex;gap:4px;">
      <button class="btn small" onclick="compostAdd('${x.id}', 1)">+1</button>
      <button class="btn small" onclick="compostAdd('${x.id}', 5)">+5</button>
      <button class="btn small" onclick="compostAdd('${x.id}', ${x.n})">全部</button>
    </div>
  </div>`).join('');
  const rottenN = countInv(b.inv, '变质食品');
  openModal('🪣 堆肥桶',
    `<p class="narrative">把食物投进堆肥桶（变质食物也可以），发酵 2 个时段（约半天）后自动变成肥料。可以一次多投。</p>
     ${rottenN > 0 ? `<div style="margin-top:8px;"><button class="btn small" onclick="compostAddAllRotten()">♻ 全部变质食品一键投入（×${rottenN}）</button></div>` : ''}
     <div style="margin-top:8px;">${list}</div>`,
    '<button class="btn" onclick="closeModal()">关闭</button>');
}

function compostAdd(id, qty) {
  const b = S.base;
  qty = Math.max(1, qty || 1);
  if (!b || !removeItem(b.inv, id, qty)) { toast('仓库里没有这么多。'); return; }
  b.compost.push({ id, qty, eta: 2 });
  addLog(`【堆肥】你把【${itemName(id)}】×${qty} 放进了堆肥桶。`, 'info');
  closeModal();
  renderAll();
}

function compostAddAllRotten() {
  const b = S.base;
  if (!b) return;
  const n = countInv(b.inv, '变质食品');
  if (!n) { toast('仓库里没有变质食品。'); return; }
  compostAdd('变质食品', n);
}

function compostTick() {
  const b = S.base;
  if (!b || !hasFacility('compost') || !b.compost.length) return;
  let done = 0;
  b.compost = b.compost.filter(c => {
    c.eta--;
    if (c.eta <= 0) { done += (c.qty || 1); return false; }
    return true;
  });
  if (done) {
    addItem(b.inv, '肥料', done);
    addLog(`【堆肥】发酵完成，获得 肥料×${done}。`, 'good');
    if (typeof document !== 'undefined') toast(`♻ 堆肥完成：肥料×${done}`);
  }
}

function vehicleCardHtml() {
  const v = S.world.vehicle;
  if (!v) return '';
  return `<div class="card">
    <div class="card-title">🚙 ${escapeHtml(v.name)} <span style="color:var(--dim);font-weight:400;font-size:12px;">油量 ${Math.round(v.fuel)} · 车况 ${Math.round(v.cond)}</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button class="btn small" onclick="vehicleRepair()">🔧 修理（零件+工具组）</button>
      <button class="btn small" onclick="vehicleRefuel()">⛽ 加油（燃油×1）</button>
      <button class="btn small" onclick="useRepairKit()">🧰 快速修理套件</button>
      <button class="btn small" onclick="switchTab('inventory')">查看后备箱（${Math.round(trunkWeight())}/60 kg）</button>
    </div>
    <div class="hint" style="color:var(--dim);font-size:12px;margin-top:6px;">开车赶路更快，但耗油、有噪音，车况差时可能抛锚。</div>
  </div>`;
}

/* ==================== 环境音效 ==================== */

let audioCtx = null;
let soundNodes = null;
let soundTimer = null;

function toggleSound() {
  SETTINGS.sound = !SETTINGS.sound;
  saveSettings();
  if (SETTINGS.sound) startAmbient();
  else stopAmbient();
  updateSoundBtn();
}

function updateSoundBtn() {
  const b = $('soundBtn');
  if (b) b.textContent = SETTINGS.sound ? '🔊 音效开' : '🔇 音效关';
}

function startAmbient() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const len = Math.floor(audioCtx.sampleRate * 2);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const wind = audioCtx.createBufferSource();
    wind.buffer = buf; wind.loop = true;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 210; bp.Q.value = 0.7;
    const wg = audioCtx.createGain(); wg.gain.value = 0.05;
    wind.connect(bp); bp.connect(wg); wg.connect(audioCtx.destination); wind.start();
    const st = audioCtx.createBufferSource();
    st.buffer = buf; st.loop = true;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1600;
    const sg = audioCtx.createGain(); sg.gain.value = 0.006;
    st.connect(hp); hp.connect(sg); sg.connect(audioCtx.destination); st.start();
    soundNodes = [wind, st];
    soundTimer = setInterval(() => {
      try {
        const o = audioCtx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(rand(52, 84), audioCtx.currentTime);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.045, audioCtx.currentTime + 1.4);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 4.2);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + 4.4);
      } catch (e) { /* 忽略 */ }
    }, randInt(18000, 36000));
  } catch (e) {
    SETTINGS.sound = false;
  }
}

function stopAmbient() {
  try {
    if (soundNodes) { soundNodes.forEach(n => { try { n.stop(); } catch (e) { /* 忽略 */ } }); soundNodes = null; }
    if (soundTimer) { clearInterval(soundTimer); soundTimer = null; }
  } catch (e) { /* 忽略 */ }
}

/* ==================== 设置 / 收集 / 多存档 ==================== */

function openSettings() {
  const rateOptions = [
    ['0.03', '低（3%，更稀有的奇遇）'],
    ['0.05', '标准（5%，默认）'],
    ['0.08', '高（8%，更热闹的世界）']
  ].map(([v, label]) => `<option value="${v}" ${String(SETTINGS.adventureRate) === v ? 'selected' : ''}>${label}</option>`).join('');
  const html = `
    <div class="field"><label>奇遇触发概率</label><select id="setRate">${rateOptions}</select></div>
    <div class="hint" style="color:var(--dim);font-size:12px;margin-top:6px;">每次行动、赶路、过夜时按此概率判定奇遇（剧情事件 / 特殊人物）。</div>
    <div style="margin-top:12px;display:flex;gap:8px;">
      <button class="btn small" onclick="toggleSound()" id="soundBtnInSetting">${SETTINGS.sound ? '🔊 音效开' : '🔇 音效关'}</button>
      <span style="color:var(--dim);font-size:12px;align-self:center;">风声、电台杂音与远处尸吼（需要浏览器支持）</span>
    </div>`;
  openModal('⚙ 设置', html,
    '<button class="btn primary" onclick="saveSettingsFromModal()">保存</button><button class="btn" onclick="closeModal()">取消</button>');
}

function saveSettingsFromModal() {
  const v = parseFloat($('setRate').value);
  SETTINGS.adventureRate = clamp(v || 0.05, 0.01, 0.2);
  saveSettings();
  toast('设置已保存。');
  closeModal();
}

function openCollect() {
  const arcDone = Object.keys(S.world.flags.arcs);
  const npcList = S.world.specialNpcs.map(n => {
    const done = !!S.world.flags.arcs[n.id];
    const arc = ARC2[n.id];
    return `<div class="facility">
      <div><div class="n">${n.sex === '男' ? '🧔' : '👩'} ${escapeHtml(n.name)} <span class="tag">${escapeHtml(n.faction)}</span>${done ? '<span class="badge ok">支线完成</span>' : ''}</div>
      <div class="d">${n.recruited ? '已入队' : n.met ? '已结识' : '尚未遇见'}${done && arc ? ' · ' + escapeHtml(arc.epilogue) : ''}</div></div>
    </div>`;
  }).join('');
  const achList = ACHIEVEMENTS.map(a => `
    <div class="facility">
      <div><div class="n">${a.icon} ${a.name} ${ACHIEVES[a.id] ? '<span class="badge ok">已解锁</span>' : '<span class="badge">未解锁</span>'}</div>
      <div class="d">${a.desc}</div></div>
    </div>`).join('');
  openModal('🏆 收集图鉴',
    `<div class="card-title" style="margin-bottom:6px;">成就（${Object.keys(ACHIEVES).length}/${ACHIEVEMENTS.length}）</div>${achList}
     <div class="card-title" style="margin:14px 0 6px;">人物志（${arcDone.length}/${S.world.specialNpcs.length} 条支线）</div>${npcList}`,
    '<button class="btn" onclick="closeModal()">返回</button>');
}

function slotMeta(k) {
  try {
    const raw = localStorage.getItem(SLOT_KEYS[k]);
    if (!raw) return '（空）';
    const d = JSON.parse(raw);
    return `${escapeHtml(d.player.name)} · ${fmtTime(d.world.day)}`;
  } catch (e) { return '（损坏）'; }
}

function slotSave(k) {
  try {
    localStorage.setItem(SLOT_KEYS[k], JSON.stringify(S));
    toast(`已保存到存档位 ${k.slice(-1)}。`);
    openMenu();
  } catch (e) { toast('保存失败。'); }
}

function slotLoad(k) {
  try {
    const raw = localStorage.getItem(SLOT_KEYS[k]);
    if (!raw) { toast('该存档位是空的。'); return; }
    S = ensureSaveCompat(JSON.parse(raw));
    log = [];
    ui.tab = 'actions';
    showGame();
    addLog('【系统】已从存档位载入这一世。', 'sys');
    renderAll();
  } catch (e) { toast('载入失败：存档损坏。'); }
}

function slotDelete(k) {
  try {
    localStorage.removeItem(SLOT_KEYS[k]);
    toast('存档位已清空。');
    openMenu();
  } catch (e) { toast('删除失败。'); }
}

/* ==================== 随身无线电与任务系统 ==================== */

function hasPersonalRadio() {
  return countInv(S.player.inventory, '随身无线电') > 0 || hasRadio();
}

function radioTaskForFaction(faction) {
  return S.world.radioTasks.find(t => t.faction === faction && !t.done) || null;
}

function radioGenerateTask(faction) {
  const templates = TASK_TEMPLATES[faction];
  const tpl = pick(templates);
  return {
    id: 'task_' + Math.random().toString(36).slice(2, 9),
    faction, npc: null,
    name: tpl.name, type: tpl.type,
    need: tpl.need || null,
    count: tpl.count || null,
    target: tpl.target || null,
    progressStart: S.world.stat.kills,
    reward: tpl.reward,
    courier: null, eta: 0, done: false, targetVisited: false
  };
}

function taskDesc(t) {
  if (t.type === 'items') {
    return `需要物资：${Object.entries(t.need).map(([id, n]) => `${itemName(id)}×${n}`).join('、')}`;
  }
  if (t.type === 'kill') {
    const cur = S.world.stat.kills - t.progressStart;
    return `猎杀丧尸：${Math.min(cur, t.count)}/${t.count}`;
  }
  return `目标地点：${LOC_DEFS[t.target].name}${t.targetVisited ? ' ✅' : ''}`;
}

function rewardText(reward) {
  const parts = [];
  if (reward.items) parts.push(reward.items.map(([id, n]) => `${itemName(id)}×${n}`).join('、'));
  if (reward.money) parts.push(`¥${reward.money}`);
  if (reward.rep) parts.push('声望');
  return parts.join('、') || '无';
}

function openRadio() {
  openModal('📻 随身无线电',
    `<p class="narrative">频道里只有沙沙的电流声，但你知道，另一端还有人在听。</p>
     <div class="row"><span class="k">进行中的任务</span><span class="v">${S.world.radioTasks.filter(t => !t.done).length} 个</span></div>`,
    `<button class="choice" onclick="radioFactions()"><span class="t">📡 联系阵营</span><span class="d">接取任务、购买军火</span></button>
     <button class="choice" onclick="radioTasks()"><span class="t">📦 我的任务</span><span class="d">查看进度、指派营地成员代送</span></button>
     <button class="choice" onclick="radioNpcs()"><span class="t">👥 联系认识的人</span><span class="d">询问近况、回应他们的求助</span></button>
     <button class="btn" onclick="closeModal()">关闭</button>`);
}

function radioFactions() {
  const list = Object.entries(FACTION_HQ).map(([f, locId]) => {
    const rep = S.world.factions[f];
    const task = radioTaskForFaction(f);
    return `<div class="facility">
      <div><div class="n">${FACTION_NAMES[f]} <span class="tag">${repText(rep)}</span></div>
      <div class="d">驻地：${CITIES[LOC_DEFS[locId].city]} · ${LOC_DEFS[locId].name}${task ? ' · 已有进行中任务' : ''}</div></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn small" onclick="radioFactionChain('${f}')">传奇任务线</button>
        <button class="btn small" onclick="radioContactFaction('${f}')">日常委托</button>
        <button class="btn small" onclick="radioFarmShop()">农贸商店</button>
      </div>
    </div>`;
  }).join('');
  openModal('📡 联系阵营', `<p class="narrative">选择要联络的势力。任务奖励会通过无线电确认，并由你或你的营地成员送达。</p><div style="margin-top:8px;">${list}</div>`,
    '<button class="btn" onclick="openRadio()">返回</button>');
}

function radioContactFaction(faction) {
  if (radioTaskForFaction(faction)) {
    radioTasks();
    return;
  }
  const task = radioGenerateTask(faction);
  S.world.radioOffers.push(task);
  openModal(`📡 ${FACTION_NAMES[faction]}`,
    `<p class="narrative">对方开出了一个委托：</p>
     <p class="narrative"><b>${escapeHtml(task.name)}</b></p>
     <p class="narrative">${taskDesc(task)}</p>
     <p class="narrative" style="color:var(--warn);">报酬：${rewardText(task.reward)}（完成后自动放入仓库）</p>`,
    `<button class="choice" onclick="radioAcceptOffer('${task.id}')"><span class="t">接受任务</span></button>
     <button class="btn" onclick="radioDismissOffer('${task.id}')">拒绝</button>
     ${(faction === 'military' || faction === 'caravan') ? `<button class="btn" onclick="radioWeaponShop()">🔫 军火交易</button>` : ''}`);
}

function radioAcceptOffer(id) {
  const i = S.world.radioOffers.findIndex(t => t.id === id);
  if (i < 0) return;
  const task = S.world.radioOffers.splice(i, 1)[0];
  S.world.radioTasks.push(task);
  addLog(`【通讯】你接下了${FACTION_NAMES[task.faction]}的委托「${task.name}」。`, 'info');
  closeModal();
  radioTasks();
}

function radioDismissOffer(id) {
  S.world.radioOffers = S.world.radioOffers.filter(t => t.id !== id);
  openRadio();
}

function radioTasks() {
  const active = S.world.radioTasks.filter(t => !t.done);
  const list = active.map(t => {
    const who = t.npc
      ? (S.world.specialNpcs.find(n => n.id === t.npc) || { name: '某人' }).name
      : FACTION_NAMES[t.faction];
    const where = t.faction ? `${CITIES[LOC_DEFS[FACTION_HQ[t.faction]].city]} · ${LOC_DEFS[FACTION_HQ[t.faction]].name}` : '对方所在地';
    const courier = t.courier ? (S.base.population.find(n => n.id === t.courier) || { name: '某人' }).name : null;
    return `<div class="facility">
      <div><div class="n">${escapeHtml(t.name)} <span class="tag">${escapeHtml(who)}</span></div>
      <div class="d">${taskDesc(t)} · 送达：${where}${courier ? ` · ${courier} 代送中（还剩 ${Math.max(0, Math.ceil(t.eta))} 天）` : ''}</div></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${t.type === 'items' && !t.courier ? `<button class="btn small" onclick="radioAssignCourier('${t.id}')">指派NPC代送</button>` : ''}
        <button class="btn small danger" onclick="radioAbandonTask('${t.id}')">放弃</button>
      </div>
    </div>`;
  }).join('');
  openModal('📦 我的任务',
    `<p class="narrative">任务完成后，奖励会由无线电确认，并自动存入基地仓库。</p>
     <div style="margin-top:8px;">${list || '<p class="narrative" style="color:var(--dim);">暂无进行中的任务。去「联系阵营」接一个吧。</p>'}</div>`,
    '<button class="btn" onclick="openRadio()">返回</button>');
}

function radioAbandonTask(id) {
  S.world.radioTasks = S.world.radioTasks.filter(t => t.id !== id || t.done);
  addLog('你放弃了这个任务。', 'info');
  radioTasks();
}

function radioAssignCourier(taskId) {
  const task = S.world.radioTasks.find(t => t.id === taskId);
  if (!task || !S.base) return;
  const pop = S.base.population.filter(n => n.alive);
  if (!pop.length) { toast('基地里没有可用的人手。'); return; }
  const list = pop.map(n => `<div class="facility">
    <div><div class="n">${n.sex === '男' ? '🧔' : '👩'} ${escapeHtml(n.name)} <span class="tag">${ROLES.find(r => r.id === n.role).name}</span></div>
    <div class="d">生命 ${Math.round(n.health)} · 忠诚 ${Math.round(n.loyalty)}</div></div>
    <button class="btn small" onclick="radioConfirmCourier('${taskId}','${n.id}')">派他/她去</button>
  </div>`).join('');
  openModal('🚶 指派代送',
    `<p class="narrative">选择一名营地成员，带着任务物资前往${task.faction ? FACTION_NAMES[task.faction] : '对方'}的驻地，送达后自动带回奖励。</p>
     <div style="margin-top:8px;">${list}</div>`,
    '<button class="btn" onclick="radioTasks()">返回</button>');
}

function radioConfirmCourier(taskId, npcId) {
  const task = S.world.radioTasks.find(t => t.id === taskId);
  if (!task) return;
  task.courier = npcId;
  task.eta = courierEtaDays(task);
  const npc = S.base.population.find(n => n.id === npcId);
  npcPackForTrip(npc, task.eta);
  addLog(`【通讯】${npc.name} 带上口粮药品出发了，预计 ${task.eta} 天后送达。`, 'info');
  radioTasks();
}

function courierEtaDays(task) {
  const hqId = task.faction ? FACTION_HQ[task.faction] : (() => {
    const npc = S.world.specialNpcs.find(n => n.id === task.npc);
    return npc ? npc.location : 'home';
  })();
  const fromId = S.base ? S.base.locId : 'home';
  const cross = LOC_DEFS[fromId].city !== LOC_DEFS[hqId].city ? 2 : 0;
  return clamp(LOC_DEFS[hqId].travel + cross + 1, 2, 7);
}

function taskVisitProgress(locId) {
  for (const t of S.world.radioTasks) {
    if (!t.done && t.type === 'visit' && t.target === locId) {
      t.targetVisited = true;
      addLog(`【任务】你到达了「${t.name}」的目标地点。`, 'good');
    }
  }
}

function taskReady(t) {
  if (t.type === 'items') {
    return Object.entries(t.need).every(([id, n]) => countInv(S.player.inventory, id) >= n);
  }
  if (t.type === 'kill') {
    return (S.world.stat.kills - t.progressStart) >= t.count;
  }
  return !!t.targetVisited;
}

function checkAutoTurnIn(locId) {
  for (const t of S.world.radioTasks) {
    if (t.done || t.courier) continue;
    const where = t.faction ? FACTION_HQ[t.faction] : (() => {
      const npc = S.world.specialNpcs.find(n => n.id === t.npc);
      return npc ? npc.location : null;
    })();
    if (where !== locId) continue;
    if (taskReady(t)) personalTurnIn(t);
  }
}

function personalTurnIn(t) {
  t.done = true;
  if (t.type === 'items') {
    for (const [id, n] of Object.entries(t.need)) removeItem(S.player.inventory, id, n);
  }
  rewardToBase(t);
  addLog(`【通讯】任务「${t.name}」完成！奖励已自动放入仓库：${rewardText(t.reward)}。`, 'good');
  if (t.npc) {
    const npc = S.world.specialNpcs.find(n => n.id === t.npc);
    if (npc) {
      npc.quest.done = true;
      npc.favor = clamp(npc.favor + 30, 0, 100);
      npcAttitudeCheck(npc);
      addLog(`【通讯】${npc.name} 收到了你的帮助，好感度 +30。${npc.quest.doneText}`, 'good');
      S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 通过无线电帮了 ${npc.name}。`);
    }
  }
  renderAll();
}

function rewardToBase(t) {
  const inv = S.base ? S.base.inv : S.player.inventory;
  const r = t.reward;
  if (r.items) {
    for (const [id, n] of r.items) {
      if (id === '现金') S.player.money += n * 100;
      else addItem(inv, id, n);
    }
  }
  if (r.money) S.player.money += r.money;
  if (r.rep && t.faction) S.world.factions[t.faction] = clamp(S.world.factions[t.faction] + r.rep, -5, 10);
  if (t.chain) {
    const ch = S.world.legendChains[t.chain.faction];
    if (ch && !ch.done) {
      ch.stage++;
      if (ch.stage >= LEGEND_CHAINS[t.chain.faction].stages.length) {
        ch.done = true;
        addLog(`【传奇】${FACTION_NAMES[t.chain.faction]}的传奇任务线全部完成，神器【${LEGEND_CHAINS[t.chain.faction].weapon}】已发放到仓库！`, 'sys');
        S.world.history.push(`${fmtTime(S.world.day)}：${S.player.name} 完成了${FACTION_NAMES[t.chain.faction]}的传奇任务线。`);
      } else {
        addLog(`【传奇】${FACTION_NAMES[t.chain.faction]}的任务线推进到下一阶段。`, 'sys');
      }
    }
  }
  checkAch();
}

function chainState(faction) {
  return S.world.legendChains[faction] || { stage: 0, done: false };
}

function hasChainTask(faction) {
  return !!S.world.radioTasks.find(t => !t.done && t.chain && t.chain.faction === faction);
}

function radioFactionChain(faction) {
  const chain = LEGEND_CHAINS[faction];
  const st = chainState(faction);
  const stages = chain.stages.map((s, i) => {
    const done = st.done || i < st.stage;
    const current = !st.done && i === st.stage;
    const locked = !st.done && i > st.stage;
    const name = locked ? '？？？' : s.name;
    const content = locked ? '？？？' : s.desc;
    const statusBadge = done ? '<span class="badge ok">已完成</span>' : current ? (hasChainTask(faction) ? '<span class="badge warnb">进行中</span>' : '<span class="badge">可接取</span>') : '';
    return `<div class="facility">
      <div>
        <div class="n">${done ? '✅' : current ? '▶️' : '🔒'} ${escapeHtml(name)}${statusBadge}</div>
        <div class="d">${escapeHtml(content)}</div>
        <div class="d" style="color:var(--warn);">奖励：${rewardText(s.reward)}</div>
      </div>
      ${current && !hasChainTask(faction) ? `<button class="btn small" onclick="chainAcceptStage('${faction}')">接受本阶段</button>` : ''}
    </div>`;
  }).join('');
  openModal(`📜 ${FACTION_NAMES[faction]} · 传奇任务线`,
    `<p class="narrative">完成全部三个阶段，将获得阵营神器 <b>【${escapeHtml(chain.weapon)}】</b>（威力远超普通武器，仅此一件）。未解锁阶段以“？”隐藏内容，但奖励始终可见。</p>
     ${st.done ? '<p class="narrative" style="color:var(--good);">任务线已完成，神器已发放。</p>' : ''}
     <div style="margin-top:10px;">${stages}</div>`,
    '<button class="btn" onclick="radioFactions()">返回</button>');
}

function chainAcceptStage(faction) {
  const chain = LEGEND_CHAINS[faction];
  const st = chainState(faction);
  if (st.done || hasChainTask(faction)) { radioFactionChain(faction); return; }
  const s = chain.stages[st.stage];
  const task = {
    id: 'task_' + Math.random().toString(36).slice(2, 9),
    faction, npc: null, chain: { faction, stage: st.stage },
    name: `【传奇】${s.name}`,
    type: s.type,
    need: s.need || null,
    count: s.count || null,
    target: s.target || null,
    progressStart: S.world.stat.kills,
    reward: s.reward,
    courier: null, eta: 0, done: false, targetVisited: false
  };
  S.world.radioTasks.push(task);
  addLog(`【传奇】你接下了${FACTION_NAMES[faction]}任务线第 ${st.stage + 1} 阶段「${s.name}」。`, 'sys');
  radioFactionChain(faction);
}

function taskDailyTick() {
  for (const t of S.world.radioTasks) {
    if (t.done || !t.courier) continue;
    const npc = S.base && S.base.population.find(n => n.id === t.courier);
    if (npc) {
      npcConsumeTrip(npc);
      if (chance(0.08)) {
        npc.health = clamp(npc.health - randInt(5, 15), 0, 100);
        addLog(`【通讯】${npc.name} 在送货路上受了点伤。`, 'warn');
      }
    }
    t.eta--;
    if (t.eta <= 0) {
      t.done = true;
      if (npc) npcReturnToBase(npc);
      rewardToBase(t);
      const cname = npc ? npc.name : '营地成员';
      addLog(`【通讯】${cname} 已完成「${t.name}」并带回奖励：${rewardText(t.reward)}，已自动放入仓库。`, 'good');
      if (t.npc) {
        const target = S.world.specialNpcs.find(n => n.id === t.npc);
        if (target) {
          target.quest.done = true;
          target.favor = clamp(target.favor + 30, 0, 100);
          npcAttitudeCheck(target);
        }
      }
    }
  }
}

function npcRadioInbound() {
  if (!hasPersonalRadio()) return;
  if (S.world.day - (S.world.flags.lastNpcCall || 0) < 4) return;
  const pool = S.world.specialNpcs.filter(n => n.alive && !n.recruited && n.met && !n.quest.done);
  if (!pool.length) return;
  if (!chance(0.08)) return;
  const npc = pick(pool);
  S.world.flags.lastNpcCall = S.world.day;
  const t = {
    id: 'task_' + Math.random().toString(36).slice(2, 9),
    faction: null, npc: npc.id,
    name: `${npc.name}的求助`,
    type: npc.quest.type,
    need: npc.quest.need || null,
    count: npc.quest.need || null,
    target: npc.quest.target || null,
    progressStart: S.world.stat.kills,
    reward: { items: Object.entries(npc.quest.reward || {}) },
    courier: null, eta: 0, done: false, targetVisited: false
  };
  S.world.radioTasks.push(t);
  addLog(`【通讯】${npc.name} 通过无线电找你帮忙：“${npc.quest.text}”`, 'warn');
  toast(`📻 ${npc.name} 向你发来求助`);
}

function radioNpcs() {
  const met = S.world.specialNpcs.filter(n => n.met && n.alive);
  const list = met.map(n => `<div class="facility">
    <div><div class="n">${n.sex === '男' ? '🧔' : '👩'} ${escapeHtml(n.name)} <span class="tag">${escapeHtml(n.faction)}</span>${n.recruited ? '<span class="badge ok">已入队</span>' : ''}</div>
    <div class="d">好感度 ${Math.round(n.favor)} / 100 · ${n.quest.done ? '托付已了结' : '有未了的心愿'}</div></div>
    <button class="btn small" onclick="radioAskNpc('${n.id}')">询问近况</button>
  </div>`).join('');
  openModal('👥 联系认识的人',
    `<p class="narrative">主动问候不会打扰他们。听到熟悉的声音，本身就是一种安慰。</p>
     <div style="margin-top:8px;">${list || '<p class="narrative" style="color:var(--dim);">你还没有在电波里认识任何人。</p>'}</div>`,
    '<button class="btn" onclick="openRadio()">返回</button>');
}

function radioAskNpc(id) {
  const npc = S.world.specialNpcs.find(n => n.id === id);
  if (!npc) return;
  const locName = npc.location && LOC_DEFS[npc.location] ? `${CITIES[LOC_DEFS[npc.location].city]} · ${LOC_DEFS[npc.location].name}` : '未知地点';
  const invNames = Object.keys(npc.inv).filter(x => countInv(npc.inv, x) > 0).slice(0, 3).map(itemName).join('、');
  const lines = [
    `他/她最近在【${locName}】附近活动。`,
    npc.quest.done ? '之前托付的事已经了结，他/她说欠你一个人情。' : `他/她还在为“${npc.quest.text}”发愁。`,
    `身上带着：${invNames || '几乎一无所有'}。`,
    `他/她对你的好感度是 ${Math.round(npc.favor)} / 100。`
  ];
  openModal(`📻 ${escapeHtml(npc.name)}`,
    lines.map(t => `<p class="narrative">${escapeHtml(t)}</p>`).join(''),
    `<button class="btn" onclick="radioNpcs()">返回</button>`);
}

function radioWeaponShop() {
  const list = WEAPON_SHOP.map(w => {
    const def = ITEMS[w.id];
    const can = S.player.money >= w.price;
    return `<div class="facility">
      <div><div class="n">${w.id} <span class="tag">${def.cat === 'gun' ? '热武器' : '冷兵器'}</span><span class="tag">伤害 ${def.dmg}</span>${def.burst ? '<span class="tag">连发</span>' : ''}</div>
      <div class="d">${def.desc} · 噪音 ${def.noise} · 重量 ${def.weight}kg</div></div>
      <button class="btn small" ${can ? '' : 'disabled'} onclick="buyWeapon('${w.id}', ${w.price})">¥${w.price}</button>
    </div>`;
  }).join('');
  openModal('🔫 军火交易',
    `<p class="narrative">你的现金：¥${Math.round(S.player.money)}。威力越大的武器，价码越高——这是乱世里最硬的规矩。</p>
     <div style="margin-top:8px;">${list}</div>`,
    '<button class="btn" onclick="openRadio()">返回</button>');
}

function radioFarmShop() {
  const list = FARM_SHOP.map(([id, price]) => {
    const can = S.player.money >= price;
    return `<div class="facility">
      <div><div class="n">${itemName(id)}</div><div class="d">${ITEMS[id].desc || ''}</div></div>
      <button class="btn small" ${can ? '' : 'disabled'} onclick="buyFarmItem('${id}', ${price})">¥${price}</button>
    </div>`;
  }).join('');
  openModal('🌾 农贸商店',
    `<p class="narrative">你的现金：¥${Math.round(S.player.money)}。种子、肥料、饲料、农作物与活体牲畜都在这里。</p>
     <div style="margin-top:8px;">${list}</div>`,
    '<button class="btn" onclick="openRadio()">返回</button>');
}

function buyFarmItem(id, price) {
  if (S.player.money < price) { toast('现金不足。'); return; }
  S.player.money -= price;
  addItem(S.player.inventory, id, 1);
  addLog(`你花 ¥${price} 买下了【${itemName(id)}】。`, 'good');
  radioFarmShop();
}

function buyWeapon(id, price) {
  if (S.player.money < price) { toast('现金不足。'); return; }
  S.player.money -= price;
  addItem(S.player.inventory, id, 1);
  const def = ITEMS[id];
  if (def.cat === 'gun') addItem(S.player.inventory, def.ammo, def.burst ? 24 : 12);
  addLog(`你花 ¥${price} 买下了【${id}】${def.cat === 'gun' ? '和配套弹药' : ''}。`, 'good');
  radioWeaponShop();
}

function init() {
  initCreationUI();
  updateSoundBtn();
  $('loadBtn').classList.toggle('hidden', !loadFromStorage());
  if (!S) $('gameScreen').classList.add('hidden');
  if (typeof location !== 'undefined' && location.protocol !== 'file:') checkForUpdates(true);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}
