# 给 Codex 的生图任务：拿铁彩铅桌宠正式素材（第二阶段）

> 把下面「---」之间的全部内容复制给 Codex。

---

## 背景

我在开发一个 macOS 桌面宠物（基于开源项目 KuroCat，Tauri + Canvas 2D）。主角是我家的猫「拿铁」，画面是：拿铁坐在一个小键盘后面，我敲键盘时它的前爪轮流拍下去，尾巴会摆动，摸它的头会有表情变化。

第一阶段你已经帮我定好了画风和配饰：

- **画风：彩铅**。定稿参考图：
  `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/codex-round1/latte-colored-pencil-base.png`
- **配饰（可叠加的贴图）**：黄色甜甜圈伊丽莎白圈、红色项圈带黄色小铃铛、灰蓝色胸背带。第一阶段的配饰图层：
  - `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/codex-round1/latte-layer-yellow-donut.png`
  - `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/codex-round1/latte-layer-red-bell-collar.png`
  - `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/codex-round1/latte-layer-slate-blue-harness.png`
  - 叠放预览：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/codex-round1/latte-colored-pencil-preview.html`
- 拿铁本人的照片在 `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/reference/`

这一阶段要把这张定稿**拆成可以分层动画的透明图层**。程序会把这些图层一层层叠起来绘制，所以**所有图层必须严格对齐**——这是本次任务最重要的要求。

**只做美术素材，不要改动 `kurocat/` 下的任何代码文件**，接入程序由我这边负责。

## 画布规格（所有图层统一）

- 尺寸：**1024 × 1024 px**，PNG，透明背景（RGBA）
- 所有图层**共用同一个画布坐标系**：把任意几张按顺序叠在一起（都放在 0,0），就是一只完整的猫，不需要任何偏移
- **不要画键盘**（键盘由程序绘制），也不要画地面、阴影、背景色、文字
- 猫的位置：水平居中；前爪「放下」时爪底所在的水平线在 **y ≈ 880**（这是程序里键盘上表面的位置）；耳尖最高点在 y ≈ 120 左右
- 比例、花纹、画风与定稿参考图一致（定稿去掉键盘后等比缩放进这个画布即可）

## 要交付的图层

输出目录（已存在，空的）：
`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/`

### 1. 身体 + 头（6 种表情）

不含前臂和前爪（从手肘往下去掉，原来被前臂挡住的胸口/肚子用毛补全），不含尾巴，不含配饰。

| 文件名 | 表情 |
|---|---|
| `body_idle.png` | 默认：和定稿一样的一本正经面瘫盯人 |
| `body_blink.png` | 眨眼：双眼闭上，其余与 idle 完全相同 |
| `body_typing.png` | 打字中：眼睛微眯、往下看键盘，嘴角露出一点点舌尖（认真到有点傻） |
| `body_happy.png` | 被摸头：眼睛眯成满足的弧线，嘴角微微上扬 |
| `body_angry.png` | 被吵醒不爽：耳朵压平成「飞机耳」，眼睛眯起、小皱眉（不爽但不凶） |
| `body_sleep.png` | 睡着：双眼闭上，嘴巴放松（Zzz 由程序画，不要画字） |

**关键做法**：先做好 `body_idle.png`，其余 5 张都**只改头部**（脸 + 耳朵区域）。生成新表情后，用一个柔边蒙版只把头部区域贴回 idle 上，保证脖子以下的像素和 idle **完全一致**。

### 2. 前臂 + 前爪（左右各 2 帧）

| 文件名 | 内容 |
|---|---|
| `paw_left_down.png` | 左前臂（画面左侧），爪子放下，压在 y ≈ 880 的线上 |
| `paw_left_up.png` | 左前臂抬起，爪子离开约 60–80 px，可以看到一点黑色肉垫 |
| `paw_right_down.png` | 右前臂（画面右侧），放下 |
| `paw_right_up.png` | 右前臂抬起 |

- 前臂上端从手肘开始，和身体图层的手肘位置**无缝衔接**（叠在 body 上看不出接缝）
- 「down」那帧就是定稿里搭在键盘上的爪子，不要变形
- 拿铁的肉垫是**黑色**的

### 3. 尾巴（3 帧摆动）

| 文件名 | 内容 |
|---|---|
| `tail_0.png` | 尾巴偏左（靠近身体） |
| `tail_1.png` | 尾巴居中（和定稿一样，从身体右侧绕出往上翘） |
| `tail_2.png` | 尾巴偏右（向外甩开） |

- 尾巴根部位置三帧**完全相同**，并且和身体图层的臀部右侧衔接自然
- 灰黑环纹，尾尖实心黑色

### 4. 配饰（叠在身体上）

| 文件名 | 内容 |
|---|---|
| `acc_donut.png` | 黄色甜甜圈伊丽莎白圈，戴在脖子上，**不能挡住嘴和鼻子** |
| `acc_bell_collar.png` | 窄红色项圈 + 正中一颗黄色小铃铛 |
| `acc_harness.png` | 灰蓝色 Y 形胸背带 |

- 直接画在 1024 画布的正确位置上（叠在 `body_idle.png` 上就是戴好的样子），不需要再写偏移坐标
- 每种表情的头部（尤其 angry 的飞机耳、typing 的低头）叠上配饰后都不能穿帮
- 项圈和胸背带要能**同时佩戴**（两张一起叠也自然）；甜甜圈和项圈二选一即可

### 5. 说明文件

`manifest.json`，内容示例：

```json
{
  "canvas": [1024, 1024],
  "drawOrder": ["tail", "body", "accessory", "paw_left", "paw_right"],
  "pawRestLineY": 880,
  "anchors": {
    "neck": [512, 0],
    "headTop": [512, 0],
    "leftPawTip": [0, 0],
    "rightPawTip": [0, 0],
    "tailRoot": [0, 0]
  }
}
```

把 anchors 换成实际测量的像素坐标（脖子中心、头顶中心、两只爪尖放下时的位置、尾巴根部）。如果你认为绘制顺序应该不同（比如某件配饰要画在爪子上面），在这里写明。

## 验证（必须做）

1. 写一个预览页 `preview.html`（放在同一目录），用 Canvas 2D 按 manifest 的顺序叠图层，提供：
   - 表情切换（6 种）
   - 配饰勾选（甜甜圈 / 铃铛项圈 / 胸背带）
   - 「模拟打字」按钮：左右爪交替 down/up，尾巴在 0/1/2 之间循环
   - 背景可切换深色 / 浅色（检查透明边缘有没有白边或杂色）
2. 输出一张总览图 `contact_sheet.png`：所有图层单独排列 + 几种组合效果
3. 自查清单（任何一项不符合都要修）：
   - [ ] 所有 PNG 都是 1024 × 1024、透明背景
   - [ ] body 的 6 张表情叠在一起切换时，脖子以下纹丝不动
   - [ ] 爪子 down/up 切换时，手肘处没有接缝、没有跳动
   - [ ] 尾巴 3 帧根部不跳
   - [ ] 配饰在 6 种表情上都不穿帮
   - [ ] 深色和浅色背景下边缘都干净，没有残留的米白底色
   - [ ] 画风、毛色、花纹和定稿一致，能认出是拿铁
   - [ ] 比例自然：不胖、不是大头娃娃

## 交付

完成后告诉我：
- 输出目录里每个文件的清单
- 自查清单每一项的结果
- 你觉得还不够好、需要我决定的地方

---
