root@bag-api-rescue2:/var/www/getthebag.io# sudo nginx -t && sudo systemctl reload nginx
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
root@bag-api-rescue2:/var/www/getthebag.io# ORIGIN=64.225.120.72
curl -I --resolve getthebag.io:443:$ORIGIN https://getthebag.io/assets/sounds/casinomusic.mp3 --insecure
# Expect: 200 OK
HTTP/2 200
server: nginx/1.26.3 (Ubuntu)
date: Wed, 29 Oct 2025 04:49:08 GMT
content-type: audio/mpeg
content-length: 883349
last-modified: Tue, 28 Oct 2025 23:27:36 GMT
etag: "69015168-d7a95"
x-vhost: getthebag.io default 443
x-content-type-options: nosniff
referrer-policy: no-referrer-when-downgrade
cache-control: no-cache, must-revalidate
accept-ranges: bytes

root@bag-api-rescue2:/var/www/getthebag.io#
