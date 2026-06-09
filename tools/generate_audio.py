import asyncio
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio"
VOICE = "zh-CN-XiaoxiaoNeural"
ROLE_AUDIO_KEY = {
    "刺客": "assassin",
    "莫甘娜": "morgana",
    "爪牙": "minion",
    "莫德雷德": "mordred",
    "奥伯伦": "oberon",
}

CFG = {
    5: {"good": ["梅林", "派西维尔", "忠臣"], "evil": ["刺客", "莫甘娜"], "min": 0},
    6: {"good": ["梅林", "派西维尔", "忠臣", "忠臣"], "evil": ["刺客", "莫甘娜"], "min": 0},
    7: {"good": ["梅林", "派西维尔", "忠臣", "忠臣"], "evil": ["刺客", "莫甘娜", "爪牙"], "min": 1},
    8: {"good": ["梅林", "派西维尔", "忠臣", "忠臣", "忠臣"], "evil": ["刺客", "莫甘娜", "爪牙"], "min": 1},
    9: {"good": ["梅林", "派西维尔", "忠臣", "忠臣", "忠臣", "忠臣"], "evil": ["刺客", "莫甘娜", "爪牙"], "min": 1},
    10: {"good": ["梅林", "派西维尔", "忠臣", "忠臣", "忠臣", "忠臣"], "evil": ["刺客", "莫甘娜", "爪牙", "爪牙"], "min": 2},
}


def evils(player_count, mordred=False, oberon=False):
    roles = list(CFG[player_count]["evil"])
    if mordred and "爪牙" in roles:
        roles[roles.index("爪牙")] = "莫德雷德"
    if oberon and "爪牙" in roles:
        roles[roles.index("爪牙")] = "奥伯伦"
    return roles


def join_roles(roles):
    return "、".join(roles)


def role_audio_key(roles):
    return "-".join(ROLE_AUDIO_KEY[role] for role in roles)


def gen(player_count, mordred=False, oberon=False):
    evil_roles = evils(player_count, mordred, oberon)
    visible_evil = [role for role in evil_roles if role != "奥伯伦"]
    merlin_thumbs = [role for role in evil_roles if role != "莫德雷德"]
    steps = []

    # 0: close eyes
    steps.append(["请所有人闭上眼睛"])

    # 1: evil meet - open eyes
    steps.append([f"{join_roles(visible_evil)}请睁开眼睛"])

    # 2: evil confirm each other
    steps.append(["确认彼此身份"])

    # 3: evil close eyes
    steps.append(["请闭上眼睛"])

    # 3: merlin see thumbs
    steps.append([f"请{join_roles(merlin_thumbs)}竖起大拇指", "梅林请睁开眼睛"])

    # 4: merlin - put thumbs down, close eyes
    steps.append(["梅林请闭上眼睛", "请收回大拇指"])

    # 5: percival open eyes
    steps.append([
        "请梅林和莫甘娜竖起大拇指",
        "派西维尔请睁开眼睛",
    ])

    # 6: percival - put thumbs down, close eyes
    steps.append(["派西维尔请闭上眼睛", "请收回大拇指"])

    # 7: dawn
    steps.append(["天亮了，请所有人睁开眼睛"])

    return ["。".join(step) for step in steps]


def variants():
    for player_count in range(5, 11):
        if CFG[player_count]["min"] == 0:
            yield player_count, False, False
        elif CFG[player_count]["min"] == 1:
            yield player_count, False, False
            yield player_count, True, False
            yield player_count, False, True
        else:
            yield player_count, False, False
            yield player_count, True, False
            yield player_count, False, True
            yield player_count, True, True


def audio_name(player_count, mordred, oberon, step):
    evil_roles = evils(player_count, mordred, oberon)
    if step == 0:
        return "close-eyes.mp3"
    if step == 1:
        visible = [role for role in evil_roles if role != "奥伯伦"]
        return f"evil-{role_audio_key(visible)}.mp3"
    if step == 2:
        return "evil-confirm.mp3"
    if step == 3:
        return "evil-close-eyes.mp3"
    if step == 4:
        thumbs = [role for role in evil_roles if role != "莫德雷德"]
        return f"merlin-{role_audio_key(thumbs)}.mp3"
    if step == 5:
        return "merlin-close-eyes.mp3"
    if step == 6:
        return "percival.mp3"
    if step == 7:
        return "percival-close-eyes.mp3"
    if step == 8:
        return "dawn.mp3"
    raise ValueError(f"Unknown step: {step}")


async def synthesize(text, path):
    communicate = edge_tts.Communicate(text, VOICE, rate="-10%")
    await communicate.save(str(path))


async def main():
    AUDIO_DIR.mkdir(exist_ok=True)
    for stale in AUDIO_DIR.glob("*.mp3"):
        stale.unlink()

    jobs = {}
    for player_count, mordred, oberon in variants():
        for step, text in enumerate(gen(player_count, mordred, oberon)):
            path = AUDIO_DIR / audio_name(player_count, mordred, oberon, step)
            jobs.setdefault(path.name, (text, path))

    for index, (text, path) in enumerate(jobs.values(), 1):
        print(f"[{index}/{len(jobs)}] {path.name} {text}")
        await synthesize(text, path)

    print(f"Generated {len(jobs)} unique audio file(s) in {AUDIO_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
