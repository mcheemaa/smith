host := env("SMITH_HOST", "")
remote := "/home/smith/smith"

# Sync this checkout to the box, install dependencies, restart the service.
deploy target=host:
    rsync -az --delete --chown=smith:smith --exclude node_modules --exclude .git --exclude local --exclude .env ./ {{target}}:{{remote}}/
    ssh {{target}} 'cd {{remote}} && sudo -u smith /home/smith/.bun/bin/bun install --frozen-lockfile && sudo systemctl restart smith'

# Copy the local .env to the box.
env target=host:
    scp .env {{target}}:{{remote}}/.env
    ssh {{target}} 'chown smith:smith {{remote}}/.env && chmod 600 {{remote}}/.env'

logs target=host:
    ssh -t {{target}} 'journalctl -fu smith -o cat'

status target=host:
    ssh {{target}} 'systemctl status smith --no-pager'
