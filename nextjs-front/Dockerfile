FROM node:22-slim

# 任意のUIDで実行してもnpmがキャッシュを書けるようにHOMEを固定する
ENV HOME=/tmp

WORKDIR /app

EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run dev -- -H 0.0.0.0"]
