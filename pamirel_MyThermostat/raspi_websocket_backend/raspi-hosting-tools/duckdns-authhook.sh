#! /bin/bash
# Used to automatically renew certificate for raspiwebsocket.duckdns.org with certbot --manual-auth-hook flag
#source: https://github.com/AlwindB/LetsEncrypt-DuckDNS-update

TOKEN="b000e0b2-bb35-4384-8a88-0398a34bb9d0"
DOMAIN="raspiwebsocket"

echo url="https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&txt=$CERTBOT_VALIDATION&verbose=true" | curl -k -o /rubi/pamirel/hosting_tools/duckdns-authhook.sh -K -
