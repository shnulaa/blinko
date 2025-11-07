# =================================================================
# Build Stage - 在 Debian (slim) 环境中构建应用
# =================================================================
FROM oven/bun:1-slim AS builder

# 添加构建参数
ARG USE_MIRROR=false

WORKDIR /app

# 设置 Sharp 和 Prisma 的环境变量，使用国内镜像加速安装
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV npm_config_sharp_binary_host="https://npmmirror.com/mirrors/sharp"
ENV npm_config_sharp_libvips_binary_host="https://npmmirror.com/mirrors/sharp-libvips"
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY . .

# 根据参数配置镜像
RUN if [ "$USE_MIRROR" = "true" ]; then \
        echo "Using Taobao Mirror to Install Dependencies" && \
        echo '{ "install": { "registry": "https://registry.npmmirror.com" } }' > .bunfig.json; \
    else \
        echo "Using Default Mirror to Install Dependencies"; \
    fi

# 安装所有依赖。在 Debian (slim) 环境下，原生模块可以直接下载预编译版本，稳定且快速
RUN bun install --unsafe-perm

# 生成 Prisma Client 并构建应用
RUN bunx prisma generate
RUN bun run build:web
RUN bun run build:seed

# 创建启动脚本
RUN printf '#!/bin/sh\necho "Current Environment: $NODE_ENV"\nnpx prisma migrate deploy\nnode server/seed.js\nnode server/index.js\n' > start.sh && \
    chmod +x start.sh

# =================================================================
# Init Downloader Stage - 专门用于下载 dumb-init，保持最终镜像干净
# =================================================================
FROM node:20-alpine AS init-downloader # <<< 修复：将 as 改为 AS

WORKDIR /app
RUN wget -qO /app/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_$(uname -m) && \
    chmod +x /app/dumb-init

# =================================================================
# Final Runner Stage - 同样使用 Debian (slim) 镜像，保证环境兼容
# =================================================================
FROM node:20-slim AS runner # <<< 修复：这是一个语法干净的行

WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV DISABLE_SECURE_COOKIE=false
ENV TRUST_PROXY=1

# 安装运行时的系统依赖
# 只安装 sharp 运行时需要的 libvips，而不是完整的 -dev 开发包
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# 从 builder 复制构建好的 node_modules 和应用代码
# 这是多阶段构建的核心优势，避免在最终镜像中重新安装或编译
COPY --from=builder /app/dist ./server
COPY --from=builder /app/server/lute.min.js ./server/lute.min.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/start.sh ./
COPY --from=init-downloader /app/dumb-init /usr/local/bin/dumb-init

# 暴露端口
EXPOSE 1111

# 使用 dumb-init 启动应用，这是最佳实践
CMD ["/usr/local/bin/dumb-init", "--", "/bin/sh", "-c", "./start.sh"]
