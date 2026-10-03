# GhostSNI Vercel Relay

Минимальный relay-проект для теста VLESS XHTTP через Vercel Edge.

Схема:

```text
client -> 76.76.21.21:443 -> your-project.vercel.app -> 185.21.8.62:8080
```

## Что указать в Vercel

В настройках проекта Vercel добавь Environment Variables:

```text
XRAY_BACKEND_URL=http://185.21.8.62:8080
RELAY_PATH=/tun-oren-2026
```

`RELAY_PATH` должен совпадать с path у Xray inbound на Fornex и с path в клиентском VLESS/XHTTP.

## Что должно быть на Fornex

На Fornex нужен отдельный Xray VLESS XHTTP inbound без TLS, доступный для Vercel:

```text
listen: 0.0.0.0
port: 8080
path: /tun-oren-2026
tls: off
```

TLS будет завершаться на Vercel, поэтому на origin TLS не нужен.

## Конфиг клиента для теста

После деплоя Vercel даст домен вида:

```text
your-project.vercel.app
```

В клиенте:

```text
address: 76.76.21.21
port: 443
security: tls
sni: your-project.vercel.app
host: your-project.vercel.app
network: xhttp
path: /tun-oren-2026
```

VLESS-ссылка-шаблон:

```text
vless://UUID@76.76.21.21:443?encryption=none&security=tls&type=xhttp&path=%2Ftun-oren-2026&host=your-project.vercel.app&sni=your-project.vercel.app#GhostSNI-Vercel-Test
```

## Важно

- Это тестовый relay, не массовая production-схема.
- Vercel считает трафик, медиа в Telegram может быстро расходовать лимиты.
- Для whitelist-режима обязательно использовать split tunneling, иначе весь трафик пойдёт через Vercel.
