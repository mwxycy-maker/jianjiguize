#!/usr/bin/env bash
# HyperFrames 云端环境准备：source 这个文件后再运行 npx hyperframes ...
#   source HyperFrames模板/hf_env.sh            # 设好环境变量
#   hf_gsap 目标目录                             # 把 GSAP 下到工程目录（渲染时不走 CDN）
# 1) npm 仓库在这个环境被设成直连、但直连解析不到 → 强制 npm 走代理
export npm_config_https_proxy="$HTTPS_PROXY" npm_config_proxy="$HTTPS_PROXY" npm_config_noproxy=""
export NO_PROXY="localhost,127.0.0.1" no_proxy="localhost,127.0.0.1"
# 2) 渲染用的无头 Chrome：直接用 Playwright 自带的，不用 hyperframes browser ensure 去下载
export PRODUCER_HEADLESS_SHELL_PATH="${PRODUCER_HEADLESS_SHELL_PATH:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
# 3) 不在云端装技能包、不发遥测
export HYPERFRAMES_SKIP_SKILLS=1 DO_NOT_TRACK=1
hf_gsap() {   # 用法：hf_gsap 工程目录 [版本]
  local dir="${1:-.}" ver="${2:-3.14.2}" tmp; tmp=$(mktemp -d)
  (cd "$tmp" && npm pack "gsap@$ver" --silent >/dev/null && tar xzf "gsap-$ver.tgz") && cp "$tmp/package/dist/gsap.min.js" "$dir/gsap.min.js" && echo "gsap $ver → $dir/gsap.min.js"
  rm -rf "$tmp"
}
